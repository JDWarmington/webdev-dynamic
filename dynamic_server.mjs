import * as fs from "node:fs";
import * as path from "node:path";
import * as url from "node:url";
import express from "express";
import sqlite3 from "sqlite3";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const port = 3000;

const DIRS = {
  root: path.join(__dirname, "public"),
  tpl: path.join(__dirname, "templates"),
  db: path.join(__dirname, "db"),
};

// DB
const db = new sqlite3.Database(
  path.join(DIRS.db, "fires.db"),
  sqlite3.OPEN_READONLY,
  (err) => {
    if (err) console.error("Error connecting to database", err.message);
    else console.log("Connected to fires.db");
  }
);

function replaceAllPairs(html, pairs) {
  let out = html;
  for (let i = 0; i < pairs.length; i++) {
    const k = pairs[i][0];
    const v = pairs[i][1];
    out = out.split(`$$$${k}$$$`).join(String(v ?? ""));
  }
  return out;
}

function render(res, name, pairs, status = 200) {
  try {
    const inner = fs.readFileSync(path.join(DIRS.tpl, `${name}.html`), "utf8");
    const filled = replaceAllPairs(inner, pairs || []);
    const layout = fs.readFileSync(path.join(DIRS.tpl, "layout.html"), "utf8");
    const page = replaceAllPairs(layout, [
      ["TITLE", "Portugal Forest Fires"],
      ["BODY", filled],
    ]);
    res.status(status).type("html").send(page);
  } catch (e) {
    res.status(404).type("text").send("Template not found");
  }
}

const ALLOWED_MON = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
];

function canonMon(raw) {
  return String(raw || "")
    .slice(0, 3)
    .toLowerCase();
}

const WIND = [
  { id: 0, label: "Calm (0-2 km/h)", where: "wind < 2" },
  { id: 1, label: "Light (2-4 km/h)", where: "wind >= 2 AND wind < 4" },
  { id: 2, label: "Moderate (4-6 km/h)", where: "wind >= 4 AND wind < 6" },
  { id: 3, label: "Strong (6-8 km/h)", where: "wind >= 6 AND wind < 8" },
  { id: 4, label: "Very Strong (8+ km/h)", where: "wind >= 8" },
];

const TABLE_ORDER_DEFAULT = [
  "id",
  "month",
  "day",
  "temp",
  "rh",
  "wind",
  "rain",
  "area",
];

const TABLE_ORDER_WIND = [
  "id",
  "month",
  "day",
  "wind",
  "temp",
  "rh",
  "rain",
  "area",
];

const app = express();
app.use(express.static(DIRS.root));

app.get("/", function (_req, res) {
  res.redirect("/fires");
});

// All fires
app.get("/fires", function (_req, res) {
  db.all("SELECT * FROM fires ORDER BY id", [], function (err, rows) {
    if (err) return res.status(500).type("text").send("DB error");

    let tableRows = "";
    for (let i = 0; i < (rows || []).length; i++) {
      const r = rows[i];
      tableRows += `<tr><td>${r.id}</td><td>${r.month}</td><td>${r.day}</td><td class="temp-cell">${r.temp}</td><td class="rh-cell">${r.rh}</td><td class="wind-cell">${r.wind}</td><td class="rain-cell">${r.rain}</td><td class="area-cell">${r.area}</td></tr>`;
      if (i < rows.length - 1) tableRows += "\n";
    }

    render(res, "list", [
      ["TITLE", "Portugal Forest Fires"],
      ["ROW_COUNT", (rows || []).length],
      ["PAGE_NAV", ""],
      ["TABLE_ROWS", tableRows],
    ]);
  });
});

