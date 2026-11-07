// Uso: npm run admin:create -- "Nome" email@empresa.com.br "SenhaForte123"
import { pool, q } from "../src/db.js";
import { gerarHash } from "../src/auth.js";
import { senhaValida } from "../src/permissions.js";

const [nome, email, senha] = process.argv.slice(2);
if (!nome || !email || !senhaValida(senha)) {
  console.error('Uso: npm run admin:create -- "Nome" email "Senha com 10+ caracteres, letras e números"');
  process.exit(1);
}
await q("INSERT INTO usuarios (nome, email, senha_hash, perfil) VALUES (?,?,?, 'admin')", [nome, email.toLowerCase(), await gerarHash(senha)]);
console.log(`Administrador ${email} criado.`);
await pool.end();
