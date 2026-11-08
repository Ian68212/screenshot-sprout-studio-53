// Uso: npm run admin:create -- "Nome" email@empresa.com.br
import crypto from "node:crypto";
import { pool, q } from "../src/db.js";
import { gerarHash } from "../src/auth.js";

const [nome, email] = process.argv.slice(2);
if (!nome || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error('Uso: npm run admin:create -- "Nome" email@empresa.com.br');
  process.exit(1);
}
const hashInutilizado = await gerarHash(crypto.randomBytes(32).toString("hex"));
await q("INSERT INTO usuarios (nome, email, senha_hash, perfil) VALUES (?,?,?, 'admin')",
  [nome.trim(), email.trim().toLowerCase(), hashInutilizado]);
console.log(`Administrador ${email} criado. O login usa a senha da caixa postal Hostinger.`);
await pool.end();
