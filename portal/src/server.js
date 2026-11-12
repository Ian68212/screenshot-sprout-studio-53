import { tasksRouter } from "./tasks-official.js";
import chatInternoRouter from "./chat-interno.js";
import { accessProfilesRouter } from "./access-profiles.js";
import atendimentoRodrinoxRouter from "./atendimento-rodrinox.js";
import whatsappMetaRouter from "./whatsapp-meta.js";
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
import menuPermissoesRouter from "./menu-permissoes.js";
import emailCorporativoRouter from "./email-corporativo.js";

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
app.use(express.json({ limit: "100kb", verify(req,_res,buf){ if(req.originalUrl?.includes("/api/whatsapp-meta/webhook")) req.rawBody=Buffer.from(buf); } }));
app.use(cookieParser());

const r = express.Router();
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
let ferramentaImagemSchema;
async function garantirColunaImagemFerramentas() {
  if (!ferramentaImagemSchema) {
    ferramentaImagemSchema = (async () => {
      const colunas = await q("SHOW COLUMNS FROM ferramentas LIKE 'imagem_url'");
      if (!Array.isArray(colunas)) throw new Error("O banco retornou um formato inesperado ao verificar imagem_url.");
      if (colunas.length === 0) {
        await q("ALTER TABLE ferramentas ADD COLUMN imagem_url VARCHAR(500) NULL AFTER url");
      }
    })().catch((error) => { ferramentaImagemSchema = null; throw error; });
  }
  await ferramentaImagemSchema;
}
// Publicação oficial dos dois painéis, reutilizando os mesmos componentes validados.
// URLs próprias; homologação continua intacta para testes futuros.
r.use(["/oficial", "/painel/oficial"], wrap(async (req, res, next) => {
  await new Promise((resolve, reject) => carregarUsuario(req, res, err => err ? reject(err) : resolve()));
  res.setHeader("Cache-Control", "no-store");
  if (!req.usuario) return res.redirect(302, BASE + "/");
  if (req.baseUrl.endsWith("/painel/oficial") && req.usuario.perfil !== "admin")
    return res.status(403).type("text/plain").send("Acesso restrito a administradores da Rodrinox Pro.");
  next();
}));
if (publicDir) {
  const employeeSource = path.join(publicDir, "homologacao");
  const adminSource = path.join(publicDir, "painel", "homologacao");
  r.use("/oficial", express.static(employeeSource, { index: false, fallthrough: true, setHeaders(res) { res.setHeader("Cache-Control", "no-store, max-age=0"); } }));
  r.get(["/oficial", "/oficial/"], (_req, res) => {
    const html = fs.readFileSync(path.join(employeeSource, "index.html"), "utf8")
      .replaceAll("AMBIENTE DE HOMOLOGAÇÃO", "PORTAL OFICIAL")
      .replaceAll("Homologação | Rodrinox Pro", "Portal Oficial | Rodrinox Pro")
      .replaceAll("/colaborador/painel.html", "/colaborador/oficial/");
    res.type("html").send(html);
  });
  r.use("/painel/oficial", express.static(adminSource, { index: false, fallthrough: true, setHeaders(res) { res.setHeader("Cache-Control", "no-store, max-age=0"); } }));
  r.get(["/painel/oficial", "/painel/oficial/"], (_req, res) => {
    const html = fs.readFileSync(path.join(adminSource, "index.html"), "utf8")
      .replaceAll("PAINEL ADMINISTRATIVO · HOMOLOGAÇÃO", "PAINEL ADMINISTRATIVO · OFICIAL")
      .replaceAll("AMBIENTE DE HOMOLOGAÇÃO", "AMBIENTE OFICIAL")
      .replaceAll("/colaborador/painel.html", "/colaborador/oficial/");
    res.type("html").send(html);
  });
}

