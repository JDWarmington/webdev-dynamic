// scripts/init-db.js (verbose + creates db/)
const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const { parse } = require("csv-parse");

const dbDir = path.join(__dirname, "..", "db");
const dbPath = path.join(dbDir, "fires.db");
const csvPath = path.join(__dirname, "..", "data", "forestfires.csv");

console.log("[init-db] csvPath =", csvPath);
console.log("[init-db] dbPath  =", dbPath);

if (!fs.existsSync(csvPath)) {
  console.error("[init-db] ERROR: CSV not found at", csvPath);
  process.exit(1);
}

fs.mkdirSync(dbDir, { recursive: true });
if (fs.existsSync(dbPath)) {
  console.log("[init-db] Removing existing db");
  fs.unlinkSync(dbPath);
}

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  console.log("[init-db] Creating table...");
  db.run(`CREATE TABLE fires (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    x INTEGER, y INTEGER,
    month TEXT, day TEXT,
    ffmc REAL, dmc REAL, dc REAL, isi REAL,
    temp REAL, rh REAL, wind REAL, rain REAL,
    area REAL
  );`);

  const stmt = db.prepare(
    `INSERT INTO fires
     (x,y,month,day,ffmc,dmc,dc,isi,temp,rh,wind,rain,area)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`
  );

  let n = 0;
  console.log("[init-db] Reading CSV & inserting rows...");
  fs.createReadStream(csvPath)
    .pipe(parse({ columns: true, trim: true }))
    .on("data", (r) => {
      const num = (k) => (r[k] === "" ? null : Number(r[k]));
      stmt.run(
        num("X"),
        num("Y"),
        r["month"],
        r["day"],
        num("FFMC"),
        num("DMC"),
        num("DC"),
        num("ISI"),
        num("temp"),
        num("RH"),
        num("wind"),
        num("rain"),
        num("area")
      );
      if (++n % 200 === 0) console.log(`[init-db] inserted ${n}...`);
    })
    .on("end", () => {
      stmt.finalize();
      console.log(`[init-db] insert complete; rows=${n}`);
      db.get("SELECT COUNT(*) AS c FROM fires", (err, row) => {
        if (err) {
          console.error(err);
          process.exit(1);
        }
        console.log(`[init-db] row count in DB = ${row.c}`);
        db.close(() => console.log("[init-db] Done."));
      });
    })
    .on("error", (e) => {
      console.error("[init-db] CSV error:", e);
      process.exit(1);
    });
});
