import * as fs from "node:fs";
import * as path from "node:path";
import * as url from "node:url";
import { Canvas } from "skia-canvas";

import { default as express } from "express"; //npm install express;
import { default as sqlite3 } from "sqlite3"; //npm install sqlite3;

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const port = 8081;
const root = path.join(__dirname, "public");
const template = path.join(__dirname, "templates");
let cities = [];

let app = express();
app.use(express.static(root));

const db = new sqlite3.Database(
  "./data.sqlite3",
  sqlite3.OPEN_READONLY,
  (err) => {
    if (err) {
      console.log("Error connecting to database");
    } else {
      console.log("Sucessfully connected to database");

      //Get list of city names
      db.all("SELECT DISTINCT city FROM Weather", [], (err, rows) => {
        if (err) {
          console.error("DB error");
        } else {
          cities = rows.map((r) => r.city).sort();
          console.log("Loaded cities:", cities);
        }
      });
    }
  }
);

app.get("/", (req, res) => {
  console.log("### homepage");
  let index = null;

  let sendResponse = function () {
    console.log("### sendResponse");
    let temperatureLinks = "";
    let precipitationLinks = "";
    let windLinks = "";
    for (let i = 0; i < cities.length; i++) {
      temperatureLinks += `<li><a href="/temperature/${cities[i]}">${cities[i]}</a></li>`;
      precipitationLinks += `<li><a href="/precipitation/${cities[i]}">${cities[i]}</a></li>`;
      windLinks += `<li><a href="/wind/${cities[i]}">${cities[i]}</a></li>`;
    }
    index = index.replace("$$$ CITIES-TEMPERATURE $$$", temperatureLinks);
    index = index.replace("$$$ CITIES-PRECIPITATION $$$", precipitationLinks);
    index = index.replace("$$$ CITIES-WIND $$$", windLinks);
    res.status(200).type("html").send(index);
  };

  fs.readFile(path.join(template, "index.html"), (err, data) => {
    console.log("### read index html");
    if (err) {
      res.status(404).type("text/plain").send("Error: file not found");
    } else {
      index = data.toString();
      sendResponse();
    }
  });
});

// Erin
app.get("/temperature/:city", (req, res) => {
  console.log("### city " + req.params.city);
  let sql =
    "SELECT year, avg_temp, temp_max, temp_min FROM Weather WHERE city = ?";
  let city = req.params.city;
  let cToF = function (celsius) {
    if (isNaN(celsius)) return celsius;
    else return Math.round((celsius * 1.8 + 32) * 100) / 100;
  };

  db.all(sql, [city], (err, rows) => {
    if (err) {
      res
        .status(404)
        .type("txt")
        .send("Error: " + city + " temperature data not found");
    } else if (!checkValidCity(rows)) {
      sendOopsPage(res, city);
    } else {
      fs.readFile(
        path.join(template, "temperature.html"),
        { encoding: "utf8" },
        (err, data) => {
          if (err) {
            res
              .status(404)
              .type("text/plain")
              .send("Error:" + city + " Temperature not found");
          } else {
            console.log("### read temperature html");

            let temperatureTable = "";
            for (let i = 0; i < rows.length; i++) {
              temperatureTable += "<tr><td>" + rows[i].year + "</td>";
              temperatureTable += "<td>" + cToF(rows[i].avg_temp) + "</td>";
              temperatureTable += "<td>" + cToF(rows[i].temp_min) + "</td>";
              temperatureTable +=
                "<td>" + cToF(rows[i].temp_max) + "</td></tr>";
            }

            // To create graph
            const years = JSON.stringify(rows.map((r) => r.year));
            const ave = JSON.stringify(rows.map((r) => cToF(r.avg_temp)));

            let response = data.replace("$$$CITY$$$", city);
            response = response.replace(
              "$$$TEMPERATURE_TABLE$$$",
              temperatureTable
            );
            response = response.replace("$$$YEARS$$$", years);
            response = response.replace("$$$AVE$$$", ave);

            // Previous and Next city links
            let index = cities.indexOf(city);
            let prevIndex = (index - 1 + cities.length) % cities.length; // wrap around
            let nextIndex = (index + 1) % cities.length;
            response = response.replace("$$$PREV_CITY$$$", cities[prevIndex]);
            response = response.replace("$$$NEXT_CITY$$$", cities[nextIndex]);

            res.status(200).type("html").send(response);
          }
        }
      );
    }
  });
});

