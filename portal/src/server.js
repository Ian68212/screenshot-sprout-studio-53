import "dotenv/config";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import express from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { q, auditar } from "./db.js";
import { COOKIE, login, logout, carregarUsuario, exigir, gerarHash } from "./auth.js";
import { PERFIS, podeVerFerramenta } from "./permissions.js";
import { siteRouter } from "./site-cms.js";
import { mediaRouter } from "./site-media.js";

const BASE = process.env.BASE_PATH || "/colaborador";
const dir = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.set("trust proxy", 1);
app.use(helmet({ contentSecurityPolicy: { directives: { "script-src": ["'self'"] } } }));
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

const r = express.Router();
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
r.use(wrap(carregarUsuario));

// Proteção CSRF: toda escrita exige cabeçalho próprio (não enviável por formulários de outros sites)
r.use((req, res, next) => {
  if (req.method !== "GET" && req.get("X-Portal") !== "1") return res.status(403).json({ erro: "Requisição inválida" });
  next();
});

const limiteLogin = rateLimit({ windowMs: 15 * 60000, limit: 20, standardHeaders: true, legacyHeaders: false });

r.post("/api/login", limiteLogin, wrap(async (req, res) => {
  const { email, senha } = req.body || {};
  if (!email || !senha) return res.status(400).json({ erro: "Informe e-mail e senha" });
  const s = await login(email, senha, req.ip);
  if (s?.bloqueado) return res.status(423).json({ erro: "Acesso bloqueado temporariamente. Tente mais tarde." });
  if (s?.indisponivel) return res.status(503).json({ erro: "Não foi possível validar o e-mail agora. Tente novamente em alguns minutos." });
  if (!s) return res.status(401).json({ erro: "E-mail ou senha incorretos" });
  res.cookie(COOKIE, s.token, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: BASE, maxAge: s.maxAge,
  });
  res.json({ ok: true });
}));

r.post("/api/logout", wrap(async (req, res) => {
  await logout(req.cookies?.[COOKIE]);
  res.clearCookie(COOKIE, { path: BASE });
  res.json({ ok: true });
}));

r.get("/api/eu", exigir("painel"), (req, res) => res.json(req.usuario));

r.get("/api/ferramentas", exigir("painel"), wrap(async (req, res) => {
  const ferramentas = await q("SELECT id, nome, descricao, url, categoria FROM ferramentas WHERE ativo = 1 ORDER BY nome");
  const regras = await q("SELECT * FROM ferramenta_acessos");
  res.json(ferramentas.filter((f) => podeVerFerramenta(req.usuario, regras.filter((x) => x.ferramenta_id === f.id))));
}));

// ---------- Administração ----------
r.get("/api/admin/estrutura", exigir("admin.estrutura"), wrap(async (_req, res) => {
  res.json({ setores: await q("SELECT * FROM setores ORDER BY nome"), cargos: await q("SELECT * FROM cargos ORDER BY nome"), perfis: PERFIS });
}));
for (const tabela of ["setores", "cargos"]) {
  r.post(`/api/admin/${tabela}`, exigir("admin.estrutura"), wrap(async (req, res) => {
    const nome = String(req.body?.nome || "").trim();
    if (!nome) return res.status(400).json({ erro: "Informe o nome" });
    await q(`INSERT INTO ${tabela} (nome) VALUES (?)`, [nome]);
    await auditar(req.usuario.id, `criou_${tabela}`, nome, req.ip);
    res.json({ ok: true });
  }));
}

r.get("/api/admin/usuarios", exigir("admin.usuarios"), wrap(async (_req, res) => {
  res.json(await q(`SELECT u.id, u.nome, u.email, u.perfil, u.ativo, u.setor_id, u.cargo_id, s.nome setor, c.nome cargo
    FROM usuarios u LEFT JOIN setores s ON s.id=u.setor_id LEFT JOIN cargos c ON c.id=u.cargo_id ORDER BY u.nome`));
}));

