import mysql from "mysql2/promise";
import "dotenv/config";

export const pool = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 10,
  multipleStatements: false,
});

export async function q(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

export async function auditar(usuarioId, acao, detalhe, ip) {
  await q("INSERT INTO auditoria (usuario_id, acao, detalhe, ip) VALUES (?,?,?,?)", [
    usuarioId ?? null, acao, detalhe ? String(detalhe).slice(0, 500) : null, ip ?? null,
  ]);
}