// Harrison
app.get("/precipitation/:city", (req, res) => {
  console.log("### city " + req.params.city);
  let sql =
    "SELECT year, precipitation, days_with_rain, days_with_snow FROM Weather WHERE city = ?";
  const city = req.params.city;

  db.all(sql, [city], (err, rows) => {
    if (err) {
      res
        .status(404)
        .type("txt")
        .send("Error: " + city + " wind data not found");
    } else if (!checkValidCity(rows)) {
      sendOopsPage(res, city);
    } else {
      fs.readFile(
        path.join(template, "precipitation.html"),
        { encoding: "utf8" },
        (err, data) => {
          if (err) {
            res
              .status(404)
              .type("text/plain")
              .send("Error:" + city + " Precipitation not found");
          } else {
            console.log("### read precipitation html");

            let precipitationTable = "";
            for (let i = 0; i < rows.length; i++) {
              precipitationTable += "<tr><td>" + rows[i].year + "</td>";
              precipitationTable +=
                "<td>" + rows[i].precipitation + "</td></tr>";
            }

            //To create graph
            const years = JSON.stringify(rows.map((r) => r.year));
            const precipitation = JSON.stringify(
              rows.map((r) => r.precipitation)
            );
            const rain = JSON.stringify(rows.map((r) => r.days_with_rain));
            const snow = JSON.stringify(rows.map((r) => r.days_with_snow));

            let response = data.replace("$$$CITY$$$", city);
            response = response.replace(
              "$$$PRECIPITATION_TABLE$$$",
              precipitationTable
            );
            response = response.replaceAll("$$$YEARS$$$", years);
            response = response.replace("$$$PRECIPITATION$$$", precipitation);
            response = response.replace("$$$RAINDAYS$$$", rain);
            response = response.replace("$$$SNOWDAYS$$$", snow);

            // Previous and Next city links
            let index = cities.indexOf(city);
            let prevIndex = (index - 1 + cities.length) % cities.length; // wrap around
            let nextIndex = (index + 1) % cities.length;
            response = response.replace("$$$PREV_CITY$$$", cities[prevIndex]);
            response = response.replace("$$$NEXT_CITY$$$", cities[nextIndex]);

            res.status(200).type("html").send(response);
          }
        }
      );
    }
  });
});

// Kristina
app.get("/wind/:city", (req, res) => {
  console.log("### city " + req.params.city);
  let sql = "SELECT year, avg_wind_speed FROM Weather WHERE city = ?";
  let city = req.params.city;

  db.all(sql, [city], (err, rows) => {
    if (err) {
      res
        .status(404)
        .type("txt")
        .send("Error: " + city + " wind data not found");
    } else if (!checkValidCity(rows)) {
      sendOopsPage(res, city);
    } else {
      fs.readFile(
        path.join(template, "wind.html"),
        { encoding: "utf8" },
        (err, data) => {
          if (err) {
            res
              .status(404)
              .type("text/plain")
              .send("Error:" + city + " Wind not found");
          } else {
            console.log("### read wind html");

            let windTable = "";
            for (let i = 0; i < rows.length; i++) {
              windTable += "<tr><td>" + rows[i].year + "</td>";
              windTable += "<td>" + rows[i].avg_wind_speed + "</td></tr>";
            }

            //To create graph
            const years = JSON.stringify(rows.map((r) => r.year));
            const speeds = JSON.stringify(rows.map((r) => r.avg_wind_speed));

            let response = data.replace("$$$CITY$$$", city);
            response = response.replace("$$$WIND_TABLE$$$", windTable);
            response = response.replace("$$$YEARS$$$", years);
            response = response.replace("$$$SPEEDS$$$", speeds);

            // Previous and Next city links
            let index = cities.indexOf(city);
            let prevIndex = (index - 1 + cities.length) % cities.length; // wrap around
            let nextIndex = (index + 1) % cities.length;
            response = response.replace("$$$PREV_CITY$$$", cities[prevIndex]);
            response = response.replace("$$$NEXT_CITY$$$", cities[nextIndex]);

            res.status(200).type("html").send(response);
          }
        }
      );
    }
  });
});

function checkValidCity(rows) {
  return rows.length !== 0;
}

