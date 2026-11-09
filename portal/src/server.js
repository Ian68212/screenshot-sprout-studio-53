import "dotenv/config";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import express from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import multer from "multer";
import { q, auditar } from "./db.js";
import { COOKIE, login, logout, carregarUsuario, exigir, gerarHash } from "./auth.js";
import { PERFIS, podeVerFerramenta } from "./permissions.js";

const BASE = process.env.BASE_PATH || "/colaborador";
const dir = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// O Nitro pode empacotar este handler em .output/server, mudando import.meta.url.
// Localize a pasta pública tanto no checkout original quanto no diretório de execução.
function localizarPastaPublica() {
  const candidatos = [
    process.env.PORTAL_PUBLIC_DIR,
    // Durante o build Nitro copia publicAssets para .output/public.
    path.resolve(process.cwd(), ".output", "public", "colaborador"),
    path.resolve(process.cwd(), ".output", "public"),
    path.resolve(process.cwd(), "portal", "public"),
    path.resolve(process.cwd(), "public"),
    path.resolve(dir, "..", "public"),
    path.resolve(dir, "..", "..", "portal", "public"),
    path.resolve(dir, "..", "..", "..", "portal", "public"),
  ].filter(Boolean);
  for (const pasta of candidatos) {
    if (
      fs.existsSync(path.join(pasta, "index.html")) &&
      fs.existsSync(path.join(pasta, "portal.css"))
    ) return pasta;
  }
  // Busca também subindo a árvore de diretórios, útil em instalações com raiz variável.
  for (const inicio of [process.cwd(), dir]) {
    let atual = path.resolve(inicio);
    for (let nivel = 0; nivel < 7; nivel++) {
      for (const relativa of [
        path.join(".output", "public", "colaborador"),
        path.join(".output", "public"),
        path.join("portal", "public"),
        "public",
      ]) {
        const pasta = path.join(atual, relativa);
        if (fs.existsSync(path.join(pasta, "index.html"))) return pasta;
      }
      const pai = path.dirname(atual);
      if (pai === atual) break;
      atual = pai;
    }
  }
  console.error("Portal: pasta pública não encontrada", { cwd: process.cwd(), moduleDir: dir, candidatos });
  return null;
}
const publicDir = localizarPastaPublica();
const uploadDir = path.join(dir, "..", "private", "curriculos");
fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => cb(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = [".pdf", ".doc", ".docx"];
    if (!allowed.includes(ext)) return cb(new Error("Envie o currículo em PDF, DOC ou DOCX"));
    cb(null, true);
  },
});
app.set("trust proxy", 1);
app.use(helmet({ contentSecurityPolicy: { directives: { "script-src": ["'self'"] } } }));
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

const r = express.Router();
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
// Arquivos públicos do portal não dependem do MySQL nem de sessão.
if (publicDir) {
  console.info("Portal: arquivos públicos servidos de", publicDir);
  r.use(express.static(publicDir, { index: "index.html", fallthrough: true }));
} else {
  r.get("/", (_req, res) => res.status(500).type("text/plain").send("Portal: arquivos da interface não encontrados no servidor."));
}
r.use(wrap(carregarUsuario));

