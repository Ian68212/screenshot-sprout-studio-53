import { Router } from "express";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile, readFile, unlink, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import multer from "multer";
import { fileTypeFromBuffer } from "file-type";
import { q, auditar } from "./db.js";
import { exigir } from "./auth.js";

// Resolve caminhos absolutos a partir do módulo, não apenas do cwd do processo.
// Mantém compatibilidade com instalações antigas que gravaram em ./storage/site
// a partir da raiz do repositório ou da pasta portal.
export const mediaRouter = Router();
const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const configuredDir = process.env.SITE_UPLOAD_DIR
  ? path.resolve(process.env.SITE_UPLOAD_DIR)
  : null;
const storageDirs = [...new Set([
  configuredDir,
  path.resolve(moduleDir, "..", "storage", "site"),
  path.resolve(process.cwd(), "storage", "site"),
  path.resolve(process.cwd(), "portal", "storage", "site"),
  path.resolve(moduleDir, "..", "..", "storage", "site"),
].filter(Boolean))];

async function localizarArquivo(nome) {
  for (const dir of storageDirs) {
    const arquivo = path.join(dir, nome);
    try {
      await access(arquivo);
      return { dir, arquivo };
    } catch (e) {
      if (e?.code !== "ENOENT" && e?.code !== "ENOTDIR") throw e;
    }
  }
  return null;
}

// Se os arquivos antigos estiverem em um dos caminhos legados, continua usando
// essa pasta. Assim, a implantação não cria uma biblioteca vazia em outro local.
async function escolherDiretorioDeUpload() {
  const midias = await q("SELECT caminho FROM site_midias ORDER BY id DESC LIMIT 200");
  for (const midia of midias) {
    if (!/^[a-f0-9-]{36}\.(jpg|png|webp)$/.test(midia.caminho || "")) continue;
    const encontrado = await localizarArquivo(midia.caminho);
    if (encontrado) return encontrado.dir;
  }
  return configuredDir || path.resolve(moduleDir, "..", "storage", "site");
}
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
    const dir = await escolherDiretorioDeUpload();
    await mkdir(dir,{recursive:true,mode:0o700});
    await writeFile(path.join(dir,nome),req.file.buffer,{flag:"wx",mode:0o600});
    const out = await q("INSERT INTO site_midias (caminho,nome_original,mime,tamanho,descricao,criado_por) VALUES (?,?,?,?,?,?)",
      [nome,String(req.file.originalname).slice(0,255),tipo.mime,req.file.size,descricao,req.usuario.id]);
    await auditar(req.usuario.id,"site_enviou_midia",String(out.insertId),req.ip);
    res.status(201).json({id:out.insertId,nome_original:req.file.originalname});
  } catch(e) {
    if(nome) {
      const dir = await escolherDiretorioDeUpload().catch(() => configuredDir || path.resolve(moduleDir, "..", "storage", "site"));
      await unlink(path.join(dir,nome)).catch(()=>{});
    }
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
    const arquivo = await localizarArquivo(m.caminho);
    if (!arquivo) {
      console.error("[site-media] Arquivo de mídia ausente em todos os diretórios", {
        id, diretorios: storageDirs,
      });
      return res.status(404).json({
        erro: "Arquivo físico não encontrado nos diretórios de armazenamento verificados.",
        codigo: "ARQUIVO_AUSENTE",
      });
    }
    const buffer = await readFile(arquivo.arquivo);
    res.set("Content-Type",m.mime);
    res.set("Cache-Control","private, no-store");
    res.set("X-Content-Type-Options","nosniff");
    res.send(buffer);
  } catch(e) {
    console.error("[site-media] Falha ao entregar imagem", {
      id: req.params.id,
      code: e?.code || "UNKNOWN",
      message: e?.message || String(e),
    });
    if (e?.code === "ENOENT") {
      return res.status(404).json({
        erro: "Arquivo físico não encontrado na pasta de armazenamento configurada.",
        codigo: "ARQUIVO_AUSENTE",
      });
    }
    if (e?.code === "EACCES" || e?.code === "EPERM") {
      return res.status(500).json({
        erro: "O servidor não tem permissão para ler o arquivo de imagem.",
        codigo: "PERMISSAO_ARQUIVO",
      });
    }
    next(e);
  }
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

    // Protege também imagens selecionadas nos banners da página inicial.
    const [conteudoEmUso] = await q(
      "SELECT chave FROM site_conteudos WHERE corpo LIKE ? LIMIT 1",
      ['%"imagem_id":' + id + '%']
    );
    if (conteudoEmUso) {
      return res.status(409).json({
        erro:"Esta imagem está vinculada ao conteúdo " + conteudoEmUso.chave +
          ". Substitua a imagem no editor antes de excluí-la."
      });
    }

    // Valida o nome do arquivo antes de acessar o armazenamento.
    if (!/^[a-f0-9-]{36}\.(jpg|png|webp)$/.test(m.caminho)) {
      return res.status(400).json({
        erro:"Caminho de imagem inválido"
      });
    }

    await q("DELETE FROM site_midias WHERE id=?", [id]);

    const arquivo = await localizarArquivo(m.caminho);
    if (arquivo) {
      await unlink(arquivo.arquivo).catch(e => {
        if (e.code !== "ENOENT") throw e;
      });
    }

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

