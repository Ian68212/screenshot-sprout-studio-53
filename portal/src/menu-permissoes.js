import { Router } from "express";
import { q, auditar } from "./db.js";
import { exigir } from "./auth.js";

// Controle de VISIBILIDADE da navegação. Autorizações de APIs permanecem independentes.
export const MENU_KEYS = Object.freeze(["documentos","pcp","tarefas","gestao-empresarial","almoxarifado","qualidade","rh","seguranca","comunicados","treinamentos","ferramentas","aplicativos","contatos","suporte","link.email","link.drive","link.cameras","link.bling","admin.visao","admin.permissoes","admin.organograma","admin.pessoas","admin.candidaturas","admin.site"]);
const ADMIN_KEYS = new Set(["admin.visao","admin.permissoes","admin.organograma","admin.pessoas","admin.candidaturas","admin.site"]);
const SCOPES = new Set(["perfil","setor","cargo","usuario"]);
const router = Router();
let schemaPromise;
function schema() {
  if (!schemaPromise) schemaPromise = q(`CREATE TABLE IF NOT EXISTS menu_permissoes (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    escopo VARCHAR(20) NOT NULL,
    alvo VARCHAR(64) NOT NULL,
    botao VARCHAR(64) NOT NULL,
    permitido TINYINT(1) NOT NULL,
    atualizado_por BIGINT NULL,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_menu_escopo_alvo_botao (escopo, alvo, botao)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`).catch(e => { schemaPromise = null; throw e; });
  return schemaPromise;
}
function target(u, scope) {
  if (scope === "perfil") return String(u.perfil);
  if (scope === "setor") return u.setor_id == null ? null : String(u.setor_id);
  if (scope === "cargo") return u.cargo_id == null ? null : String(u.cargo_id);
  return String(u.id);
}
function resolve(u, rows) {
  const visible = Object.fromEntries(MENU_KEYS.map(k => [k, !ADMIN_KEYS.has(k) || u.perfil === "admin"]));
  // Mais específico prevalece: perfil < setor < cargo < usuário.
  for (const scope of ["perfil","setor","cargo","usuario"]) {
    const alvo = target(u, scope);
    if (alvo == null) continue;
    for (const row of rows) if (row.escopo === scope && row.alvo === alvo && Object.hasOwn(visible,row.botao) && (!ADMIN_KEYS.has(row.botao) || u.perfil === "admin")) visible[row.botao] = !!row.permitido;
  }
  // Administradores sempre conservam acesso ao menu e à central de controle.
  if (u.perfil === "admin") visible["admin.permissoes"] = true;
  return visible;
}
router.get("/minhas", exigir("painel"), async (req,res,next) => {
  try { await schema(); const rows = await q("SELECT escopo,alvo,botao,permitido FROM menu_permissoes"); res.set("Cache-Control","no-store").json({ inicio:true, botoes:resolve(req.usuario,rows) }); }
  catch(e) { next(e); }
});
router.get("/regras", exigir("admin.usuarios"), async (_req,res,next) => {
  try { await schema(); res.set("Cache-Control","no-store").json({ botoes:MENU_KEYS, regras:await q("SELECT escopo,alvo,botao,permitido FROM menu_permissoes ORDER BY escopo,alvo,botao") }); }
  catch(e) { next(e); }
});
router.put("/regras", exigir("admin.usuarios"), async (req,res,next) => {
  try {
    const { escopo, alvo, botoes } = req.body || {};
    if (!SCOPES.has(escopo) || typeof alvo !== "string" || !/^[a-zA-Z0-9_-]{1,64}$/.test(alvo) || !botoes || typeof botoes !== "object" || Array.isArray(botoes))
      return res.status(400).json({ erro:"Escopo, alvo ou regras inválidos." });
    if (escopo === "perfil" && !["admin","gestor","colaborador"].includes(alvo))
      return res.status(400).json({ erro:"Perfil inválido." });
    if (escopo !== "perfil" && (!/^\d+$/.test(alvo) || Number(alvo) < 1))
      return res.status(400).json({ erro:"Identificador inválido." });
    
    const keys = Object.keys(botoes);
    if (!keys.length || keys.some(k => !MENU_KEYS.includes(k) || k === "admin.permissoes" && botoes[k] === false || (botoes[k] !== true && botoes[k] !== false && botoes[k] !== null)))
      return res.status(400).json({ erro:"Envie somente botões válidos com true, false ou null (herdar)." });
    if (escopo === "usuario") {
      const [u] = await q("SELECT id,perfil FROM usuarios WHERE id=?", [Number(alvo)]);
      if (!u) return res.status(404).json({ erro:"Colaborador não encontrado." });
      
    }
    if (escopo === "setor" || escopo === "cargo") {
      const table = escopo === "setor" ? "setores" : "cargos";
      const [record] = await q(`SELECT id FROM ${table} WHERE id=?`, [Number(alvo)]);
      if (!record) return res.status(404).json({ erro:"Setor ou cargo não encontrado." });
    }
    // Atribuições administrativas nunca podem ser concedidas por regras de menu.
    if (keys.some(k => ADMIN_KEYS.has(k)) && escopo === "perfil" && alvo !== "admin") return res.status(403).json({ erro:"Itens administrativos são exclusivos do perfil admin." });
    if (keys.some(k => ADMIN_KEYS.has(k)) && escopo === "usuario") {
      const [alvoUsuario] = await q("SELECT perfil FROM usuarios WHERE id=?", [Number(alvo)]);
      if (alvoUsuario?.perfil !== "admin") return res.status(403).json({ erro:"Itens administrativos só podem ser configurados para administradores." });
    }
    if (keys.some(k => ADMIN_KEYS.has(k)) && (escopo === "setor" || escopo === "cargo")) return res.status(403).json({ erro:"Itens administrativos devem ser configurados por administrador." });
    await schema();
    for (const key of keys) {
      if (botoes[key] === null) await q("DELETE FROM menu_permissoes WHERE escopo=? AND alvo=? AND botao=?", [escopo,alvo,key]);
      else await q(`INSERT INTO menu_permissoes (escopo,alvo,botao,permitido,atualizado_por)
        VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE permitido=VALUES(permitido), atualizado_por=VALUES(atualizado_por)`,
        [escopo,alvo,key,botoes[key]?1:0,req.usuario.id]);
    }
    await auditar(req.usuario.id,"atualizou_permissoes_menu",`${escopo}:${alvo} - ${keys.join(",")}`,req.ip);
    res.json({ ok:true });
  } catch(e) { next(e); }
});
export default router;