// CORS restrito ao site institucional para receber candidaturas sem expor a API administrativa.
const siteOrigins = new Set(["https://rodrinoxpro.com.br", "https://www.rodrinoxpro.com.br"]);
r.use((req, res, next) => {
  const origin = req.get("Origin");
  if (origin && siteOrigins.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Portal");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  }
  if (req.method === "OPTIONS") return res.sendStatus(origin && siteOrigins.has(origin) ? 204 : 403);
  next();
});

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
  if (s?.indisponivel) return res.status(503).json({ erro: "Não foi possível validar seu e-mail na Hostinger agora. Tente novamente em alguns minutos." });
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


// ---------- Candidaturas (formulário público + gestão restrita) ----------
const limiteCandidaturas = rateLimit({ windowMs: 60 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false });
r.post("/api/candidaturas", limiteCandidaturas, upload.single("curriculo"), wrap(async (req, res) => {
  const { nome, email, telefone, area, cargo_pretendido } = req.body || {};
  if (!nome?.trim() || !email?.trim() || !telefone?.trim() || !area?.trim() || !req.file || req.body?.consent !== "on") {
    if (req.file) fs.unlink(req.file.path, () => {});
    return res.status(400).json({ erro: "Preencha os campos obrigatórios, anexe seu currículo e confirme o consentimento." });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
    return res.status(400).json({ erro: "Informe um e-mail válido." });
  const ext = path.extname(req.file.originalname).toLowerCase();
  const allowedMime = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/octet-stream"];
  if (![".pdf", ".doc", ".docx"].includes(ext) || !allowedMime.includes(req.file.mimetype)) {
    fs.unlink(req.file.path, () => {});
    return res.status(400).json({ erro: "Formato de currículo não permitido." });
  }
  await q(
    "INSERT INTO candidaturas (nome,email,telefone,area,cargo_pretendido,arquivo_nome,arquivo_path,consent_at) VALUES (?,?,?,?,?,?,?,NOW())",
    [nome.trim().slice(0,150), email.trim().toLowerCase().slice(0,180), telefone.trim().slice(0,30), area.trim().slice(0,100), String(cargo_pretendido || "").trim().slice(0,120) || null, path.basename(req.file.originalname).slice(0,255), req.file.path],
  );
  res.status(201).json({ ok: true });
}));

r.get("/api/admin/candidaturas", exigir("admin.usuarios"), wrap(async (_req, res) => {
  res.json(await q("SELECT id,nome,email,telefone,area,cargo_pretendido,status,criado_em FROM candidaturas ORDER BY criado_em DESC LIMIT 500"));
}));

r.patch("/api/admin/candidaturas/:id", exigir("admin.usuarios"), wrap(async (req, res) => {
  const status = String(req.body?.status || "");
  const validos = ["recebido","em_analise","entrevista","aprovado","reprovado"];
  if (!validos.includes(status)) return res.status(400).json({ erro: "Status inválido." });
  await q("UPDATE candidaturas SET status=? WHERE id=?", [status, Number(req.params.id)]);
  await auditar(req.usuario.id, "atualizou_candidatura", `#${req.params.id}: ${status}`, req.ip);
  res.json({ ok: true });
}));

r.get("/api/admin/candidaturas/:id/curriculo", exigir("admin.usuarios"), wrap(async (req, res) => {
  const [item] = await q("SELECT arquivo_nome,arquivo_path FROM candidaturas WHERE id=?", [Number(req.params.id)]);
  if (!item || !fs.existsSync(item.arquivo_path)) return res.status(404).json({ erro: "Currículo não encontrado." });
  res.download(item.arquivo_path, item.arquivo_nome);
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
  if (!nome?.trim() || !email?.trim() || !/^[^\s@]+@[^\s@]+\\.[^\s@]+$/.test(email.trim()) || !PERFIS.includes(perfil))
    return res.status(400).json({ erro: "Informe nome, e-mail válido e perfil." });
  // O hash legado é aleatório: a senha real nunca é armazenada no portal.
  const hashInutilizavel = await gerarHash(crypto.randomBytes(48).toString("hex"));
  await q("INSERT INTO usuarios (nome, email, senha_hash, perfil, setor_id, cargo_id) VALUES (?,?,?,?,?,?)",
    [nome.trim(), email.trim().toLowerCase(), hashInutilizavel, perfil, setor_id || null, cargo_id || null]);
  await auditar(req.usuario.id, "criou_usuario", email, req.ip);
  res.json({ ok: true });
}));

r.patch("/api/admin/usuarios/:id", exigir("admin.usuarios"), wrap(async (req, res) => {
  const id = Number(req.params.id);
  const { perfil, setor_id, cargo_id, ativo } = req.body || {};
  if (Object.prototype.hasOwnProperty.call(req.body || {}, "senha"))
    return res.status(400).json({ erro: "A senha é gerenciada pela Hostinger. Altere-a nas configurações da caixa postal." });
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

r.use((err, _req, res, _next) => {
  if (err?.code === "LIMIT_FILE_SIZE") return res.status(413).json({ erro: "O currículo deve ter no máximo 5 MB." });
  if (err?.message?.includes("currículo")) return res.status(400).json({ erro: err.message });
  if (err?.code === "ER_DUP_ENTRY") return res.status(409).json({ erro: "Registro já existe" });
  console.error(err);
  res.status(500).json({ erro: "Erro interno" });
});

// Nitro pode entregar ao handler Node o caminho relativo ao padrão da rota
// (por exemplo, "/" ou "/portal.css"), enquanto o Express está montado em BASE.
// Normalize nos dois cenários: com ou sem o prefixo, sem duplicá-lo.
app.use((req, _res, next) => {
  const current = req.url || "/";
  const queryAt = current.indexOf("?");
  const pathname = queryAt < 0 ? current : current.slice(0, queryAt);
  const search = queryAt < 0 ? "" : current.slice(queryAt);
  if (pathname !== BASE && !pathname.startsWith(BASE + "/")) {
    req.url = `${BASE}${pathname.startsWith("/") ? pathname : `/${pathname}`}${search}`;
  }
  next();
});

// Health check sem dependência do banco, para validar o roteamento HTTP.
app.get(`${BASE}/health`, (_req, res) => {
  res.status(200).json({ ok: true, service: "portal-colaborador" });
});

app.use(BASE, r);
export default app;
