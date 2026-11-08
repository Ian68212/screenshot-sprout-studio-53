import { Router } from "express";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile, readFile, unlink } from "node:fs/promises";
import path from "node:path";
import multer from "multer";
import { fileTypeFromBuffer } from "file-type";
import { q, auditar } from "./db.js";
import { exigir } from "./auth.js";

// Imagens ficam fora de portal/public e são acessíveis somente por sessão autorizada.
// Para produção, planejar CDN/servidor público de mídia e política de publicação.
export const mediaRouter = Router();
const DIR = path.resolve(process.env.SITE_UPLOAD_DIR || "./storage/site");
const tipos = new Map([["image/jpeg","jpg"],["image/png","png"],["image/webp","webp"]]);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } });
const valido = (v) => Number.isSafeInteger(Number(v)) && Number(v) > 0 ? Number(v) : null;

mediaRouter.get("/", exigir("site.editar"), async (_req,res,next) => {
  try { res.json(await q("SELECT id,nome_original,mime,tamanho,descricao,criado_em FROM site_midias ORDER BY id DESC LIMIT 200")); }
  catch (e) { next(e); }
});

mediaRouter.post("/", exigir("site.editar"), upload.single("imagem"), async (req,res,next) => {
  let nome;
  try {
    if (!req.file) return res.status(400).json({ erro: "Selecione uma imagem" });
    const tipo = await fileTypeFromBuffer(req.file.buffer);
    if (!tipo || !tipos.has(tipo.mime)) return res.status(415).json({ erro: "Envie JPG, PNG ou WebP válido" });
    const descricao = String(req.body?.descricao || "").trim().slice(0,255);
    nome = randomUUID() + "." + tipos.get(tipo.mime);
    await mkdir(DIR,{recursive:true,mode:0o700});
    await writeFile(path.join(DIR,nome),req.file.buffer,{flag:"wx",mode:0o600});
    const out = await q("INSERT INTO site_midias (caminho,nome_original,mime,tamanho,descricao,criado_por) VALUES (?,?,?,?,?,?)",
      [nome,String(req.file.originalname).slice(0,255),tipo.mime,req.file.size,descricao,req.usuario.id]);
    await auditar(req.usuario.id,"site_enviou_midia",String(out.insertId),req.ip);
    res.status(201).json({id:out.insertId,nome_original:req.file.originalname});
  } catch(e) {
    if(nome) await unlink(path.join(DIR,nome)).catch(()=>{});
    next(e);
  }
});

mediaRouter.get("/:id/arquivo", exigir("site.editar"), async (req,res,next) => {
  try {
    const id = valido(req.params.id);
    if (!id) return res.status(400).json({ erro:"ID inválido" });
    const [m] = await q("SELECT caminho,mime FROM site_midias WHERE id=?",[id]);
    if (!m || !/^[a-f0-9-]{36}\.(jpg|png|webp)$/.test(m.caminho))
      return res.status(404).json({ erro:"Imagem não encontrada" });
    const buffer = await readFile(path.join(DIR,m.caminho));
    res.set("Content-Type",m.mime);
    res.set("Cache-Control","private, no-store");
    res.set("X-Content-Type-Options","nosniff");
    res.send(buffer);
  } catch(e) { next(e); }
});

mediaRouter.delete("/:id", exigir("site.editar"), async (req,res,next) => {
  try {
    const id = valido(req.params.id);

    if (!id) {
      return res.status(400).json({ erro:"ID inválido" });
    }

    const [m] = await q(
      "SELECT id,caminho FROM site_midias WHERE id=?",
      [id]
    );

    if (!m) {
      return res.status(404).json({ erro:"Imagem não encontrada" });
    }

    // Impede excluir imagens que já estão sendo utilizadas.
    const [uso] = await q(
      "SELECT id,titulo FROM site_itens WHERE imagem_id=? LIMIT 1",
      [id]
    );

    if (uso) {
      return res.status(409).json({
        erro:"Esta imagem está sendo utilizada em: " +
          uso.titulo +
          ". Substitua a imagem antes de excluí-la."
      });
    }

    // Valida o nome do arquivo antes de acessar o armazenamento.
    if (!/^[a-f0-9-]{36}\.(jpg|png|webp)$/.test(m.caminho)) {
      return res.status(400).json({
        erro:"Caminho de imagem inválido"
      });
    }

    await q("DELETE FROM site_midias WHERE id=?", [id]);

    await unlink(path.join(DIR,m.caminho)).catch(e => {
      if (e.code !== "ENOENT") throw e;
    });

    await auditar(
      req.usuario.id,
      "site_excluiu_midia",
      String(id),
      req.ip
    );

    res.json({
      ok:true,
      mensagem:"Imagem excluída com sucesso"
    });

  } catch(e) {
    next(e);
  }
});

