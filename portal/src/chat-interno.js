import { Router, raw } from "express";
import crypto from "node:crypto";
import { q } from "./db.js";
import { exigir } from "./auth.js";
import multer from "multer";
import { uploadDriveFile, readDriveFile, deleteDriveFile, startResumableDriveUpload, appendResumableDriveChunk, streamDriveFile } from "./drive-storage.js";

const router = Router();
const attachmentUpload = multer({storage:multer.memoryStorage(),limits:{fileSize:10*1024*1024,files:1},fileFilter(_req,file,cb){
  const allowed=/^(application\/(pdf|msword|vnd\.openxmlformats-officedocument\.(wordprocessingml\.document|spreadsheetml\.sheet|presentationml\.presentation)|vnd\.ms-excel|vnd\.ms-powerpoint|zip|x-zip-compressed|octet-stream)|image\/(jpeg|png|webp)|text\/plain)$/;
  if(!allowed.test(file.mimetype))return cb(Object.assign(new Error("Formato não permitido. Envie PDF, Office, imagem, TXT ou ZIP."),{status:400}));
  cb(null,true);
}});
function safeName(name){return String(name||"documento").replace(/[\r\n\\/"]/g,"_").slice(0,180)||"documento";}

router.use(exigir("painel"));
let ready;
async function schema() {
  if (!ready) ready = (async () => {
    await q(`CREATE TABLE IF NOT EXISTS chat_interno_mensagens (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      remetente_id BIGINT NOT NULL,
      destinatario_id BIGINT NOT NULL,
      texto TEXT NOT NULL,
      criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      lido_em TIMESTAMP NULL DEFAULT NULL,
      INDEX ix_destinatario (destinatario_id, remetente_id, id),
      INDEX ix_remetente (remetente_id, destinatario_id, id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await q(`CREATE TABLE IF NOT EXISTS chat_interno_anexos (
      mensagem_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
      drive_id VARCHAR(160) NOT NULL,
      nome VARCHAR(200) NOT NULL,
      mime VARCHAR(150) NOT NULL,
      tamanho BIGINT UNSIGNED NOT NULL,
      criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX ix_drive_id (drive_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await q(`CREATE TABLE IF NOT EXISTS chat_interno_uploads (
      id CHAR(36) PRIMARY KEY,
      remetente_id BIGINT NOT NULL,
      destinatario_id BIGINT NOT NULL,
      nome VARCHAR(200) NOT NULL,
      mime VARCHAR(150) NOT NULL,
      tamanho BIGINT UNSIGNED NOT NULL,
      offset_atual BIGINT UNSIGNED NOT NULL DEFAULT 0,
      sessao_url TEXT NOT NULL,
      criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX ix_upload_remetente (remetente_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await q(`CREATE TABLE IF NOT EXISTS chat_interno_presenca (
      usuario_id BIGINT NOT NULL PRIMARY KEY,
      ultimo_acesso TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX ix_ultimo_acesso (ultimo_acesso)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  })().catch(e => { ready = null; throw e; });
  return ready;
}
const fail = (fn) => async (req,res,next) => { try { await schema(); await fn(req,res); } catch(e) { next(e); } };
router.post("/presenca", fail(async (req,res) => {
  await q("INSERT INTO chat_interno_presenca (usuario_id,ultimo_acesso) VALUES (?,NOW()) ON DUPLICATE KEY UPDATE ultimo_acesso=NOW()",[req.usuario.id]);
  res.set("Cache-Control","no-store").json({ok:true});
}));
router.get("/pessoas", fail(async (req,res) => {
  const pessoas = await q("SELECT id,nome,setor_id,foto_url FROM usuarios WHERE ativo=1 AND id<>? ORDER BY nome", [req.usuario.id]);
  res.set("Cache-Control","no-store").json({pessoas});
}));
router.get("/conversas", fail(async (req,res) => {
  const id=req.usuario.id;
  const conversas=await q(`SELECT u.id,u.nome,u.foto_url,s.nome AS setor,
    (SELECT m.texto FROM chat_interno_mensagens m WHERE (m.remetente_id=? AND m.destinatario_id=u.id) OR (m.destinatario_id=? AND m.remetente_id=u.id) ORDER BY m.id DESC LIMIT 1) AS ultima,
    (SELECT m.criado_em FROM chat_interno_mensagens m WHERE (m.remetente_id=? AND m.destinatario_id=u.id) OR (m.destinatario_id=? AND m.remetente_id=u.id) ORDER BY m.id DESC LIMIT 1) AS ultima_em,
    (SELECT COUNT(*) FROM chat_interno_mensagens m WHERE m.remetente_id=u.id AND m.destinatario_id=? AND m.lido_em IS NULL) AS nao_lidas,
    CASE WHEN p.ultimo_acesso >= NOW() - INTERVAL 75 SECOND THEN 1 ELSE 0 END AS online,
    p.ultimo_acesso AS ultimo_acesso
    FROM usuarios u LEFT JOIN setores s ON s.id=u.setor_id
    LEFT JOIN chat_interno_presenca p ON p.usuario_id=u.id
    WHERE u.ativo=1 AND u.id<>? ORDER BY (ultima_em IS NULL),ultima_em DESC,u.nome`,
    [id,id,id,id,id,id]);
  res.set("Cache-Control","no-store").json({conversas});
}));
router.get("/mensagens/:id", fail(async (req,res) => {
  const outro=Number(req.params.id), id=req.usuario.id;
  if (!Number.isSafeInteger(outro) || outro<=0 || outro===id) return res.status(400).json({erro:"Conversa inválida"});
  const [p]=await q("SELECT id,nome FROM usuarios WHERE id=? AND ativo=1",[outro]);
  if(!p) return res.status(404).json({erro:"Colaborador indisponível"});
  const mensagens=await q(`SELECT * FROM (SELECT m.id,m.remetente_id,m.destinatario_id,m.texto,m.criado_em,m.lido_em,a.nome AS anexo_nome,a.tamanho AS anexo_tamanho
    FROM chat_interno_mensagens m LEFT JOIN chat_interno_anexos a ON a.mensagem_id=m.id
    WHERE (m.remetente_id=? AND m.destinatario_id=?) OR (m.remetente_id=? AND m.destinatario_id=?)
    ORDER BY m.id DESC LIMIT 100) x ORDER BY id ASC`,[id,outro,outro,id]);
  await q("UPDATE chat_interno_mensagens SET lido_em=NOW() WHERE remetente_id=? AND destinatario_id=? AND lido_em IS NULL",[outro,id]);
  res.set("Cache-Control","no-store").json({pessoa:p,mensagens});
}));
router.post("/mensagens", fail(async (req,res) => {
  const id=req.usuario.id, outro=Number(req.body?.destinatario_id), texto=String(req.body?.texto??"").trim();
  if(!Number.isSafeInteger(outro)||outro<=0||outro===id||!texto||texto.length>3000)
    return res.status(400).json({erro:"Informe destinatário e mensagem de até 3.000 caracteres"});
  const [p]=await q("SELECT id FROM usuarios WHERE id=? AND ativo=1",[outro]);
  if(!p) return res.status(404).json({erro:"Destinatário indisponível"});
  const result=await q("INSERT INTO chat_interno_mensagens (remetente_id,destinatario_id,texto) VALUES (?,?,?)",[id,outro,texto]);
  res.status(201).json({ok:true,id:result.insertId});
}));
router.post("/anexos",attachmentUpload.single("arquivo"),fail(async(req,res)=>{
  const id=req.usuario.id,outro=Number(req.body?.destinatario_id),file=req.file;
  if(!Number.isSafeInteger(outro)||outro<=0||outro===id||!file)return res.status(400).json({erro:"Selecione um destinatário e um arquivo válido."});
  const [p]=await q("SELECT id FROM usuarios WHERE id=? AND ativo=1",[outro]);
  if(!p)return res.status(404).json({erro:"Destinatário indisponível"});
  const nome=safeName(file.originalname);
  const driveId=await uploadDriveFile({category:"Chat Interno",name:nome,mime:file.mimetype,buffer:file.buffer});
  try{
    const result=await q("INSERT INTO chat_interno_mensagens (remetente_id,destinatario_id,texto) VALUES (?,?,?)",[id,outro,"📎 "+nome]);
    await q("INSERT INTO chat_interno_anexos (mensagem_id,drive_id,nome,mime,tamanho) VALUES (?,?,?,?,?)",[result.insertId,driveId,nome,file.mimetype,file.size]);
    res.status(201).json({ok:true,id:result.insertId});
  }catch(err){await deleteDriveFile(driveId).catch(()=>{});throw err;}
}));
const MAX_CHAT_FILE=2*1024*1024*1024;
const CHAT_CHUNK=8*1024*1024;
router.post("/uploads/iniciar",fail(async(req,res)=>{
 const id=req.usuario.id,outro=Number(req.body?.destinatario_id),size=Number(req.body?.tamanho);
 const nome=safeName(req.body?.nome),mime=String(req.body?.mime||"application/octet-stream").slice(0,150);
 if(!Number.isSafeInteger(outro)||outro<=0||outro===id||!Number.isSafeInteger(size)||size<1||size>MAX_CHAT_FILE)
  return res.status(400).json({erro:"Destinatário ou tamanho inválido. Limite: 2 GB."});
 const [p]=await q("SELECT id FROM usuarios WHERE id=? AND ativo=1",[outro]);
 if(!p)return res.status(404).json({erro:"Destinatário indisponível"});
 const sessionUrl=await startResumableDriveUpload({category:"Chat Interno",name:nome,mime,size});
 const uploadId=crypto.randomUUID();
 await q("INSERT INTO chat_interno_uploads(id,remetente_id,destinatario_id,nome,mime,tamanho,sessao_url) VALUES(?,?,?,?,?,?,?)",
  [uploadId,id,outro,nome,mime,size,sessionUrl]);
 res.status(201).json({uploadId,chunkSize:CHAT_CHUNK,offset:0});
}));
router.get("/uploads/:uploadId",fail(async(req,res)=>{
 const [u]=await q("SELECT offset_atual,tamanho FROM chat_interno_uploads WHERE id=? AND remetente_id=?",[req.params.uploadId,req.usuario.id]);
 if(!u)return res.status(404).json({erro:"Envio não encontrado"});
 res.set("Cache-Control","no-store").json({offset:Number(u.offset_atual),tamanho:Number(u.tamanho)});
}));
router.put("/uploads/:uploadId/bloco",raw({type:"application/octet-stream",limit:"9mb"}),fail(async(req,res)=>{
 const [u]=await q("SELECT * FROM chat_interno_uploads WHERE id=? AND remetente_id=?",[req.params.uploadId,req.usuario.id]);
 if(!u)return res.status(404).json({erro:"Envio não encontrado"});
 const offset=Number(u.offset_atual),total=Number(u.tamanho),chunk=req.body;
 if(!Buffer.isBuffer(chunk)||!chunk.length||chunk.length>CHAT_CHUNK||offset+chunk.length>total)
  return res.status(400).json({erro:"Bloco inválido"});
 const supplied=Number(req.get("X-Upload-Offset"));
 if(supplied!==offset)return res.status(409).json({erro:"Posição de envio diferente",offset});
 if(offset+chunk.length<total&&chunk.length%262144!==0)
  return res.status(400).json({erro:"Bloco intermediário precisa ser múltiplo de 256 KB"});
 const result=await appendResumableDriveChunk(u.sessao_url,chunk,offset,total,u.mime);
 if(result.complete){
  const message=await q("INSERT INTO chat_interno_mensagens(remetente_id,destinatario_id,texto) VALUES(?,?,?)",
   [u.remetente_id,u.destinatario_id,"📎 "+u.nome]);
  await q("INSERT INTO chat_interno_anexos(mensagem_id,drive_id,nome,mime,tamanho) VALUES(?,?,?,?,?)",
   [message.insertId,result.id,u.nome,u.mime,u.tamanho]);
  await q("DELETE FROM chat_interno_uploads WHERE id=?",[u.id]);
  return res.json({complete:true,messageId:message.insertId,offset:total});
 }
 await q("UPDATE chat_interno_uploads SET offset_atual=? WHERE id=? AND offset_atual=?",
  [result.nextOffset,u.id,offset]);
 res.json({complete:false,offset:result.nextOffset});
}));
router.get("/anexos/:messageId",fail(async(req,res)=>{
  const messageId=Number(req.params.messageId);
  if(!Number.isSafeInteger(messageId)||messageId<=0)return res.status(400).json({erro:"Anexo inválido"});
  const [file]=await q(`SELECT a.drive_id,a.nome,a.mime,a.tamanho FROM chat_interno_anexos a
    INNER JOIN chat_interno_mensagens m ON m.id=a.mensagem_id
    WHERE a.mensagem_id=? AND (m.remetente_id=? OR m.destinatario_id=?)`,[messageId,req.usuario.id,req.usuario.id]);
  if(!file)return res.status(404).json({erro:"Anexo não encontrado"});
  res.set("Cache-Control","private, no-store");
  res.set("X-Content-Type-Options","nosniff");
  res.set("Content-Type",file.mime||"application/octet-stream");
  res.set("Content-Disposition","attachment; filename*=UTF-8''"+encodeURIComponent(file.nome));
  await streamDriveFile(file.drive_id,res);
}));
router.get("/nao-lidas", fail(async (req,res) => {
  const [row]=await q("SELECT COUNT(*) AS total FROM chat_interno_mensagens WHERE destinatario_id=? AND lido_em IS NULL",[req.usuario.id]);
  res.set("Cache-Control","no-store").json({total:Number(row.total)||0});
}));
export default router;