// A homologação administrativa é restrita exclusivamente ao perfil admin.
// A checagem acontece ANTES do express.static para impedir acesso direto aos arquivos.
r.use("/painel/homologacao", wrap(async (req, res, next) => {
  await new Promise((resolve, reject) => carregarUsuario(req, res, (err) => err ? reject(err) : resolve()));
  res.setHeader("Cache-Control", "no-store");
  if (!req.usuario) return res.redirect(302, BASE + "/");
  if (req.usuario.perfil !== "admin") return res.status(403).type("text/plain").send("Acesso restrito a administradores da Rodrinox Pro.");
  next();
}));

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
  if (req.method !== "GET" && req.method !== "OPTIONS" && req.get("X-Portal") !== "1") {
    // Compatibilidade com clientes oficiais: alguns proxies removem cabeçalhos personalizados.
    // Permitir somente PUT JSON da API de tarefas vindo da MESMA origem HTTPS e com sessão validada pela rota.
    const origin = req.get("Origin");
    const host = req.get("Host");
    const sameOriginTasks = req.method === "PUT"
      && req.path === "/api/tasks-official/board"
      && !!host && origin === "https://" + host
      && req.is("application/json");
    if (!sameOriginTasks) return res.status(403).json({ erro: "Requisição inválida" });
  }
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
r.use("/api/chat-interno", chatInternoRouter);

// Estado da integração de atendimento: nunca expõe token, URL interna ou credenciais.
// Disponível somente a usuários autenticados do portal.
r.get("/api/atendimento/status", exigir("painel"), (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json({
    configurada: Boolean(process.env.DIGISAC_API_TOKEN && process.env.DIGISAC_API_BASE_URL),
    ativa: Boolean(process.env.DIGISAC_API_TOKEN && process.env.DIGISAC_API_BASE_URL),
    modo: "api",
    usuario: { id: req.usuario.id, perfil: req.usuario.perfil }
  });
});

// Proxy de leitura DigiSac. Token fica exclusivamente no servidor.
// Nesta fase, apenas admin pode consultar dados de clientes: usuários comuns não herdam
// acesso irrestrito às filas pelo simples fato de possuir sessão do portal.
const digiPaths = Object.freeze({contacts:"contacts",tickets:"tickets",messages:"messages",departments:"departments",users:"users",tags:"tags","ticket-topics":"ticket-topics"});

async function chamarDigiSac(endpoint, method="GET", body) {
 const base=(process.env.DIGISAC_API_BASE_URL||"").replace(/\/+$/,""),token=process.env.DIGISAC_API_TOKEN;
 if(!base||!token)throw Object.assign(new Error("Integração DigiSac não configurada."),{status:503});
 let url;try{url=new URL(base+endpoint);if(url.protocol!=="https:"||url.hostname!=="rodrinoxpro.digisac.app"||!url.pathname.startsWith("/api/v1/"))throw Error("Destino inválido")}catch{throw Object.assign(new Error("URL da API DigiSac inválida."),{status:503})}
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
 try{const options={method,headers:{Authorization:"Bearer "+token,Accept:"application/json"},signal:controller.signal,redirect:"error"};if(body!==undefined){options.headers["Content-Type"]="application/json";options.body=JSON.stringify(body)}const upstream=await fetch(url,options),raw=await upstream.text();let payload={};try{payload=raw?JSON.parse(raw):{}}catch{payload={mensagem:raw.slice(0,300)}}if(!upstream.ok)throw Object.assign(new Error(payload?.message||payload?.error||"DigiSac recusou a operação."),{status:upstream.status});return payload}catch(err){if(err.name==="AbortError")throw Object.assign(new Error("Tempo limite ao comunicar com a DigiSac."),{status:504});throw err}finally{clearTimeout(timeout)}
}
r.get("/api/atendimento/consultar/:recurso", exigir("painel"), wrap(async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.usuario.perfil !== "admin") return res.status(403).json({erro:"Acesso não autorizado para consultar a DigiSac."});
  const endpoint = digiPaths[req.params.recurso];
  if (!endpoint) return res.status(404).json({erro:"Consulta não disponível."});
  const base = (process.env.DIGISAC_API_BASE_URL || "").replace(/\/+$/, "");
  const token = process.env.DIGISAC_API_TOKEN;
  if (!base || !token) return res.status(503).json({erro:"Credenciais DigiSac não configuradas."});
  let url;
  try {
    url = new URL(base + "/" + endpoint);
    if (url.protocol !== "https:" || url.hostname !== "rodrinoxpro.digisac.app" || !url.pathname.startsWith("/api/v1/")) throw Error("Destino inválido");
  } catch { return res.status(503).json({erro:"URL da API DigiSac inválida."}); }
  url.searchParams.set("perPage", req.params.recurso === "tickets" ? "100" : "100");
  if (req.params.recurso === "tickets") {
    // A listagem geral mistura chamados encerrados com conversas ativas.
    // A API DigiSac documenta o filtro Sequelize por isOpen.
    url.searchParams.set("query", JSON.stringify({where:{isOpen:true},perPage:100}));
  }
  if (req.params.recurso === "messages") {
    const contactId = String(req.query.contactId || "");
    if (!/^[a-zA-Z0-9-]{1,80}$/.test(contactId)) return res.status(400).json({erro:"Selecione um contato válido."});
    url.searchParams.set("where[contactId]", contactId);
    // A API DigiSac aceita consulta Sequelize: buscar as mensagens mais recentes,
    // em vez de receber apenas a primeira página (mensagens antigas).
    url.searchParams.set("query", JSON.stringify({where:{contactId},order:[["createdAt","DESC"]],perPage:100}));
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);
  try {
    const upstream = await fetch(url, {headers:{Authorization:"Bearer " + token, Accept:"application/json"},signal:controller.signal,redirect:"error"});
    if (!upstream.ok) return res.status(502).json({erro:"DigiSac recusou a consulta.",codigo:upstream.status});
    const raw = await upstream.text();
    if (raw.length > 500000) return res.status(502).json({erro:"Resposta da DigiSac excedeu o limite."});
    let payload;
    try { payload = JSON.parse(raw); } catch { return res.status(502).json({erro:"DigiSac retornou resposta inválida."}); }
    res.json(payload);
  } catch (err) {
    console.warn("Consulta DigiSac falhou:", err.name === "AbortError" ? "timeout" : "erro de comunicação");
    res.status(502).json({erro:"Não foi possível comunicar com a DigiSac."});
  } finally { clearTimeout(timeout); }
}));

