import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "../src/db.js";

const sql = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "schema.sql"), "utf8");
const comandos = sql.split(/;\s*$/m).map((s) => s.replace(/^--.*$/gm, "").trim()).filter(Boolean);
for (const c of comandos) await pool.query(c);
console.log(`Tabelas criadas no banco ${process.env.DB_NAME}.`);
await pool.end();