r.post("/api/admin/usuarios", exigir("admin.usuarios"), wrap(async (req, res) => {
  const { nome, email, perfil = "colaborador", setor_id = null, cargo_id = null } = req.body || {};
  if (!nome || !email || !PERFIS.includes(perfil)) return res.status(400).json({ erro: "Dados inválidos" });
  const senhaLegadaInutilizada = crypto.randomBytes(32).toString("hex");
  await q("INSERT INTO usuarios (nome, email, senha_hash, perfil, setor_id, cargo_id) VALUES (?,?,?,?,?,?)",
    [nome.trim(), email.trim().toLowerCase(), await gerarHash(senhaLegadaInutilizada), perfil, setor_id || null, cargo_id || null]);
  await auditar(req.usuario.id, "criou_usuario", email, req.ip);
  res.json({ ok: true });
}));

r.patch("/api/admin/usuarios/:id", exigir("admin.usuarios"), wrap(async (req, res) => {
  const id = Number(req.params.id);
  const { perfil, setor_id, cargo_id, ativo } = req.body || {};
  if (id === req.usuario.id && (ativo === false || (perfil && perfil !== "admin")))
    return res.status(400).json({ erro: "Você não pode remover seu próprio acesso de administrador" });
  if (perfil && !PERFIS.includes(perfil)) return res.status(400).json({ erro: "Perfil inválido" });
  if (perfil) await q("UPDATE usuarios SET perfil=? WHERE id=?", [perfil, id]);
  if (setor_id !== undefined) await q("UPDATE usuarios SET setor_id=? WHERE id=?", [setor_id || null, id]);
  if (cargo_id !== undefined) await q("UPDATE usuarios SET cargo_id=? WHERE id=?", [cargo_id || null, id]);
  if (ativo !== undefined) {
    await q("UPDATE usuarios SET ativo=? WHERE id=?", [ativo ? 1 : 0, id]);
    if (!ativo) await q("DELETE FROM sessoes WHERE usuario_id=?", [id]);
  }
  await auditar(req.usuario.id, "alterou_usuario", String(id), req.ip);
  res.json({ ok: true });
}));

r.get("/api/admin/ferramentas", exigir("admin.ferramentas"), wrap(async (_req, res) => {
  res.json({ ferramentas: await q("SELECT * FROM ferramentas ORDER BY nome"), regras: await q("SELECT * FROM ferramenta_acessos") });
}));
r.post("/api/admin/ferramentas", exigir("admin.ferramentas"), wrap(async (req, res) => {
  const { nome, descricao = null, url, categoria = "ferramentas", regras = [] } = req.body || {};
  if (!nome || !url || !/^(https:\/\/|\/)/.test(url)) return res.status(400).json({ erro: "Informe nome e um link https:// ou /" });
  const out = await q("INSERT INTO ferramentas (nome, descricao, url, categoria) VALUES (?,?,?,?)", [nome, descricao, url, categoria]);
  for (const g of regras)
    await q("INSERT INTO ferramenta_acessos (ferramenta_id, setor_id, cargo_id, perfil) VALUES (?,?,?,?)",
      [out.insertId, g.setor_id || null, g.cargo_id || null, PERFIS.includes(g.perfil) ? g.perfil : null]);
  await auditar(req.usuario.id, "criou_ferramenta", nome, req.ip);
  res.json({ ok: true });
}));

r.get("/api/admin/auditoria", exigir("admin.auditoria"), wrap(async (_req, res) => {
  res.json(await q(`SELECT a.acao, a.detalhe, a.ip, a.criado_em, u.email FROM auditoria a
    LEFT JOIN usuarios u ON u.id=a.usuario_id ORDER BY a.id DESC LIMIT 200`));
}));

r.use("/api/site", siteRouter);
r.use("/api/site/midias", mediaRouter);
r.use(express.static(path.join(dir, "..", "public"), { index: "index.html" }));
r.use((err, _req, res, _next) => {
  if (err?.code === "LIMIT_FILE_SIZE") return res.status(413).json({ erro: "Imagem excede 5 MB" });
  if (err?.code === "LIMIT_UNEXPECTED_FILE") return res.status(400).json({ erro: "Envie apenas uma imagem" });
  if (err?.code === "ER_DUP_ENTRY") return res.status(409).json({ erro: "Registro já existe" });
  console.error(err);
  res.status(500).json({ erro: "Erro interno" });
});

app.use(BASE, r);
const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`Portal em http://localhost:${port}${BASE}`));
