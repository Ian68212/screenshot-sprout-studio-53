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
import { q, auditar, pool } from "./db.js";
import { COOKIE, login, logout, carregarUsuario, exigir, gerarHash } from "./auth.js";
import { PERFIS, podeVerFerramenta } from "./permissions.js";
import { siteRouter } from "./site-cms.js";
import { mediaRouter } from "./site-media.js";
import { publicSiteRouter } from "./public-site.js";

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
    path.resolve(process.cwd(), "public", "colaborador"),
    path.resolve(process.cwd(), "nodejs", "public", "colaborador"),
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
        path.join("public", "colaborador"),
        path.join("nodejs", "public", "colaborador"),
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
let ferramentaImagemSchema;
async function garantirColunaImagemFerramentas() {
  if (!ferramentaImagemSchema) {
    ferramentaImagemSchema = (async () => {
      const [colunas] = await q("SHOW COLUMNS FROM ferramentas LIKE 'imagem_url'");
      if (!colunas.length) await q("ALTER TABLE ferramentas ADD COLUMN imagem_url VARCHAR(500) NULL AFTER url");
    })().catch((error) => { ferramentaImagemSchema = null; throw error; });
  }
  await ferramentaImagemSchema;
}
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

// API pública de leitura do CMS: sem sessão, somente conteúdo publicado.
r.use("/api/public/site", publicSiteRouter);

// Proteção CSRF: toda escrita exige cabeçalho próprio (não enviável por formulários de outros sites)
r.use((req, res, next) => {
  if (req.method !== "GET" && req.method !== "OPTIONS" && req.get("X-Portal") !== "1") return res.status(403).json({ erro: "Requisição inválida" });
  next();
});

// CMS administrativo e biblioteca privada de imagens (exigem sessão/permissão).
r.use("/api/site", siteRouter);
r.use("/api/site/midias", mediaRouter);

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
  await garantirColunaImagemFerramentas();
  const ferramentas = await q("SELECT id, nome, descricao, url, imagem_url, categoria FROM ferramentas WHERE ativo = 1 ORDER BY nome");
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
  if (!nome?.trim() || !email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || !PERFIS.includes(perfil))
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
  if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ erro: "Identificador inválido." });
  const body = req.body || {};
  if (Object.prototype.hasOwnProperty.call(body, "senha"))
    return res.status(400).json({ erro: "A senha é gerenciada pela Hostinger. Altere-a nas configurações da caixa postal." });
  const [alvo] = await q("SELECT id, perfil, ativo FROM usuarios WHERE id=?", [id]);
  if (!alvo) return res.status(404).json({ erro: "Colaborador não encontrado." });
  const campos = [];
  const valores = [];
  if (body.nome !== undefined) {
    const nome = String(body.nome).trim();
    if (!nome || nome.length > 160) return res.status(400).json({ erro: "Informe um nome válido (até 160 caracteres)." });
    campos.push("nome=?"); valores.push(nome);
  }
  if (body.email !== undefined) {
    const email = String(body.email).trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 190) return res.status(400).json({ erro: "Informe um e-mail válido." });
    campos.push("email=?"); valores.push(email);
  }
  if (body.perfil !== undefined) {
    if (!PERFIS.includes(body.perfil)) return res.status(400).json({ erro: "Perfil inválido." });
    if (id === req.usuario.id && body.perfil !== "admin") return res.status(400).json({ erro: "Você não pode retirar seu próprio perfil de administrador." });
    campos.push("perfil=?"); valores.push(body.perfil);
  }
  for (const campo of ["setor_id", "cargo_id"]) {
    if (body[campo] !== undefined) {
      const valor = body[campo] === "" || body[campo] === null ? null : Number(body[campo]);
      if (valor !== null && (!Number.isSafeInteger(valor) || valor < 1)) return res.status(400).json({ erro: "Setor ou cargo inválido." });
      campos.push(campo + "=?"); valores.push(valor);
    }
  }
  if (body.ativo !== undefined) {
    if (typeof body.ativo !== "boolean" && ![0, 1].includes(body.ativo)) return res.status(400).json({ erro: "Status inválido." });
    const ativo = body.ativo ? 1 : 0;
    if (id === req.usuario.id && !ativo) return res.status(400).json({ erro: "Você não pode desativar seu próprio acesso." });
    if (!ativo && alvo.perfil === "admin" && alvo.ativo) {
      const [contagem] = await q("SELECT COUNT(*) total FROM usuarios WHERE perfil='admin' AND ativo=1");
      if (Number(contagem.total) <= 1) return res.status(400).json({ erro: "Não é possível desativar o último administrador ativo." });
    }
    campos.push("ativo=?"); valores.push(ativo);
    if (!ativo) await q("DELETE FROM sessoes WHERE usuario_id=?", [id]);
  }
  if (!campos.length) return res.status(400).json({ erro: "Nenhuma informação para atualizar." });
  valores.push(id);
  await q("UPDATE usuarios SET " + campos.join(", ") + " WHERE id=?", valores);
  await auditar(req.usuario.id, "alterou_usuario", String(id), req.ip);
  res.json({ ok: true });
}));

