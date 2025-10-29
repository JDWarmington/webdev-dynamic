// Portugal Forest Fires Dashboard Server
import path from "path";
import express from "express";
import sqlite3pkg from "sqlite3";
import ejs from "ejs";
import expressEjsLayouts from "express-ejs-layouts";
import { fileURLToPath } from "url";

const sqlite3 = sqlite3pkg.verbose();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const db = new sqlite3.Database(path.join(__dirname, "db", "fires.db"));

// Configure EJS for HTML templates
app.engine("html", ejs.renderFile);
app.set("view engine", "html");
app.set("views", path.join(__dirname, "templates"));
app.use(expressEjsLayouts);
app.set("layout", "layout.html");

app.use(express.static(path.join(__dirname, "public")));

// Root redirect
app.get("/", (_req, res) => res.redirect("/fires"));

// All Fires Route
app.get("/fires", (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 50;
  const offset = (page - 1) * limit;

  // Get total count for pagination
  db.get("SELECT COUNT(*) as total FROM fires", (err, countResult) => {
    if (err) return next(err);
    const total = countResult.total;
    const totalPages = Math.ceil(total / limit);

    // Get paginated data
    db.all(
      "SELECT * FROM fires ORDER BY id LIMIT ? OFFSET ?",
      [limit, offset],
      (err, rows) => {
        if (err) return next(err);
        res.render("list", {
          title: `Portugal Forest Fires (Page ${page} of ${totalPages})`,
          rows,
          currentPage: page,
          totalPages: totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
          nextPage: page + 1,
          prevPage: page - 1,
        });
      }
    );
  });
});

// Month Filter Route
app.get("/fires/month/:mon", (req, res, next) => {
  const raw = String(req.params.mon || "");
  const mon = raw.slice(0, 3).toLowerCase(); // accept aug, august, AUG, etc.

  const ALLOWED = [
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
  if (!ALLOWED.includes(mon)) {
    return res.status(404).render("notfound", {
      title: "404 - Month Not Found",
      msg: `Error: no data for month "${raw}". Valid months are: ${ALLOWED.join(
        ", "
      )}`,
      suggestion:
        "Try visiting a valid month like /fires/month/jan or /fires/month/aug",
    });
  }

  db.all(
    "SELECT * FROM fires WHERE LOWER(month) = ? ORDER BY id",
    [mon],
    (err, rows) => {
      if (err) return next(err);
      if (rows.length === 0) {
        return res.status(404).render("notfound", {
          title: "404 - No Data Found",
          msg: `Error: no fire data found for month "${raw}"`,
          suggestion:
            "This month may not have any recorded fires. Try another month.",
        });
      }
      // simple prev/next links (extra credit ready)
      const idx = ALLOWED.indexOf(mon);
      const prev = ALLOWED[(idx + ALLOWED.length - 1) % ALLOWED.length];
      const next = ALLOWED[(idx + 1) % ALLOWED.length];

      res.render("month", {
        title: `Portugal Fires in ${mon.toUpperCase()}`,
        rows,
        mon,
        prev,
        next,
      });
    }
  );
});

// Hot-Dry Fires Route
app.get("/fires/weather/hot-dry", (_req, res, next) => {
  const sql = `SELECT * FROM fires WHERE temp >= 25 AND rh <= 35 ORDER BY id`;
  const statSql = `SELECT COUNT(*) as n, ROUND(AVG(area),2) as avg_area
                   FROM fires WHERE temp >= 25 AND rh <= 35`;
  db.all(sql, (e1, rows) => {
    if (e1) return next(e1);
    db.get(statSql, (e2, stat) => {
      if (e2) return next(e2);
      if (rows.length === 0) {
        return res.status(404).render("notfound", {
          title: "404 - No Hot-Dry Fires",
          msg: "Error: no fire data found for hot-dry conditions (temp ≥ 25°C & RH ≤ 35%)",
          suggestion: "Try viewing all fires or fires by month instead.",
        });
      }
      res.render("hotdry", {
        title: "Portugal Hot & Dry Fires",
        rows,
        stat: stat || { n: 0, avg_area: 0 },
      });
    });
  });
});

// Error Handling
app.use((req, res) =>
  res.status(404).render("notfound", {
    title: "404 - Page Not Found",
    msg: `Error: route "${req.path}" not found`,
    suggestion: "Check the URL or try navigating to one of the main pages.",
  })
);
app.use((err, _req, res, _next) => {
  console.error("ERROR:", err.stack || err);
  res.status(500).type("text").send("Server error");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`http://localhost:${PORT}`));