// Envio controlado: somente administrador autenticado, contato de chamado aberto e confirmação explícita.
r.post("/api/atendimento/enviar", exigir("painel"), wrap(async (req,res)=>{
  res.setHeader("Cache-Control","no-store");
  if(req.usuario.perfil!=="admin")return res.status(403).json({erro:"Envio permitido somente ao administrador nesta fase."});
  const {contactId,userId,text:message}=req.body||{};
  if(!/^[a-f0-9-]{36}$/i.test(String(contactId||""))||!/^[a-f0-9-]{36}$/i.test(String(userId||"")))return res.status(400).json({erro:"Contato ou atendente inválido."});
  if(typeof message!=="string"||!message.trim()||message.length>2000)return res.status(400).json({erro:"Digite uma mensagem de até 2.000 caracteres."});
  const base=(process.env.DIGISAC_API_BASE_URL||"").replace(/\/+$/,""),token=process.env.DIGISAC_API_TOKEN;
  if(!base||!token)return res.status(503).json({erro:"Integração não configurada."});
  const url=new URL(base+"/messages");
  if(url.protocol!=="https:"||url.hostname!=="rodrinoxpro.digisac.app"||!url.pathname.startsWith("/api/v1/"))return res.status(503).json({erro:"Destino DigiSac inválido."});
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
  try{
    const upstream=await fetch(url,{method:"POST",headers:{Authorization:"Bearer "+token,Accept:"application/json","Content-Type":"application/json"},body:JSON.stringify({text:message.trim(),type:"chat",contactId,userId,origin:"user"}),signal:controller.signal,redirect:"error"});
    if(!upstream.ok)return res.status(502).json({erro:"DigiSac não confirmou o envio.",codigo:upstream.status});
    const raw=await upstream.text();
    let result={};try{result=JSON.parse(raw)}catch{}
    return res.json({enviado:true,id:result?.id||result?.data?.id||null});
  }catch(err){
    return res.status(502).json({erro:err.name==="AbortError"?"Tempo limite: confira na DigiSac antes de tentar novamente.":"Falha de comunicação: confira na DigiSac antes de tentar novamente."});
  }finally{clearTimeout(timeout)}
}));


