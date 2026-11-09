import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { q, auditar } from "./db.js";
import { pode, MAX_TENTATIVAS, BLOQUEIO_MINUTOS } from "./permissions.js";
import { validarSenhaHostinger } from "./hostinger-auth.js";
import { EmailAuthUnavailableError } from "./hostinger-auth.js";

export const COOKIE = "rp_sessao";
const HORAS = Number(process.env.SESSION_HOURS || 8);
const hash = (t) => crypto.createHash("sha256").update(t).digest("hex");

export async function login(email, senha, ip) {
  const endereco = String(email).trim().toLowerCase();
  const [u] = await q("SELECT * FROM usuarios WHERE email = ?", [endereco]);
  // A existência do cadastro no portal controla permissões; a senha é sempre validada no e-mail Hostinger.
  if (!u) return null;
  if (!u.ativo) return null;
  if (u.bloqueado_ate && new Date(u.bloqueado_ate) > new Date()) return { bloqueado: true };

  let ok;
  try {
    ok = await validarSenhaHostinger(endereco, String(senha));
  } catch (error) {
    if (error instanceof EmailAuthUnavailableError) return { indisponivel: true };
    throw error;
  }

  if (!ok) {
    const n = u.tentativas_falhas + 1;
    await q(
      "UPDATE usuarios SET tentativas_falhas = ?, bloqueado_ate = ? WHERE id = ?",
      [n >= MAX_TENTATIVAS ? 0 : n, n >= MAX_TENTATIVAS ? new Date(Date.now() + BLOQUEIO_MINUTOS * 60000) : null, u.id],
    );
    await auditar(u.id, "login_falhou", "Credencial de e-mail recusada pela Hostinger", ip);
    return null;
  }

  await q("UPDATE usuarios SET tentativas_falhas = 0, bloqueado_ate = NULL WHERE id = ?", [u.id]);
  const token = crypto.randomBytes(32).toString("hex");
  await q("INSERT INTO sessoes (token_hash, usuario_id, expira_em) VALUES (?,?,?)", [
    hash(token), u.id, new Date(Date.now() + HORAS * 3600000),
  ]);
  await auditar(u.id, "login", "Autenticado pela caixa postal Hostinger (IMAP)", ip);
  return { token, maxAge: HORAS * 3600000 };
}

export async function logout(token) {
  if (token) await q("DELETE FROM sessoes WHERE token_hash = ?", [hash(token)]);
}

export async function carregarUsuario(req, _res, next) {
  const token = req.cookies?.[COOKIE];
  req.usuario = null;
  if (token) {
    const [u] = await q(
      `SELECT u.id, u.nome, u.email, u.perfil, u.setor_id, u.cargo_id, u.ativo,
              s.nome AS setor, c.nome AS cargo
         FROM sessoes x JOIN usuarios u ON u.id = x.usuario_id
         LEFT JOIN setores s ON s.id = u.setor_id LEFT JOIN cargos c ON c.id = u.cargo_id
        WHERE x.token_hash = ? AND x.expira_em > NOW()`,
      [hash(token)],
    );
    if (u && u.ativo) req.usuario = { ...u, ativo: !!u.ativo };
  }
  next();
}

export const exigir = (permissao) => (req, res, next) => {
  if (!req.usuario) return res.status(401).json({ erro: "Não autenticado" });
  if (!pode(req.usuario, permissao)) return res.status(403).json({ erro: "Acesso negado" });
  next();
};

// Mantido apenas para compatibilidade com registros antigos; não autentica mais o usuário.
export const gerarHash = (senha) => bcrypt.hash(senha, 12);
