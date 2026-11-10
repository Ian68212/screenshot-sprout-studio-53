import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "../src/db.js";

const sql = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "schema.sql"), "utf8");
const comandos = sql.split(/;\s*$/m).map((s) => s.replace(/^--.*$/gm, "").trim()).filter(Boolean);
for (const c of comandos) await pool.query(c);
// Migração compatível com bancos de teste já existentes antes do módulo de RH.
const [colunas] = await pool.query("SHOW COLUMNS FROM candidaturas LIKE 'consent_at'");
if (!colunas.length) {
  await pool.query("ALTER TABLE candidaturas ADD COLUMN consent_at DATETIME NULL AFTER arquivo_path");
}
// Migração aditiva: imagem opcional nos cards de ferramentas/documentos.
const [imagemColuna] = await pool.query("SHOW COLUMNS FROM ferramentas LIKE 'imagem_url'");
if (!imagemColuna.length) {
  await pool.query("ALTER TABLE ferramentas ADD COLUMN imagem_url VARCHAR(500) NULL AFTER url");
}
console.log(`Tabelas e migrações conferidas no banco ${process.env.DB_NAME}.`);
await pool.end();