r.get("/api/atendimento/contato/:id",exigir("painel"),wrap(async(req,res)=>{res.setHeader("Cache-Control","no-store");if(req.usuario.perfil!=="admin")return res.status(403).json({erro:"Acesso restrito ao administrador."});const id=String(req.params.id||"");if(!/^[a-f0-9-]{36}$/i.test(id))return res.status(400).json({erro:"Contato inválido."});try{res.json(await chamarDigiSac("/contacts/"+encodeURIComponent(id)+"?include[0]=tags"))}catch(e){res.status(e.status||502).json({erro:e.message||"Falha ao consultar contato."})}}));
r.post("/api/atendimento/transferir",exigir("painel"),wrap(async(req,res)=>{res.setHeader("Cache-Control","no-store");if(req.usuario.perfil!=="admin")return res.status(403).json({erro:"Somente administradores podem transferir atendimentos."});const {contactId,departmentId,userId,byUserId,comments=""}=req.body||{};if(!/^[a-f0-9-]{36}$/i.test(String(contactId||""))||!/^[a-f0-9-]{36}$/i.test(String(departmentId||""))||!(userId==null||userId===""||/^[a-f0-9-]{36}$/i.test(String(userId)))||(byUserId&&!/^[a-f0-9-]{36}$/i.test(String(byUserId))))return res.status(400).json({erro:"Selecione um setor e um atendente válido."});if(typeof comments!=="string"||comments.length>500)return res.status(400).json({erro:"Comentário inválido."});try{const data=await chamarDigiSac("/contacts/"+encodeURIComponent(contactId)+"/ticket/transfer","POST",{departmentId,...(userId?{userId}:{}),comments:comments.trim(),...(byUserId?{byUserId}:{})});await auditar(req.usuario.id,"digisac_transferencia",JSON.stringify({contactId,departmentId,userId:userId||null}),req.ip);res.json({ok:true,data})}catch(e){res.status(e.status||502).json({erro:e.message||"Não foi possível transferir o atendimento."})}}));
r.post("/api/atendimento/etiquetas",exigir("painel"),wrap(async(req,res)=>{res.setHeader("Cache-Control","no-store");if(req.usuario.perfil!=="admin")return res.status(403).json({erro:"Somente administradores podem alterar etiquetas."});const {contactId,tagIds,byUserId}=req.body||{};if(!/^[a-f0-9-]{36}$/i.test(String(contactId||""))||!Array.isArray(tagIds)||tagIds.length>50||!tagIds.every(x=>/^[a-f0-9-]{36}$/i.test(String(x)))||(byUserId&&!/^[a-f0-9-]{36}$/i.test(String(byUserId))))return res.status(400).json({erro:"Contato ou etiquetas inválidos."});try{const data=await chamarDigiSac("/contacts/"+encodeURIComponent(contactId),"PUT",{tagIds});await auditar(req.usuario.id,"digisac_etiquetas",JSON.stringify({contactId,tagIds}),req.ip);res.json({ok:true,data})}catch(e){res.status(e.status||502).json({erro:e.message||"Não foi possível atualizar as etiquetas."})}}));
r.post("/api/atendimento/finalizar",exigir("painel"),wrap(async(req,res)=>{res.setHeader("Cache-Control","no-store");if(req.usuario.perfil!=="admin")return res.status(403).json({erro:"Somente administradores podem finalizar atendimentos."});const {contactId,ticketTopicIds=[],byUserId,comments=""}=req.body||{};if(!/^[a-f0-9-]{36}$/i.test(String(contactId||""))||!Array.isArray(ticketTopicIds)||ticketTopicIds.length>10||!ticketTopicIds.every(x=>/^[a-f0-9-]{36}$/i.test(String(x)))||(byUserId&&!/^[a-f0-9-]{36}$/i.test(String(byUserId))))return res.status(400).json({erro:"Contato ou assunto inválido."});if(typeof comments!=="string"||comments.length>500)return res.status(400).json({erro:"Comentário inválido."});try{const data=await chamarDigiSac("/contacts/"+encodeURIComponent(contactId)+"/ticket/close","POST",{ticketTopicIds,comments:comments.trim(),...(byUserId?{byUserId}:{})});await auditar(req.usuario.id,"digisac_atendimento_finalizado",JSON.stringify({contactId,ticketTopicIds}),req.ip);res.json({ok:true,data})}catch(e){res.status(e.status||502).json({erro:e.message||"Não foi possível finalizar o atendimento."})}}));

