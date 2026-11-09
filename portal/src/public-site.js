import { Router } from "express";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { q } from "./db.js";
import { SITE_MEDIA_DIR } from "./media-storage.js";

export const publicSiteRouter = Router();
const IMAGE_NAME = /^[a-f0-9-]{36}\.(jpg|png|webp)$/;
const ALLOWED_ORIGIN = process.env.SITE_PUBLIC_ORIGIN || "https://rodrinoxpro.com.br";

// API somente de leitura para o site institucional. Nunca expõe rascunhos.
publicSiteRouter.use((req, res, next) => {
  res.set("Cross-Origin-Resource-Policy", "cross-origin");
  const origin = req.get("Origin");
  if (origin === ALLOWED_ORIGIN) {
    res.set("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
    res.set("Vary", "Origin");
    res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Accept, Content-Type");
  }
  if (req.method === "OPTIONS") return res.sendStatus(origin === ALLOWED_ORIGIN ? 204 : 403);
  next();
});

publicSiteRouter.get("/", async (_req, res, next) => {
  try {
    const [itens, conteudos] = await Promise.all([
      q(`SELECT i.id,i.tipo,i.slug,i.titulo,i.resumo,i.descricao,i.ordem,
                 m.id AS imagem_id,m.mime AS imagem_mime
          FROM site_itens i
          LEFT JOIN site_midias m ON m.id=i.imagem_id
          WHERE i.status='publicado'
          ORDER BY i.tipo,i.ordem,i.id`),
      q("SELECT chave,titulo,corpo,atualizado_em FROM site_conteudos WHERE status='publicado' ORDER BY chave"),
    ]);
    res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    res.json({ itens, conteudos });
  } catch (error) { next(error); }
});

publicSiteRouter.get("/midias/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ erro: "ID inválido" });
    const [media] = await q(
      `SELECT m.caminho,m.mime
         FROM site_midias m
        WHERE m.id=? AND (
          EXISTS (SELECT 1 FROM site_itens i WHERE i.imagem_id=m.id AND i.status='publicado')
          OR EXISTS (
            SELECT 1 FROM site_conteudos c
             WHERE c.status='publicado' AND (c.corpo LIKE ? OR c.corpo LIKE ?)
          )
        )
        LIMIT 1`,
      [id, '%"imagem_id":' + id + ',%', '%"imagem_id":' + id + '}%'],
    );
    if (!media || !IMAGE_NAME.test(media.caminho)) return res.status(404).json({ erro: "Imagem pública não encontrada" });
    const buffer = await readFile(path.join(SITE_MEDIA_DIR, media.caminho));
    res.set("Content-Type", media.mime);
    res.set("X-Content-Type-Options", "nosniff");
    res.set("Cache-Control", "public, max-age=3600");
    res.send(buffer);
  } catch (error) {
    if (error?.code === "ENOENT") return res.status(404).json({ erro: "Arquivo não encontrado" });
    next(error);
  }
});