// By month
app.get("/fires/month/:mon", function (req, res) {
  const raw = String(req.params.mon || "");
  const mon = canonMon(raw);

  if (!ALLOWED_MON.includes(mon)) {
    return render(
      res,
      "notfound",
      [
        ["TITLE", "404 - Month Not Found"],
        [
          "MSG",
          `Error: no data for month "${raw}". Valid months are: ${ALLOWED_MON.join(
            ", "
          )}`,
        ],
        [
          "SUGGESTION_HTML",
          '<p class="suggestion">Try /fires/month/jan or /fires/month/aug</p>',
        ],
      ],
      404
    );
  }

  db.all(
    "SELECT * FROM fires WHERE LOWER(month) = ? ORDER BY id",
    [mon],
    function (err, rows) {
      if (err) return res.status(500).type("text").send("DB error");
      if (!rows || rows.length === 0) {
        return render(
          res,
          "notfound",
          [
            ["TITLE", "404 - No Data Found"],
            ["MSG", `Error: no fire data found for month "${raw}"`],
            [
              "SUGGESTION_HTML",
              '<p class="suggestion">Try a different month.</p>',
            ],
          ],
          404
        );
      }

      const tempMon = ALLOWED_MON.indexOf(mon);
      const prev =
        ALLOWED_MON[(tempMon + ALLOWED_MON.length - 1) % ALLOWED_MON.length];
      const next = ALLOWED_MON[(tempMon + 1) % ALLOWED_MON.length];

      let tableRows = "";
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        tableRows += `<tr><td>${r.id}</td><td>${r.month}</td><td>${r.day}</td><td class="temp-cell">${r.temp}</td><td class="rh-cell">${r.rh}</td><td class="wind-cell">${r.wind}</td><td class="rain-cell">${r.rain}</td><td class="area-cell">${r.area}</td></tr>`;
        if (i < rows.length - 1) tableRows += "\n";
      }

      render(res, "month", [
        ["TITLE", `Portugal Fires in ${mon.toUpperCase()}`],
        ["ROW_COUNT", rows.length],
        ["MON_UPPER", mon.toUpperCase()],
        ["PREV_MON", prev],
        ["PREV_MON_UPPER", prev.toUpperCase()],
        ["NEXT_MON", next],
        ["NEXT_MON_UPPER", next.toUpperCase()],
        ["TABLE_ROWS", tableRows],
      ]);
    }
  );
});

// Hot & Dry
app.get("/fires/weather/hot-dry", function (_req, res) {
  const dbResponse = "temp >= 25 AND rh <= 35";

  db.all(
    `SELECT * FROM fires WHERE ${dbResponse} ORDER BY id`,
    [],
    function (e1, rows) {
      if (e1) return res.status(500).type("text").send("DB error");

      db.get(
        `SELECT ROUND(AVG(area),2) AS avg_area FROM fires WHERE ${dbResponse}`,
        [],
        function (e2, stat) {
          if (e2) return res.status(500).type("text").send("DB error");

          if (!rows || rows.length === 0) {
            return render(
              res,
              "notfound",
              [
                ["TITLE", "404 - No Hot-Dry Fires"],
                [
                  "MSG",
                  "Error: no fire data found for hot-dry conditions (temp >= 25C & RH <= 35%)",
                ],
                [
                  "SUGGESTION_HTML",
                  '<p class="suggestion">Try viewing all fires or by month.</p>',
                ],
              ],
              404
            );
          }

          let tableRows = "";
          for (let i = 0; i < rows.length; i++) {
            const r = rows[i];
            tableRows += `<tr><td>${r.id}</td><td>${r.month}</td><td>${r.day}</td><td class="temp-cell">${r.temp}</td><td class="rh-cell">${r.rh}</td><td class="wind-cell">${r.wind}</td><td class="rain-cell">${r.rain}</td><td class="area-cell">${r.area}</td></tr>`;
            if (i < rows.length - 1) tableRows += "\n";
          }

          render(res, "hotdry", [
            ["TITLE", "Portugal Hot & Dry Fires"],
            ["ROW_COUNT", rows.length],
            ["TABLE_ROWS", tableRows],
            ["AVG_AREA", Number((stat && stat.avg_area) || 0).toFixed(2)],
          ]);
        }
      );
    }
  );
});

// Wind
app.get("/fires/wind", function (_req, res) {
  const sql =
    "SELECT " +
    "CASE " +
    "WHEN wind < 2 THEN 'Calm (0-2 km/h)' " +
    "WHEN wind < 4 THEN 'Light (2-4 km/h)' " +
    "WHEN wind < 6 THEN 'Moderate (4-6 km/h)' " +
    "WHEN wind < 8 THEN 'Strong (6-8 km/h)' " +
    "ELSE 'Very Strong (8+ km/h)' END AS wind_category, " +
    "COUNT(*) AS count, " +
    "ROUND(AVG(area), 2) AS avg_area, " +
    "ROUND(AVG(temp), 1) AS avg_temp " +
    "FROM fires GROUP BY wind_category ORDER BY MIN(wind)";

  db.all(sql, [], function (err, stats) {
    if (err) return res.status(500).type("text").send("DB error");

    const cards = (stats || [])
      .map(function (s) {
        const lbl = String(s.wind_category || "").toLowerCase();
        let id = 0;
        if (lbl.indexOf("light") === 0) id = 1;
        else if (lbl.indexOf("moderate") === 0) id = 2;
        else if (lbl.indexOf("strong (6-8") === 0) id = 3;
        else if (lbl.indexOf("very strong") === 0) id = 4;
        return `  <div class="wind-category-card">
    <div class="wind-category-header">
      <h3>${s.wind_category}</h3>
      <div class="wind-count">${s.count} fires</div>
    </div>
    <div class="wind-stats">
      <div class="stat-item"><span class="stat-label">Avg Area:</span> <span class="stat-value">${s.avg_area} ha</span></div>
      <div class="stat-item"><span class="stat-label">Avg Temp:</span> <span class="stat-value">${s.avg_temp}C</span></div>
    </div>
    <a href="/fires/wind/${id}" class="view-details-btn">View Details</a>
  </div>`;
      })
      .join("\n");

    render(res, "wind-overview", [
      ["TITLE", "Portugal Forest Fires by Wind Conditions"],
      ["WIND_CARDS", cards],
      ["WIND_STATS_JSON", JSON.stringify(stats || [])],
    ]);
  });
});