// Diagnóstico de esquema sem conteúdo pessoal, para mapear os campos da API DigiSac.
r.get("/api/atendimento/diagnostico", exigir("painel"), wrap(async (req,res)=>{
  res.setHeader("Cache-Control","no-store");
  if(req.usuario.perfil!=="admin")return res.status(403).json({erro:"Acesso restrito."});
  const base=(process.env.DIGISAC_API_BASE_URL||"").replace(/\/+$/,"");
  const token=process.env.DIGISAC_API_TOKEN;
  if(!base||!token)return res.status(503).json({erro:"Integração não configurada."});
  const url=new URL(base+"/tickets");
  if(url.protocol!=="https:"||url.hostname!=="rodrinoxpro.digisac.app"||!url.pathname.startsWith("/api/v1/"))return res.status(503).json({erro:"Destino inválido."});
  url.searchParams.set("perPage","2");
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),9000);
  try{
    const upstream=await fetch(url,{headers:{Authorization:"Bearer "+token,Accept:"application/json"},signal:controller.signal,redirect:"error"});
    if(!upstream.ok)return res.status(502).json({erro:"Falha na consulta.",codigo:upstream.status});
    const payload=await upstream.json();
    const list=Array.isArray(payload)?payload:Array.isArray(payload?.data)?payload.data:Array.isArray(payload?.rows)?payload.rows:Array.isArray(payload?.items)?payload.items:[];
    const structure=o=>o&&typeof o==="object"&&!Array.isArray(o)?Object.fromEntries(Object.entries(o).map(([k,v])=>[k,v===null?"null":Array.isArray(v)?"array":typeof v==="object"?Object.keys(v):typeof v])):{};
    res.json({camposResposta:structure(payload),quantidadeAmostra:list.length,camposChamado:list.slice(0,2).map(structure)});
  }catch(e){res.status(502).json({erro:"Diagnóstico indisponível."})}finally{clearTimeout(timeout)}
}));

// Permissões de navegação: sessões reais e alterações exclusivas do administrador.
r.use("/api/menu", menuPermissoesRouter);
r.use("/api/email-corporativo", emailCorporativoRouter);
r.use("/api/access-profiles", accessProfilesRouter);
r.use("/api/tasks-official", tasksRouter);
r.use("/api/atendimento/rodrinox", atendimentoRodrinoxRouter);
r.use("/api/whatsapp-meta", whatsappMetaRouter);

// Diretório interno: apenas usuários ativos, e-mail corporativo e setor cadastrado.
// Não expõe cargos, perfis, telefones, senhas ou dados administrativos.
// Diretório de responsáveis para o protótipo de tarefas: IDs reais e usuários ativos.
// Apenas campos necessários à delegação; requer sessão autenticada.
r.get("/api/tarefas/responsaveis", exigir("painel"), wrap(async (_req, res) => {
  const rows = await q(`SELECT u.id, u.nome, u.email, s.nome AS departamento
    FROM usuarios u LEFT JOIN setores s ON s.id=u.setor_id
    WHERE u.ativo=1 AND LOWER(u.email) LIKE '%@rodrinoxpro.com.br'
    ORDER BY s.nome, u.nome`);
  res.json(rows.map(({id,nome,email,departamento})=>({id,nome,email,departamento:departamento||"Sem departamento"})));
}));

r.get("/api/contatos", exigir("painel"), wrap(async (_req, res) => {
  const contatos = await q(`SELECT u.nome, u.email, s.nome AS departamento
    FROM usuarios u LEFT JOIN setores s ON s.id = u.setor_id
    WHERE u.ativo = 1 AND LOWER(u.email) LIKE '%@rodrinoxpro.com.br'
    ORDER BY s.nome, u.nome`);
  res.json(contatos.map(({ nome, email, departamento }) => ({
    nome, email, departamento: departamento || "Sem departamento cadastrado"
  })));
}));

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
