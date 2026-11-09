// Redefine a senha de um administrador existente sem expor a senha no histórico do terminal.
// Uso: RESET_ADMIN_EMAIL=admin@empresa.com.br npm run admin:reset-password
// O script solicita RESET_ADMIN_PASSWORD pelo ambiente; não cria usuários nem altera permissões.
import { pool, q, auditar } from "../src/db.js";
import { gerarHash } from "../src/auth.js";
import { senhaValida } from "../src/permissions.js";

const email = String(process.env.RESET_ADMIN_EMAIL || "").trim().toLowerCase();
const senha = process.env.RESET_ADMIN_PASSWORD || "";

try {
  if (!email || !senhaValida(senha)) {
    throw new Error("Defina RESET_ADMIN_EMAIL e RESET_ADMIN_PASSWORD (mínimo 10 caracteres, com letras e números).");
  }

  const [usuario] = await q(
    "SELECT id, email, perfil FROM usuarios WHERE email = ? LIMIT 1",
    [email],
  );

  if (!usuario) throw new Error("Administrador não encontrado. Nenhum dado foi alterado.");
  if (usuario.perfil !== "admin") throw new Error("A conta informada não tem perfil admin. Nenhum dado foi alterado.");

  const senhaHash = await gerarHash(senha);
  await q(
    "UPDATE usuarios SET senha_hash = ?, tentativas_falhas = 0, bloqueado_ate = NULL WHERE id = ?",
    [senhaHash, usuario.id],
  );
  await q("DELETE FROM sessoes WHERE usuario_id = ?", [usuario.id]);
  await auditar(usuario.id, "senha_admin_redefinida", "Redefinição administrativa via script seguro", null);

  console.log(`Senha do administrador ${usuario.email} redefinida. Sessões antigas encerradas.`);
} catch (erro) {
  console.error(erro.message);
  process.exitCode = 1;
} finally {
  delete process.env.RESET_ADMIN_PASSWORD;
  await pool.end();
}