r.delete("/api/admin/usuarios/:id", exigir("admin.usuarios"), wrap(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ erro: "Identificador inválido." });
  if (id === req.usuario.id) return res.status(400).json({ erro: "Você não pode excluir o próprio usuário." });
  const [alvo] = await q("SELECT id, email, perfil, ativo FROM usuarios WHERE id=?", [id]);
  if (!alvo) return res.status(404).json({ erro: "Colaborador não encontrado." });
  if (alvo.perfil === "admin" && alvo.ativo) {
    const [contagem] = await q("SELECT COUNT(*) total FROM usuarios WHERE perfil='admin' AND ativo=1");
    if (Number(contagem.total) <= 1) return res.status(400).json({ erro: "Não é possível excluir o último administrador ativo." });
  }
  await q("DELETE FROM usuarios WHERE id=?", [id]);
  await auditar(req.usuario.id, "excluiu_usuario", alvo.email, req.ip);
  res.json({ ok: true });
}));

r.get("/api/admin/ferramentas", exigir("admin.ferramentas"), wrap(async (_req, res) => {
  await garantirColunaImagemFerramentas();
  res.json({ ferramentas: await q("SELECT * FROM ferramentas ORDER BY categoria,nome"), regras: await q("SELECT * FROM ferramenta_acessos") });
}));
r.post("/api/admin/ferramentas", exigir("admin.ferramentas"), wrap(async (req, res) => {
  const { nome, descricao = null, url, imagem_url = null, categoria = "ferramentas", regras = [] } = req.body || {};
  if (!nome || String(nome).trim().length > 160 || !url || String(url).length > 500 || !/^(https:\/\/|\/)/.test(url))
    return res.status(400).json({ erro: "Informe nome e um link https:// ou /" });
  if (!["documentos","comunicados","treinamentos","ferramentas"].includes(categoria))
    return res.status(400).json({ erro: "Categoria inválida." });
  if (imagem_url != null && !/^\/colaborador\/api\/site\/midias\/\d+\/arquivo$/.test(imagem_url))
    return res.status(400).json({ erro: "Imagem inválida. Envie uma imagem pelo formulário." });

  let conexao;
  let etapa = "verificar estrutura da tabela ferramentas";
  const referencia = crypto.randomUUID().slice(0,8);
  try {
    await garantirColunaImagemFerramentas();
    etapa = "conectar ao banco";
    conexao = await pool.getConnection();
    await conexao.beginTransaction();

    etapa = "gravar ferramenta/documento";
    const [out] = await conexao.execute(
      "INSERT INTO ferramentas (nome, descricao, url, imagem_url, categoria) VALUES (?,?,?,?,?)",
      [String(nome).trim(), String(descricao || "").trim().slice(0,255) || null, url, imagem_url, categoria]
    );

    for (const g of (Array.isArray(regras) ? regras : [])) {
      const setorId = g.setor_id ? Number(g.setor_id) : null;
      const cargoId = g.cargo_id ? Number(g.cargo_id) : null;
      const perfil = PERFIS.includes(g.perfil) ? g.perfil : null;

      if (setorId !== null) {
        etapa = "validar setor selecionado";
        const [setoresEncontrados] = await conexao.execute("SELECT id FROM setores WHERE id=?", [setorId]);
        if (!setoresEncontrados.length) {
          const erro = new Error("O setor selecionado não existe mais. Atualize a página e tente novamente.");
          erro.code = "SETOR_INEXISTENTE";
          throw erro;
        }
      }
      if (cargoId !== null) {
        etapa = "validar cargo selecionado";
        const [cargosEncontrados] = await conexao.execute("SELECT id FROM cargos WHERE id=?", [cargoId]);
        if (!cargosEncontrados.length) {
          const erro = new Error("O cargo selecionado não existe mais. Atualize a página e tente novamente.");
          erro.code = "CARGO_INEXISTENTE";
          throw erro;
        }
      }

      etapa = "gravar permissões de acesso";
      await conexao.execute(
        "INSERT INTO ferramenta_acessos (ferramenta_id, setor_id, cargo_id, perfil) VALUES (?,?,?,?)",
        [out.insertId, setorId, cargoId, perfil]
      );
    }

    etapa = "registrar auditoria";
    await conexao.execute(
      "INSERT INTO auditoria (usuario_id, acao, detalhe, ip) VALUES (?,?,?,?)",
      [req.usuario.id ?? null, "criou_ferramenta", String(out.insertId) + ": " + String(nome), req.ip ?? null]
    );

    etapa = "confirmar cadastro";
    await conexao.commit();
    res.status(201).json({ ok: true, id: out.insertId });
  } catch (erro) {
    if (conexao) await conexao.rollback().catch(() => {});
    console.error("[ferramentas] Falha no cadastro", {
      referencia, etapa, code: erro?.code || null,
      message: erro?.message || String(erro), sqlMessage: erro?.sqlMessage || null
    });
    const mensagem = erro?.code === "ER_BAD_FIELD_ERROR"
      ? "A tabela do portal precisa de atualização."
      : erro?.code === "ER_NO_SUCH_TABLE"
        ? "Uma tabela necessária do portal não foi encontrada."
        : erro?.code === "ER_NO_REFERENCED_ROW_2"
          ? "O setor ou cargo selecionado não corresponde ao banco de dados. Atualize a página e tente novamente."
          : erro?.message || "Falha ao salvar o cadastro.";
    res.status(500).json({ erro: "Falha ao " + etapa + ": " + mensagem + " Referência: " + referencia, referencia, etapa, codigo: erro?.code || null });
  } finally {
    conexao?.release();
  }
}));
r.delete("/api/admin/ferramentas/:id", exigir("admin.ferramentas"), wrap(async (req, res) => {
  await garantirColunaImagemFerramentas();
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ erro: "Identificador inválido." });
  const [item] = await q("SELECT id,nome FROM ferramentas WHERE id=?", [id]);
  if (!item) return res.status(404).json({ erro: "Ferramenta ou documento não encontrado." });
  await q("DELETE FROM ferramentas WHERE id=?", [id]);
  await auditar(req.usuario.id, "excluiu_ferramenta", String(id) + ": " + item.nome, req.ip);
  res.json({ ok: true });
}));