function sendOopsPage(res, city) {
  fs.readFile(
    path.join(template, "oops.html"),
    { encoding: "utf-8" },
    (err, data) => {
      if (err) {
        res
          .status(500)
          .type("text/plain")
          .send("Error: could not get oops page.");
      } else {
        console.log("Redirecting to oops page!");
        const response = data.replaceAll("$$$CITY$$$", city);
        res.status(200).type("html").send(response);
      }
    }
  );
}

app.use((req, res) => {
  // redirect user to home page if it's an invalid url
  res.redirect("/");
});

app.listen(port, () => {
  console.log("Now listening on port " + port);
});

// // Portugal Forest Fires Dashboard Server
// //
// // Goal: Keep this server very simple for learning.
// // - No template engines. HTML files contain $$$PLACEHOLDER$$$ tokens.
// // - We read the file and do string replacements with a tiny helper.
// // - Each route builds table rows and pagination inline (plain strings).
// import path from "path";
// import express from "express";
// import sqlite3pkg from "sqlite3";
// import fs from "fs";
// import { fileURLToPath } from "url";

// const sqlite3 = sqlite3pkg.verbose();
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// const app = express();
// const db = new sqlite3.Database(path.join(__dirname, "db", "fires.db"));

// // Static assets (serves /public)
// app.use(express.static(path.join(__dirname, "public")));

// // Simple $$$PLACEHOLDER$$$ templating utilities
// const TEMPLATES_DIR = path.join(__dirname, "templates");
// function readTemplate(name) {
//   return fs.readFileSync(path.join(TEMPLATES_DIR, name + ".html"), "utf8");
// }
// function replacePlaceholders(template, map) {
//   let out = template;
//   for (const [key, value] of Object.entries(map)) {
//     const token = new RegExp("\\$\\$\\$" + key + "\\$\\$\\$", "g");
//     out = out.replace(token, String(value ?? ""));
//   }
//   return out;
// }
// function renderPage(bodyHtml, title) {
//   const layout = readTemplate("layout");
//   return replacePlaceholders(layout, {
//     TITLE: "Portugal Forest Fires",
//     BODY: bodyHtml,
//   });
// }
// function renderTemplate(name, map) {
//   const inner = readTemplate(name);
//   const filled = replacePlaceholders(inner, map || {});
//   return renderPage(filled, "Portugal Forest Fires");
// }
// // (helpers inlined in routes for clarity)

// // Root redirect
// app.get("/", (_req, res) => res.redirect("/fires"));

// // All Fires (paginated list)
// app.get("/fires", (req, res, next) => {
//   const page = parseInt(req.query.page) || 1;
//   const limit = 50;
//   const offset = (page - 1) * limit;

//   // Get total count for pagination
//   db.get("SELECT COUNT(*) as total FROM fires", (err, countResult) => {
//     if (err) return next(err);
//     const total = countResult.total;
//     const totalPages = Math.ceil(total / limit);

//     // Get paginated data
//     db.all(
//       "SELECT * FROM fires ORDER BY id LIMIT ? OFFSET ?",
//       [limit, offset],
//       (err, rows) => {
//         if (err) return next(err);
//         // Build HTML table rows
//         const tableRows = rows
//           .map((r) => {
//             return `<tr><td>${r.id}</td><td>${r.month}</td><td>${r.day}</td><td class="temp-cell">${r.temp}</td><td class="rh-cell">${r.rh}</td><td class="wind-cell">${r.wind}</td><td class="rain-cell">${r.rain}</td><td class="area-cell">${r.area}</td></tr>`;
//           })
//           .join("\n");
//         const hasPrev = page > 1;
//         const hasNext = page < totalPages;
//         const prevHtml = hasPrev
//           ? `<a href="/fires?page=${
//               page - 1
//             }" class="pagination-btn prev">Previous Page</a>`
//           : `<span class="pagination-btn disabled">Previous Page</span>`;
//         const nextHtml = hasNext
//           ? `<a href="/fires?page=${
//               page + 1
//             }" class="pagination-btn next">Next Page</a>`
//           : `<span class="pagination-btn disabled">Next Page</span>`;
//         const pagination = `${prevHtml}\n  <span class="pagination-info">Page ${page} of ${totalPages}</span>\n  ${nextHtml}`;
//         const html = renderTemplate("list", {
//           TITLE: `Portugal Forest Fires (Page ${page} of ${totalPages})`,
//           ROW_COUNT: rows.length,
//           CURRENT_PAGE: page,
//           TOTAL_PAGES: totalPages,
//           PAGINATION: pagination,
//           TABLE_ROWS: tableRows,
//         });
//         res.type("html").send(html);
//       }
//     );
//   });
// });

