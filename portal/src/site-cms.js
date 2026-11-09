import { Router } from "express";
import { q, auditar } from "./db.js";
import { exigir } from "./auth.js";

// API administrativa: nunca disponibilizar escrita sem sessão e permissão.
// O site institucional consulta conteúdo publicado pela API pública somente de leitura.
export const siteRouter = Router();
const TIPOS = new Set(["banner", "servico", "projeto", "galeria"]);
const STATUS = new Set(["rascunho", "publicado"]);
const limpar = (v, max) => String(v ?? "").trim().slice(0, max);
const inteiro = (v) => Number.isSafeInteger(Number(v)) && Number(v) > 0 ? Number(v) : null;

siteRouter.get("/itens", exigir("site.editar"), async (req, res, next) => {
  try {
    const tipo = req.query.tipo;
    if (tipo && !TIPOS.has(tipo)) return res.status(400).json({ erro: "Tipo inválido" });
    const sql = "SELECT id,tipo,slug,titulo,resumo,descricao,imagem_id,ordem,status,atualizado_em FROM site_itens" +
      (tipo ? " WHERE tipo=?" : "") + " ORDER BY tipo,ordem,id";
    res.json(await q(sql, tipo ? [tipo] : []));
  } catch (e) { next(e); }
});

siteRouter.post("/itens", exigir("site.editar"), async (req, res, next) => {
  try {
    const { tipo, status = "rascunho" } = req.body || {};
    const slug = limpar(req.body?.slug, 160);
    const titulo = limpar(req.body?.titulo, 255);
    if (!TIPOS.has(tipo) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !titulo || !STATUS.has(status))
      return res.status(400).json({ erro: "Tipo, slug, título ou status inválido" });
    if (status === "publicado" && req.usuario.perfil !== "admin")
      return res.status(403).json({ erro: "Publicação exclusiva de administrador" });
    const ordem = Number(req.body?.ordem ?? 0);
    if (!Number.isSafeInteger(ordem) || ordem < 0) return res.status(400).json({ erro: "Ordem inválida" });
    const imagemId = req.body?.imagem_id == null ? null : inteiro(req.body.imagem_id);
    if (req.body?.imagem_id != null && !imagemId) return res.status(400).json({ erro: "Imagem inválida" });
    const out = await q(
      "INSERT INTO site_itens (tipo,slug,titulo,resumo,descricao,imagem_id,ordem,status,atualizado_por) VALUES (?,?,?,?,?,?,?,?,?)",
      [tipo,slug,titulo,limpar(req.body?.resumo, 5000),limpar(req.body?.descricao, 30000),imagemId,ordem,status,req.usuario.id]
    );
    await auditar(req.usuario.id, "site_criou_item", String(out.insertId), req.ip);
    res.status(201).json({ id: out.insertId });
  } catch (e) { next(e); }
});

siteRouter.patch("/itens/:id", exigir("site.editar"), async (req, res, next) => {
  try {
    const id = inteiro(req.params.id);
    if (!id) return res.status(400).json({ erro: "ID inválido" });
    const campos = ["titulo", "resumo", "descricao", "ordem", "status", "imagem_id"];
    const updates = []; const values = [];
    for (const campo of campos) {
      if (!Object.prototype.hasOwnProperty.call(req.body || {}, campo)) continue;
      let valor = req.body[campo];
      if (campo === "status") {
        if (!STATUS.has(valor)) return res.status(400).json({ erro: "Status inválido" });
        if (valor === "publicado" && req.usuario.perfil !== "admin")
          return res.status(403).json({ erro: "Publicação exclusiva de administrador" });
      } else if (campo === "ordem") {
        if (!Number.isSafeInteger(Number(valor)) || Number(valor) < 0) return res.status(400).json({ erro: "Ordem inválida" });
        valor = Number(valor);
      } else if (campo === "imagem_id") {
        valor = valor == null ? null : inteiro(valor);
        if (req.body[campo] != null && !valor) return res.status(400).json({ erro: "Imagem inválida" });
      } else {
        valor = limpar(valor, campo === "descricao" ? 30000 : campo === "resumo" ? 5000 : 255);
        if (campo === "titulo" && !valor) return res.status(400).json({ erro: "Título obrigatório" });
      }
      updates.push(campo + "=?"); values.push(valor);
    }
    if (!updates.length) return res.status(400).json({ erro: "Nenhum campo editável" });
    // Editor não pode alterar um item já publicado; evita edição pública sem aprovação.
    const [atual] = await q("SELECT status FROM site_itens WHERE id=?", [id]);
    if (!atual) return res.status(404).json({ erro: "Item não encontrado" });
    if (atual.status === "publicado" && req.usuario.perfil !== "admin")
      return res.status(403).json({ erro: "Somente administrador altera itens publicados" });
    values.push(req.usuario.id,id);
    await q("UPDATE site_itens SET " + updates.join(",") + ",atualizado_por=? WHERE id=?", values);
    await auditar(req.usuario.id, "site_editou_item", String(id), req.ip);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

siteRouter.delete("/itens/:id", exigir("site.editar"), async (req, res, next) => {
  try {
    const id = inteiro(req.params.id);
    if (!id) return res.status(400).json({ erro: "ID inválido" });
    const [atual] = await q("SELECT id,titulo,status FROM site_itens WHERE id=?", [id]);
    if (!atual) return res.status(404).json({ erro: "Item não encontrado" });
    if (atual.status === "publicado" && req.usuario.perfil !== "admin")
      return res.status(403).json({ erro: "Somente administrador exclui itens publicados" });
    await q("DELETE FROM site_itens WHERE id=?", [id]);
    await auditar(req.usuario.id, "site_excluiu_item", String(id) + ": " + atual.titulo, req.ip);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

siteRouter.get("/conteudos", exigir("site.editar"), async (_req, res, next) => {
  try { res.json(await q("SELECT chave,titulo,corpo,status,atualizado_em FROM site_conteudos ORDER BY chave")); }
  catch (e) { next(e); }
});

siteRouter.put("/conteudos/:chave", exigir("site.editar"), async (req, res, next) => {
  try {
    const chave = req.params.chave;
    const status = req.body?.status || "rascunho";
    if (!/^[a-z0-9._-]{1,160}$/.test(chave) || !STATUS.has(status))
      return res.status(400).json({ erro: "Chave ou status inválido" });
    if (status === "publicado" && req.usuario.perfil !== "admin")
      return res.status(403).json({ erro: "Publicação exclusiva de administrador" });
    const [atual] = await q("SELECT status FROM site_conteudos WHERE chave=?", [chave]);
    if (atual?.status === "publicado" && req.usuario.perfil !== "admin")
      return res.status(403).json({ erro: "Somente administrador altera conteúdo publicado" });
    await q("INSERT INTO site_conteudos (chave,titulo,corpo,status,atualizado_por) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE titulo=VALUES(titulo),corpo=VALUES(corpo),status=VALUES(status),atualizado_por=VALUES(atualizado_por)",
      [chave,limpar(req.body?.titulo,255),limpar(req.body?.corpo,30000),status,req.usuario.id]);
    await auditar(req.usuario.id, "site_editou_conteudo", chave, req.ip);
    res.json({ ok: true });
  } catch (e) { next(e); }
});
