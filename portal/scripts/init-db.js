import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "../src/db.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
for (const arquivo of ["schema.sql", "site-schema.sql"]) {
  const sql = fs.readFileSync(path.join(root, arquivo), "utf8");
  const comandos = sql.split(/;\\s*$/m).map((s) => s.replace(/^--.*$/gm, "").trim()).filter(Boolean);
  for (const comando of comandos) await pool.query(comando);
  console.log(`Estrutura ${arquivo} aplicada no banco ${process.env.DB_NAME}.`);
}
await pool.end();
