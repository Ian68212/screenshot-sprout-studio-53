import { Router, raw } from "express";
import crypto from "node:crypto";
import { enviarPushSemBloquear } from "./push-notificacoes.js";
import { q } from "./db.js";
import { exigir } from "./auth.js";
import multer from "multer";
import { uploadDriveFile, readDriveFile, deleteDriveFile, startResumableDriveUpload, appendResumableDriveChunk, streamDriveFile } from "./drive-storage.js";

const router = Router();
const attachmentUpload = multer({storage:multer.memoryStorage(),limits:{fileSize:10*1024*1024,files:1},fileFilter(_req,file,cb){
  const allowed=/^(application\/(pdf|msword|vnd\.openxmlformats-officedocument\.(wordprocessingml\.document|spreadsheetml\.sheet|presentationml\.presentation)|vnd\.ms-excel|vnd\.ms-powerpoint|zip|x-zip-compressed|octet-stream)|image\/(jpeg|png|webp)|audio\/(webm|mp4|ogg|mpeg|aac|3gpp|x-m4a)|text\/plain)$/;
  if(!allowed.test(file.mimetype))return cb(Object.assign(new Error("Formato não permitido. Envie PDF, Office, imagem, áudio, TXT ou ZIP."),{status:400}));
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
  const mensagens=await q(`SELECT * FROM (SELECT m.id,m.remetente_id,m.destinatario_id,m.texto,m.criado_em,m.lido_em,a.nome AS anexo_nome,a.tamanho AS anexo_tamanho,a.mime AS anexo_mime
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
  enviarPushSemBloquear(outro,{type:"message",title:"Chat interno Rodrinox Pro",body:"Você recebeu uma nova mensagem."});
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
    enviarPushSemBloquear(outro,{type:"message",title:"Chat interno Rodrinox Pro",body:file.mimetype.startsWith("audio/")?"Você recebeu uma mensagem de voz.":"Você recebeu um arquivo."});
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
  res.set("Content-Disposition",(String(file.mime).startsWith("audio/")?"inline":"attachment")+"; filename*=UTF-8''"+encodeURIComponent(file.nome));
  await streamDriveFile(file.drive_id,res);
}));
router.get("/nao-lidas", fail(async (req,res) => {
  const [row]=await q("SELECT COUNT(*) AS total FROM chat_interno_mensagens WHERE destinatario_id=? AND lido_em IS NULL",[req.usuario.id]);
  res.set("Cache-Control","no-store").json({total:Number(row.total)||0});
}));

/* Sinalização WebRTC autenticada, sem dependência de WebSocket. */
let callReady;
async function callSchema(){
 if(!callReady)callReady=(async()=>{
  await q(`CREATE TABLE IF NOT EXISTS chat_interno_chamadas (
   id CHAR(36) PRIMARY KEY, origem_id BIGINT NOT NULL, destino_id BIGINT NOT NULL,
   estado VARCHAR(16) NOT NULL DEFAULT 'ringing',
   criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
   atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
   INDEX ix_destino (destino_id,estado), INDEX ix_origem (origem_id,estado)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await q(`CREATE TABLE IF NOT EXISTS chat_interno_sinais (
   id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, chamada_id CHAR(36) NOT NULL,
   remetente_id BIGINT NOT NULL, tipo VARCHAR(16) NOT NULL,
   conteudo MEDIUMTEXT NOT NULL, criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
   INDEX ix_chamada (chamada_id,id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
 })().catch(e=>{callReady=null;throw e});return callReady;
}
const callFail=fn=>async(req,res,next)=>{try{await callSchema();await fn(req,res)}catch(e){next(e)}};
const callId=id=>/^[a-f0-9-]{36}$/i.test(String(id||""));
async function authorizedCall(req,res){
 if(!callId(req.params.id)){res.status(400).json({erro:"Chamada inválida"});return null}
 const [call]=await q("SELECT * FROM chat_interno_chamadas WHERE id=? AND (origem_id=? OR destino_id=?)",[req.params.id,req.usuario.id,req.usuario.id]);
 if(!call){res.status(404).json({erro:"Chamada não encontrada"});return null}return call;
}
router.post("/chamadas",callFail(async(req,res)=>{
 const to=Number(req.body?.destinatario_id),from=req.usuario.id;
 if(!Number.isSafeInteger(to)||to<=0||to===from)return res.status(400).json({erro:"Destinatário inválido"});
 const [person]=await q("SELECT id FROM usuarios WHERE id=? AND ativo=1",[to]);
 if(!person)return res.status(404).json({erro:"Colaborador indisponível"});
 const busy=await q("SELECT id FROM chat_interno_chamadas WHERE estado IN ('ringing','active') AND atualizado_em>NOW()-INTERVAL 2 MINUTE AND (origem_id IN (?,?) OR destino_id IN (?,?)) LIMIT 1",[from,to,from,to]);
 if(busy.length)return res.status(409).json({erro:"Um dos colaboradores já está em chamada"});
 const id=crypto.randomUUID();
 await q("INSERT INTO chat_interno_chamadas(id,origem_id,destino_id) VALUES(?,?,?)",[id,from,to]);
 res.status(201).json({id,estado:"ringing"});
 enviarPushSemBloquear(to,{type:"call",title:"Chamada interna Rodrinox Pro",body:"Um colaborador está ligando.",callId:id});
}));
router.get("/chamadas/pendentes",callFail(async(req,res)=>{
 await q("UPDATE chat_interno_chamadas SET estado='ended' WHERE estado IN ('ringing','active') AND atualizado_em<NOW()-INTERVAL 2 MINUTE");
 const chamadas=await q("SELECT c.id,c.origem_id,c.destino_id,c.estado,u.nome AS origem_nome FROM chat_interno_chamadas c JOIN usuarios u ON u.id=c.origem_id WHERE c.destino_id=? AND c.estado='ringing' ORDER BY c.criado_em DESC LIMIT 1",[req.usuario.id]);
 res.set("Cache-Control","no-store").json({chamada:chamadas[0]||null});
}));
router.get("/chamadas/:id",callFail(async(req,res)=>{
 const c=await authorizedCall(req,res);if(!c)return;
 res.set("Cache-Control","no-store").json({id:c.id,estado:c.estado,origem_id:c.origem_id,destino_id:c.destino_id});
}));
router.post("/chamadas/:id/estado",callFail(async(req,res)=>{
 const c=await authorizedCall(req,res);if(!c)return;
 const state=String(req.body?.estado||"");
 if(!["active","declined","ended"].includes(state))return res.status(400).json({erro:"Estado inválido"});
 if(state==="active"&&(c.destino_id!==req.usuario.id||c.estado!=="ringing"))return res.status(409).json({erro:"Não é possível atender"});
 if(state!=="active"&& !["ringing","active"].includes(c.estado))return res.status(409).json({erro:"Chamada já encerrada"});
 await q("UPDATE chat_interno_chamadas SET estado=? WHERE id=?",[state,c.id]);
 res.json({ok:true,estado:state});
}));
router.post("/chamadas/:id/sinais",callFail(async(req,res)=>{
 const c=await authorizedCall(req,res);if(!c)return;
 const tipo=String(req.body?.tipo||""),conteudo=JSON.stringify(req.body?.conteudo??null);
 if(!["offer","answer","candidate"].includes(tipo)||conteudo.length>12000)return res.status(400).json({erro:"Sinal inválido"});
 if(!["ringing","active"].includes(c.estado))return res.status(409).json({erro:"Chamada encerrada"});
 await q("INSERT INTO chat_interno_sinais(chamada_id,remetente_id,tipo,conteudo) VALUES(?,?,?,?)",[c.id,req.usuario.id,tipo,conteudo]);
 await q("UPDATE chat_interno_chamadas SET atualizado_em=NOW() WHERE id=?",[c.id]);
 res.status(201).json({ok:true});
}));
router.get("/chamadas/:id/sinais",callFail(async(req,res)=>{
 const c=await authorizedCall(req,res);if(!c)return;
 const after=Math.max(0,Number(req.query.after)||0);
 const signals=await q("SELECT id,tipo,conteudo FROM chat_interno_sinais WHERE chamada_id=? AND remetente_id<>? AND id>? ORDER BY id LIMIT 100",[c.id,req.usuario.id,after]);
 res.set("Cache-Control","no-store").json({sinais:signals.map(s=>({id:s.id,tipo:s.tipo,conteudo:JSON.parse(s.conteudo)}))});
}));

export default router;