// // By Month page
// app.get("/fires/month/:mon", (req, res, next) => {
//   const raw = String(req.params.mon || "");
//   const mon = raw.slice(0, 3).toLowerCase(); // accept aug, august, AUG, etc.

//   const ALLOWED = [
//     "jan",
//     "feb",
//     "mar",
//     "apr",
//     "may",
//     "jun",
//     "jul",
//     "aug",
//     "sep",
//     "oct",
//     "nov",
//     "dec",
//   ];
//   if (!ALLOWED.includes(mon)) {
//     const notFound = renderTemplate("notfound", {
//       TITLE: "404 - Month Not Found",
//       MSG: `Error: no data for month "${raw}". Valid months are: ${ALLOWED.join(
//         ", "
//       )}`,
//       SUGGESTION_HTML:
//         '<p class="suggestion">Try visiting a valid month like /fires/month/jan or /fires/month/aug</p>',
//     });
//     return res.status(404).type("html").send(notFound);
//   }

//   db.all(
//     "SELECT * FROM fires WHERE LOWER(month) = ? ORDER BY id",
//     [mon],
//     (err, rows) => {
//       if (err) return next(err);
//       if (rows.length === 0) {
//         const nf = renderTemplate("notfound", {
//           TITLE: "404 - No Data Found",
//           MSG: `Error: no fire data found for month "${raw}"`,
//           SUGGESTION_HTML:
//             '<p class="suggestion">This month may not have any recorded fires. Try another month.</p>',
//         });
//         return res.status(404).type("html").send(nf);
//       }
//       // Compute previous and next month labels
//       const idx = ALLOWED.indexOf(mon);
//       const prev = ALLOWED[(idx + ALLOWED.length - 1) % ALLOWED.length];
//       const next = ALLOWED[(idx + 1) % ALLOWED.length];

//       const tableRows = rows
//         .map(
//           (r) =>
//             `<tr><td>${r.id}</td><td>${r.month}</td><td>${r.day}</td><td class="temp-cell">${r.temp}</td><td class="rh-cell">${r.rh}</td><td class="wind-cell">${r.wind}</td><td class="rain-cell">${r.rain}</td><td class="area-cell">${r.area}</td></tr>`
//         )
//         .join("\n");
//       const html = renderTemplate("month", {
//         TITLE: `Portugal Fires in ${mon.toUpperCase()}`,
//         ROW_COUNT: rows.length,
//         MON_UPPER: mon.toUpperCase(),
//         PREV_MON: prev,
//         PREV_MON_UPPER: prev.toUpperCase(),
//         NEXT_MON: next,
//         NEXT_MON_UPPER: next.toUpperCase(),
//         TABLE_ROWS: tableRows,
//       });
//       res.type("html").send(html);
//     }
//   );
// });

// // Hot-Dry filter page
// app.get("/fires/weather/hot-dry", (_req, res, next) => {
//   const sql = `SELECT * FROM fires WHERE temp >= 25 AND rh <= 35 ORDER BY id`;
//   const statSql = `SELECT COUNT(*) as n, ROUND(AVG(area),2) as avg_area
//                    FROM fires WHERE temp >= 25 AND rh <= 35`;
//   db.all(sql, (e1, rows) => {
//     if (e1) return next(e1);
//     db.get(statSql, (e2, stat) => {
//       if (e2) return next(e2);
//       if (rows.length === 0) {
//         const nf = renderTemplate("notfound", {
//           TITLE: "404 - No Hot-Dry Fires",
//           MSG: "Error: no fire data found for hot-dry conditions (temp >= 25C & RH <= 35%)",
//           SUGGESTION_HTML:
//             '<p class="suggestion">Try viewing all fires or fires by month instead.</p>',
//         });
//         return res.status(404).type("html").send(nf);
//       }
//       const tableRows = rows
//         .map(
//           (r) =>
//             `<tr><td>${r.id}</td><td>${r.month}</td><td>${r.day}</td><td class="temp-cell">${r.temp}</td><td class="rh-cell">${r.rh}</td><td class="wind-cell">${r.wind}</td><td class="rain-cell">${r.rain}</td><td class="area-cell">${r.area}</td></tr>`
//         )
//         .join("\n");
//       const html = renderTemplate("hotdry", {
//         TITLE: "Portugal Hot & Dry Fires",
//         ROW_COUNT: rows.length,
//         AVG_AREA: (stat?.avg_area ?? 0).toFixed(2),
//         TABLE_ROWS: tableRows,
//       });
//       res.type("html").send(html);
//     });
//   });
// });