r.get("/api/admin/auditoria", exigir("admin.auditoria"), wrap(async (_req, res) => {
  res.json(await q(`SELECT a.acao, a.detalhe, a.ip, a.criado_em, u.email FROM auditoria a
    LEFT JOIN usuarios u ON u.id=a.usuario_id ORDER BY a.id DESC LIMIT 200`));
}));

r.use((err, req, res, _next) => {
  if (err?.code === "LIMIT_FILE_SIZE") return res.status(413).json({ erro: "O arquivo enviado deve ter no máximo 5 MB." });
  if (err?.message?.includes("currículo")) return res.status(400).json({ erro: err.message });
  if (err?.code === "ER_DUP_ENTRY") return res.status(409).json({ erro: "Registro já existe" });
  const referencia = crypto.randomUUID().slice(0,8);
  console.error("[portal] Erro não tratado", {
    referencia, method: req.method, path: req.originalUrl,
    code: err?.code || null, message: err?.message || String(err),
    sqlMessage: err?.sqlMessage || null, stack: err?.stack || null,
  });
  if (err?.code === "ER_BAD_FIELD_ERROR")
    return res.status(500).json({ erro: "A estrutura do banco está desatualizada. Referência: " + referencia, referencia });
  if (err?.code === "ER_NO_SUCH_TABLE")
    return res.status(500).json({ erro: "Uma tabela necessária não existe no banco. Referência: " + referencia, referencia });
  if (err?.code === "EACCES" || err?.code === "EPERM")
    return res.status(500).json({ erro: "O servidor não tem permissão para acessar a pasta de arquivos. Referência: " + referencia, referencia });
  if (err?.code === "ENOSPC")
    return res.status(507).json({ erro: "Não há espaço disponível no servidor. Referência: " + referencia, referencia });
  res.status(500).json({ erro: "Erro interno. Referência: " + referencia, referencia });
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