// Wind detail
app.get("/fires/wind/:id", function (req, res) {
  const tempID = parseInt(req.params.id);
  let windDetail = null;
  for (let i = 0; i < WIND.length; i++) {
    if (WIND[i].id === tempID) {
      windDetail = WIND[i];
      break;
    }
  }

  if (!windDetail) {
    return render(
      res,
      "notfound",
      [
        ["TITLE", "404 - Wind Category Not Found"],
        ["MSG", `Error: wind category id "${req.params.id}" not found`],
        [
          "SUGGESTION_HTML",
          '<p class="suggestion">Valid: calm, light, moderate, strong, very-strong</p>',
        ],
      ],
      404
    );
  }

  db.get(
    `SELECT COUNT(*) AS total FROM fires WHERE ${windDetail.where}`,
    [],
    function (e1, c) {
      if (e1) return res.status(500).type("text").send("DB error");
      const total = (c && c.total) || 0;
      if (!total) {
        return render(
          res,
          "notfound",
          [
            ["TITLE", "404 - No Fires Found"],
            ["MSG", `No fires found for ${windDetail.label} wind conditions`],
          ],
          404
        );
      }

      db.all(
        `SELECT * FROM fires WHERE ${windDetail.where} ORDER BY wind DESC, id`,
        [],
        function (e2, rows) {
          if (e2) return res.status(500).type("text").send("DB error");

          db.get(
            `SELECT ROUND(AVG(area), 2) AS avg_area,
                  ROUND(AVG(temp), 1) AS avg_temp,
                  ROUND(AVG(rh),   1) AS avg_rh
           FROM fires WHERE ${windDetail.where}`,
            [],
            function (e3, stats) {
              if (e3) return res.status(500).type("text").send("DB error");

              let tableRows = "";
              for (let i = 0; i < (rows || []).length; i++) {
                const r = rows[i];
                tableRows += `<tr><td>${r.id}</td><td>${r.month}</td><td>${r.day}</td><td class="wind-cell">${r.wind}</td><td class="temp-cell">${r.temp}</td><td class="rh-cell">${r.rh}</td><td class="rain-cell">${r.rain}</td><td class="area-cell">${r.area}</td></tr>`;
                if (i < rows.length - 1) tableRows += "\n";
              }

              let windNav = "";
              for (let i = 0; i < WIND.length; i++) {
                const w = WIND[i];
                windNav += `<a href="/fires/wind/${w.id}" class="nav-button ${
                  w.id === windDetail.id ? "active" : ""
                }">${w.label.split(" ")[0]}</a>\n`;
              }
              windNav += `<a href="/fires/wind" class="nav-button home">All Wind Categories</a>`;

              render(res, "wind-detail", [
                ["TITLE", `Portugal Fires - ${windDetail.label}`],
                ["CATEGORY_NAME", windDetail.label],
                ["ROW_COUNT", (rows || []).length],
                ["AVG_AREA", Number((stats && stats.avg_area) || 0).toFixed(2)],
                ["AVG_TEMP", Number((stats && stats.avg_temp) || 0).toFixed(1)],
                ["AVG_RH", Number((stats && stats.avg_rh) || 0).toFixed(1)],
                ["PAGE_NAV", ""],
                ["TABLE_ROWS", tableRows],
                ["WIND_NAV", windNav],
              ]);
            }
          );
        }
      );
    }
  );
});

// 404
app.use(function (_req, res) {
  res.redirect("/");
});

// Start
app.listen(port, function () {
  console.log("Now listening on port " + port);
});