// // Wind overview and detail pages
// app.get("/fires/wind", (_req, res, next) => {
//   // Get wind distribution for overview
//   const windStatsSql = `
//     SELECT
//       CASE
//         WHEN wind < 2 THEN 'Calm (0-2 km/h)'
//         WHEN wind < 4 THEN 'Light (2-4 km/h)'
//         WHEN wind < 6 THEN 'Moderate (4-6 km/h)'
//         WHEN wind < 8 THEN 'Strong (6-8 km/h)'
//         ELSE 'Very Strong (8+ km/h)'
//       END as wind_category,
//       COUNT(*) as count,
//       ROUND(AVG(area), 2) as avg_area,
//       ROUND(AVG(temp), 1) as avg_temp
//     FROM fires
//     GROUP BY wind_category
//     ORDER BY MIN(wind)
//   `;

//   db.all(windStatsSql, (err, windStats) => {
//     if (err) return next(err);
//     // Attach stable slugs for linking to detail pages
//     const withSlugs = (windStats || []).map((s) => {
//       const label = String(s.wind_category || "").toLowerCase();
//       let slug = "";
//       if (label.startsWith("calm")) slug = "calm";
//       else if (label.startsWith("light")) slug = "light";
//       else if (label.startsWith("moderate")) slug = "moderate";
//       else if (label.startsWith("strong (6-8")) slug = "strong";
//       else if (label.startsWith("very strong")) slug = "very-strong";
//       else slug = ""; // fallback; will 404 if unknown
//       return { ...s, slug };
//     });

//     const cards = withSlugs
//       .map(
//         (stat) => `
//   <div class="wind-category-card">
//     <div class="wind-category-header">
//       <h3>${stat.wind_category}</h3>
//       <div class="wind-count">${stat.count} fires</div>
//     </div>
//     <div class="wind-stats">
//       <div class="stat-item"><span class="stat-label">Avg Area:</span>
//         <span class="stat-value">${stat.avg_area} ha</span></div>
//       <div class="stat-item"><span class="stat-label">Avg Temp:</span>
//         <span class="stat-value">${stat.avg_temp}C</span></div>
//     </div>
//     <a href="/fires/wind/${stat.slug}" class="view-details-btn">View Details</a>
//   </div>`
//       )
//       .join("\n");
//     const html = renderTemplate("wind-overview", {
//       TITLE: "Portugal Forest Fires by Wind Conditions",
//       WIND_CARDS: cards,
//       WIND_STATS_JSON: JSON.stringify(withSlugs),
//     });
//     res.type("html").send(html);
//   });
// });

// app.get("/fires/wind/:category", (req, res, next) => {
//   const category = req.params.category;
//   const page = parseInt(req.query.page) || 1;
//   const limit = 50;
//   const offset = (page - 1) * limit;

//   // Map category to wind range
//   let windCondition;
//   let categoryName;

//   switch (category) {
//     case "calm":
//       windCondition = "wind < 2";
//       categoryName = "Calm (0-2 km/h)";
//       break;
//     case "light":
//       windCondition = "wind >= 2 AND wind < 4";
//       categoryName = "Light (2-4 km/h)";
//       break;
//     case "moderate":
//       windCondition = "wind >= 4 AND wind < 6";
//       categoryName = "Moderate (4-6 km/h)";
//       break;
//     case "strong":
//       windCondition = "wind >= 6 AND wind < 8";
//       categoryName = "Strong (6-8 km/h)";
//       break;
//     case "very-strong":
//       windCondition = "wind >= 8";
//       categoryName = "Very Strong (8+ km/h)";
//       break;
//     default:
//       const nf = renderTemplate("notfound", {
//         TITLE: "404 - Wind Category Not Found",
//         MSG: `Error: wind category "${category}" not found`,
//         SUGGESTION_HTML:
//           '<p class="suggestion">Valid categories are: calm, light, moderate, strong, very-strong</p>',
//       });
//       return res.status(404).type("html").send(nf);
//   }

//   // Get total count for pagination
//   const countSql = `SELECT COUNT(*) as total FROM fires WHERE ${windCondition}`;
//   db.get(countSql, (err, countResult) => {
//     if (err) return next(err);
//     const total = countResult.total;
//     const totalPages = Math.ceil(total / limit);

//     if (total === 0) {
//       const nf = renderTemplate("notfound", {
//         TITLE: "404 - No Fires Found",
//         MSG: `No fires found for ${categoryName} wind conditions`,
//         SUGGESTION_HTML:
//           '<p class="suggestion">Try a different wind category or view all fires.</p>',
//       });
//       return res.status(404).type("html").send(nf);
//     }

//     // Get paginated data
//     const dataSql = `SELECT * FROM fires WHERE ${windCondition} ORDER BY wind DESC, id LIMIT ? OFFSET ?`;
//     db.all(dataSql, [limit, offset], (err, rows) => {
//       if (err) return next(err);

//       // Get statistics for this wind category
//       const statSql = `SELECT ROUND(AVG(area), 2) as avg_area, ROUND(AVG(temp), 1) as avg_temp, ROUND(AVG(rh), 1) as avg_rh FROM fires WHERE ${windCondition}`;
//       db.get(statSql, (err, stats) => {
//         if (err) return next(err);

//         const tableRows = rows
//           .map(
//             (r) =>
//               `<tr><td>${r.id}</td><td>${r.month}</td><td>${r.day}</td><td class="wind-cell">${r.wind}</td><td class="temp-cell">${r.temp}</td><td class="rh-cell">${r.rh}</td><td class="rain-cell">${r.rain}</td><td class="area-cell">${r.area}</td></tr>`
//           )
//           .join("\n");
//         const hasPrev = page > 1;
//         const hasNext = page < totalPages;
//         const prevHtml = hasPrev
//           ? `<a href="/fires/wind/${category}?page=${
//               page - 1
//             }" class="pagination-btn prev">Previous Page</a>`
//           : `<span class="pagination-btn disabled">Previous Page</span>`;
//         const nextHtml = hasNext
//           ? `<a href="/fires/wind/${category}?page=${
//               page + 1
//             }" class="pagination-btn next">Next Page</a>`
//           : `<span class="pagination-btn disabled">Next Page</span>`;
//         const pagination = `${prevHtml}\n  <span class="pagination-info">Page ${page} of ${totalPages}</span>\n  ${nextHtml}`;
//         const windNav = `
//   <a href="/fires/wind/calm" class="nav-button ${
//     category === "calm" ? "active" : ""
//   }">Calm</a>
//   <a href="/fires/wind/light" class="nav-button ${
//     category === "light" ? "active" : ""
//   }">Light</a>
//   <a href="/fires/wind/moderate" class="nav-button ${
//     category === "moderate" ? "active" : ""
//   }">Moderate</a>
//   <a href="/fires/wind/strong" class="nav-button ${
//     category === "strong" ? "active" : ""
//   }">Strong</a>
//   <a href="/fires/wind/very-strong" class="nav-button ${
//     category === "very-strong" ? "active" : ""
//   }">Very Strong</a>
//   <a href="/fires/wind" class="nav-button home">All Wind Categories</a>`;

//         const html = renderTemplate("wind-detail", {
//           TITLE: `Portugal Fires - ${categoryName}`,
//           CATEGORY_NAME: categoryName,
//           ROW_COUNT: rows.length,
//           AVG_AREA: (stats?.avg_area ?? 0).toFixed(2),
//           AVG_TEMP: (stats?.avg_temp ?? 0).toFixed(1),
//           AVG_RH: (stats?.avg_rh ?? 0).toFixed(1),
//           CURRENT_PAGE: page,
//           TOTAL_PAGES: totalPages,
//           PAGINATION: pagination,
//           TABLE_ROWS: tableRows,
//           WIND_NAV: windNav,
//         });
//         res.type("html").send(html);
//       });
//     });
//   });
// });

// // Error Handling
// app.use((req, res) => {
//   const html = renderTemplate("notfound", {
//     TITLE: "404 - Page Not Found",
//     MSG: `Error: route "${req.path}" not found`,
//     SUGGESTION_HTML:
//       '<p class="suggestion">Check the URL or try navigating to one of the main pages.</p>',
//   });
//   res.status(404).type("html").send(html);
// });
// app.use((err, _req, res, _next) => {
//   console.error("ERROR:", err.stack || err);
//   res.status(500).type("text").send("Server error");
// });

// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => console.log(`http://localhost:${PORT}`));
