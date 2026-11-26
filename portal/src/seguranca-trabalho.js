import express from "express";
import crypto from "node:crypto";
import multer from "multer";
import rateLimit from "express-rate-limit";
import { validarSenhaHostinger } from "./hostinger-auth.js";
import path from "node:path";
import {uploadDriveFile,readDriveFile,deleteDriveFile} from "./drive-storage.js";
import { q, auditar, pool } from "./db.js";
import { exigir } from "./auth.js";
const router=express.Router();
const manager=u=>u.perfil==="admin"||String(u.email).toLowerCase()==="eduardo.lazaretti@rodrinoxpro.com.br";
const wrap=fn=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);
let schema;
function init(){return schema??=(async()=>{
await q("CREATE TABLE IF NOT EXISTS sst_documentos (id BIGINT AUTO_INCREMENT PRIMARY KEY, titulo VARCHAR(200) NOT NULL, categoria VARCHAR(80) NOT NULL, corpo TEXT NOT NULL, autor_id BIGINT NOT NULL, criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");
await q("CREATE TABLE IF NOT EXISTS sst_assinaturas (documento_id BIGINT NOT NULL, usuario_id BIGINT NOT NULL, assinado_em DATETIME NULL, evidencia CHAR(64) NULL, PRIMARY KEY(documento_id,usuario_id))");
await q("CREATE TABLE IF NOT EXISTS sst_epi_catalogo (id BIGINT AUTO_INCREMENT PRIMARY KEY, nome VARCHAR(160) NOT NULL, ca VARCHAR(40) NOT NULL DEFAULT '', UNIQUE KEY produto(nome,ca))");
await q("CREATE TABLE IF NOT EXISTS sst_pastas (nome VARCHAR(80) PRIMARY KEY)");
await q("CREATE TABLE IF NOT EXISTS sst_versoes (id BIGINT AUTO_INCREMENT PRIMARY KEY, documento_id BIGINT NOT NULL, corpo TEXT NOT NULL, autor_id BIGINT NOT NULL, criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");
const archiveCols=await q("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='sst_documentos' AND COLUMN_NAME='arquivado_em'");if(!archiveCols.length)await q("ALTER TABLE sst_documentos ADD COLUMN arquivado_em DATETIME NULL");
const cols=await q("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='sst_assinaturas' AND COLUMN_NAME='provas'");
if(!cols.length){try{await q("ALTER TABLE sst_assinaturas ADD COLUMN provas MEDIUMBLOB NULL");}catch(e){if(e.code!=="ER_DUP_FIELDNAME")throw e;}}
})().catch(e=>{schema=null;throw e;});}
router.use(exigir("painel"),wrap(async(req,res,next)=>{await init();res.set("Cache-Control","private, no-store");next();}));
router.get("/epi/catalogo",wrap(async(req,res)=>{if(!manager(req.usuario))return res.sendStatus(403);res.json(await q("SELECT id,nome,ca FROM sst_epi_catalogo ORDER BY nome"));}));
router.get("/epi/historico",wrap(async(req,res)=>{if(!manager(req.usuario))return res.sendStatus(403);res.json(await q("SELECT d.id,d.titulo,d.corpo,d.criado_em,u.nome colaborador,a.assinado_em FROM sst_documentos d JOIN sst_assinaturas a ON a.documento_id=d.id JOIN usuarios u ON u.id=a.usuario_id WHERE d.categoria='Entrega de EPI' ORDER BY d.id DESC"));}));
router.post("/epi/entregar",wrap(async(req,res)=>{
if(!manager(req.usuario))return res.sendStatus(403);
const {email,itens,observacoes}=req.body||{};
if(!Array.isArray(itens)||!itens.length||itens.length>50||typeof observacoes!=="string"||observacoes.length>2000)return res.sendStatus(400);
const [u]=await q("SELECT id,nome,email FROM usuarios WHERE email=? AND ativo=1",[String(email||"").trim().toLowerCase()]);if(!u)return res.sendStatus(404);
const produtos=[];for(const item of itens){const nome=String(item.nome||"").trim(),ca=String(item.ca||"").trim(),quantidade=Number(item.quantidade),motivo=String(item.motivo||"");if(!nome||nome.length>160||ca.length>40||!Number.isInteger(quantidade)||quantidade<1||quantidade>10000||!["Primeira entrega","Reposição","Troca"].includes(motivo))return res.status(400).json({erro:"Material inválido"});produtos.push({nome,ca,quantidade,motivo,cadastrar:item.cadastrar===true});}
const agora=new Date();const corpo=["TERMO DE RECEBIMENTO DE EPI","Colaborador: "+u.nome+" ("+u.email+")","Responsável: "+req.usuario.nome,"Data e hora: "+agora.toLocaleString("pt-BR",{timeZone:"America/Sao_Paulo"})+" (Brasília)","Materiais entregues:",...produtos.map(p=>p.quantidade+" x "+p.nome+(p.ca?" | CA "+p.ca:"")+" | "+p.motivo),"Observações: "+observacoes,"Confirmo o recebimento dos materiais relacionados acima."].join("\n");
const conn=await pool.getConnection();let id;try{await conn.beginTransaction();for(const p of produtos)if(p.cadastrar)await conn.execute("INSERT IGNORE INTO sst_epi_catalogo(nome,ca) VALUES(?,?)",[p.nome,p.ca]);const [r]=await conn.execute("INSERT INTO sst_documentos(titulo,categoria,corpo,autor_id) VALUES(?,?,?,?)",[("Entrega de EPI - "+u.nome).slice(0,200),"Entrega de EPI",corpo,req.usuario.id]);id=r.insertId;await conn.execute("INSERT INTO sst_assinaturas(documento_id,usuario_id) VALUES(?,?)",[id,u.id]);await conn.commit();}catch(err){await conn.rollback();throw err;}finally{conn.release();}res.status(201).json({id,titulo:"Entrega de EPI - "+u.nome,corpo,email:u.email});
}));
router.get("/assinaturas/historico",wrap(async(req,res)=>{res.json(await q("SELECT d.id,d.titulo,d.categoria,d.arquivado_em,a.usuario_id,a.assinado_em,u.nome FROM sst_documentos d JOIN sst_assinaturas a ON a.documento_id=d.id LEFT JOIN usuarios u ON u.id=a.usuario_id WHERE a.assinado_em IS NOT NULL"+(manager(req.usuario)?"":" AND a.usuario_id=?")+" ORDER BY a.assinado_em DESC",manager(req.usuario)?[]:[req.usuario.id]));}));
router.get("/pastas",wrap(async(req,res)=>{if(!manager(req.usuario))return res.sendStatus(403);res.json(await q("SELECT nome FROM sst_pastas ORDER BY nome"));}));
router.post("/pastas",wrap(async(req,res)=>{if(!manager(req.usuario))return res.sendStatus(403);const nome=String(req.body?.nome||"").trim();if(!nome||nome.length>80)return res.sendStatus(400);await q("INSERT IGNORE INTO sst_pastas(nome) VALUES(?)",[nome]);res.json({ok:true});}));
router.post("/:id/organizar",wrap(async(req,res)=>{if(!manager(req.usuario))return res.sendStatus(403);const titulo=String(req.body?.titulo||"").trim(),categoria=String(req.body?.categoria||"").trim();if(!titulo||titulo.length>200||!categoria||categoria.length>80)return res.sendStatus(400);const r=await q("UPDATE sst_documentos SET titulo=?,categoria=? WHERE id=? AND arquivado_em IS NULL AND NOT EXISTS (SELECT 1 FROM sst_assinaturas WHERE documento_id=? )",[titulo,categoria,req.params.id,req.params.id]);if(!r.affectedRows)return res.status(409).json({erro:"Documento com solicitação de assinatura ou inexistente. Preserve o original."});res.json({ok:true});}));
router.get("/:id/versoes",wrap(async(req,res)=>{if(!manager(req.usuario))return res.sendStatus(403);res.json(await q("SELECT v.id,v.criado_em,u.nome autor FROM sst_versoes v LEFT JOIN usuarios u ON u.id=v.autor_id WHERE v.documento_id=? ORDER BY v.id DESC",[req.params.id]));}));
router.get("/:id/versoes/:versao",wrap(async(req,res)=>{if(!manager(req.usuario))return res.sendStatus(403);const [v]=await q("SELECT corpo FROM sst_versoes WHERE documento_id=? AND id=?",[req.params.id,req.params.versao]);let a;try{a=JSON.parse(v?.corpo);}catch{}if(a?.tipo!=="sst-anexo-v1")return res.sendStatus(404);const bytes=await readDriveFile(a.id);if(crypto.createHash("sha256").update(bytes).digest("hex")!==a.hash)return res.sendStatus(409);res.attachment(a.name);res.type("application/octet-stream");res.send(bytes);}));
router.get("/minhas",wrap(async(req,res)=>{res.json(await q("SELECT d.*,a.assinado_em,u.nome autor_nome FROM sst_documentos d JOIN sst_assinaturas a ON a.documento_id=d.id LEFT JOIN usuarios u ON u.id=d.autor_id WHERE a.usuario_id=? AND (d.arquivado_em IS NULL OR a.assinado_em IS NOT NULL) ORDER BY a.assinado_em IS NOT NULL,d.id DESC",[req.usuario.id]));}));
router.get("/",wrap(async(req,res)=>{
const admin=manager(req.usuario);
const documentos=await q(admin?"SELECT d.*, u.nome autor_nome, (SELECT COUNT(*) FROM sst_assinaturas a WHERE a.documento_id=d.id AND a.assinado_em IS NOT NULL) assinados, (SELECT COUNT(*) FROM sst_assinaturas a WHERE a.documento_id=d.id AND a.assinado_em IS NULL) pendentes FROM sst_documentos d LEFT JOIN usuarios u ON u.id=d.autor_id WHERE d.arquivado_em IS NULL ORDER BY d.id DESC":"SELECT d.*,u.nome autor_nome,a.assinado_em FROM sst_documentos d LEFT JOIN usuarios u ON u.id=d.autor_id JOIN sst_assinaturas a ON a.documento_id=d.id WHERE a.usuario_id=? ORDER BY d.id DESC",admin?[]:[req.usuario.id]);
res.json({gestor:admin,administrador:req.usuario.perfil==="admin",documentos});
}));
router.post("/",wrap(async(req,res)=>{
if(!manager(req.usuario))return res.sendStatus(403);
const {titulo,categoria,corpo}=req.body||{};
if(typeof titulo!=="string"||!titulo.trim()||titulo.length>200||typeof categoria!=="string"||categoria.length>80||typeof corpo!=="string"||!corpo.trim()||corpo.length>50000)return res.sendStatus(400);
try{if(JSON.parse(corpo)?.tipo==="sst-anexo-v1")return res.sendStatus(400);}catch{}
const result=await q("INSERT INTO sst_documentos(titulo,categoria,corpo,autor_id) VALUES(?,?,?,?)",[titulo,categoria,corpo,req.usuario.id]);res.status(201).json({id:result.insertId});
}));
router.post("/:id/solicitar",wrap(async(req,res)=>{
if(!manager(req.usuario))return res.sendStatus(403);
const [d]=await q("SELECT id FROM sst_documentos WHERE id=? AND arquivado_em IS NULL",[req.params.id]);
const [u]=await q("SELECT id FROM usuarios WHERE email=? AND ativo=1",[String(req.body?.email||"").trim().toLowerCase()]);
if(!d||!u)return res.sendStatus(404);
await q("INSERT IGNORE INTO sst_assinaturas(documento_id,usuario_id) VALUES(?,?)",[d.id,u.id]);res.json({ok:true});
}));
const provasUpload=multer({storage:multer.memoryStorage(),limits:{fileSize:2*1024*1024,files:2,fields:3,fieldSize:512}}).fields([{name:"foto",maxCount:1},{name:"assinatura",maxCount:1}]);
router.post("/:id/assinar",rateLimit({windowMs:15*60000,limit:5,standardHeaders:true,legacyHeaders:false,keyGenerator:req=>String(req.usuario.id)}),provasUpload,wrap(async(req,res)=>{
if(req.body?.aceito!=="true")return res.sendStatus(400);
const foto=req.files?.foto?.[0]?.buffer, assinatura=req.files?.assinatura?.[0]?.buffer;
const png=b=>b?.length>8&&b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
const jpeg=b=>b?.length>3&&b[0]===255&&b[1]===216&&b[2]===255;
if(!jpeg(foto)||!png(assinatura))return res.status(400).json({erro:"Foto e assinatura obrigatórias"});
const presencial=!!req.body.email;
if(presencial&&!manager(req.usuario))return res.sendStatus(403);
const [signer]=await q("SELECT id,nome,email FROM usuarios WHERE ativo=1 AND email=?",[presencial?String(req.body.email).trim().toLowerCase():req.usuario.email]);
if(!signer)return res.sendStatus(404);
const provas=JSON.stringify({modalidade:presencial?"presencial":"portal",gestor:presencial?req.usuario.id:null,foto:foto.toString("base64"),assinatura:assinatura.toString("base64"),autenticacao:"senha Hostinger confirmada",usuario:signer.id,nome:signer.nome,ip:req.ip});
const [d]=await q("SELECT d.* FROM sst_documentos d JOIN sst_assinaturas a ON a.documento_id=d.id WHERE d.id=? AND a.usuario_id=? AND a.assinado_em IS NULL",[req.params.id,signer.id]);
if(!d)return res.sendStatus(404);
const senha=req.body?.senha;
if(typeof senha!=="string"||!senha||senha.length>512)return res.status(400).json({erro:"Confirme sua senha"});
let validada;try{validada=await validarSenhaHostinger(signer.email,senha);}catch{return res.status(503).json({erro:"Autenticação indisponível"});}
if(!validada)return res.status(401).json({erro:"Senha incorreta"});
const instante=new Date();const evidencia=crypto.createHash("sha256").update(JSON.stringify([d.id,d.titulo,d.categoria,d.corpo,signer.id,instante.toISOString(),crypto.createHash("sha256").update(provas).digest("hex")])).digest("hex");
const result=await q("UPDATE sst_assinaturas SET assinado_em=?,evidencia=?,provas=? WHERE documento_id=? AND usuario_id=? AND assinado_em IS NULL",[instante,evidencia,provas,d.id,signer.id]);
if(!result.affectedRows)return res.sendStatus(409);res.json({ok:true,evidencia});
}));
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:25*1024*1024,files:1,fields:2,fieldSize:1024},fileFilter:(_r,f,cb)=>cb(null,/\.(pdf|docx?|xlsx?|png|jpe?g|webp|txt|csv)$/i.test(f.originalname))}).single("arquivo");
router.post("/:id/versao",(req,res,next)=>{if(!manager(req.usuario))return res.sendStatus(403);upload(req,res,err=>err?res.sendStatus(400):next());},wrap(async(req,res)=>{
if(!req.file)return res.sendStatus(400);const [d]=await q("SELECT * FROM sst_documentos WHERE id=?",[req.params.id]);let old;try{old=JSON.parse(d?.corpo);}catch{}if(old?.tipo!=="sst-anexo-v1")return res.sendStatus(404);
const name=path.basename(req.file.originalname).slice(0,200),hash=crypto.createHash("sha256").update(req.file.buffer).digest("hex"),id=await uploadDriveFile({category:"Segurança do Trabalho",name,mime:"application/octet-stream",buffer:req.file.buffer});const corpo=JSON.stringify({tipo:"sst-anexo-v1",id,name,hash});const conn=await pool.getConnection();let novo=d.id;try{await conn.beginTransaction();const [r]=await conn.execute("UPDATE sst_documentos SET corpo=? WHERE id=? AND corpo=? AND NOT EXISTS (SELECT 1 FROM sst_assinaturas WHERE documento_id=?)",[corpo,d.id,d.corpo,d.id]);if(r.affectedRows){await conn.execute("INSERT INTO sst_versoes(documento_id,corpo,autor_id) VALUES(?,?,?)",[d.id,d.corpo,d.autor_id]);}else{const [n]=await conn.execute("INSERT INTO sst_documentos(titulo,categoria,corpo,autor_id) VALUES(?,?,?,?)",[("Nova versão - "+d.titulo).slice(0,200),"Em elaboração",corpo,req.usuario.id]);novo=n.insertId;}await conn.commit();}catch(err){await conn.rollback();await deleteDriveFile(id).catch(()=>{});throw err;}finally{conn.release();}res.json({ok:true,id:novo});
}));
router.post("/upload",(req,res,next)=>{if(!manager(req.usuario))return res.sendStatus(403);upload(req,res,err=>{if(err)return res.status(400).json({erro:"Arquivo inválido ou acima de 25 MB"});next();});},wrap(async(req,res)=>{
const titulo=String(req.body.titulo||"").trim(),categoria=String(req.body.categoria||"").trim();
if(!req.file||!titulo||titulo.length>200||!categoria||categoria.length>80)return res.status(400).json({erro:"Informe arquivo, título e categoria"});
const name=path.basename(req.file.originalname).slice(0,200),hash=crypto.createHash("sha256").update(req.file.buffer).digest("hex");
const id=await uploadDriveFile({category:"Segurança do Trabalho",name,mime:"application/octet-stream",buffer:req.file.buffer});
try{const result=await q("INSERT INTO sst_documentos(titulo,categoria,corpo,autor_id) VALUES(?,?,?,?)",[titulo,categoria,JSON.stringify({tipo:"sst-anexo-v1",id,name,hash}),req.usuario.id]);res.status(201).json({id:result.insertId});}catch(e){await deleteDriveFile(id).catch(()=>{});throw e;}
}));
router.get("/:id/arquivo",wrap(async(req,res)=>{
const [d]=await q(manager(req.usuario)?"SELECT corpo FROM sst_documentos WHERE id=?":"SELECT d.corpo FROM sst_documentos d JOIN sst_assinaturas a ON a.documento_id=d.id WHERE d.id=? AND a.usuario_id=?",manager(req.usuario)?[req.params.id]:[req.params.id,req.usuario.id]);
let a;try{a=JSON.parse(d?.corpo||"");}catch{}if(a?.tipo!=="sst-anexo-v1"||!/^[A-Za-z0-9_-]{10,}$/.test(a.id))return res.sendStatus(404);
const bytes=await readDriveFile(a.id);if(crypto.createHash("sha256").update(bytes).digest("hex")!==a.hash)return res.sendStatus(409);
const types={".pdf":"application/pdf",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".webp":"image/webp",".txt":"text/plain",".csv":"text/plain"};
const mime=types[path.extname(a.name).toLowerCase()];
if(req.query.visualizar==="1"&&mime){res.type(mime);res.set("Content-Disposition","inline");res.set("X-Content-Type-Options","nosniff");}else{res.attachment(a.name);res.type("application/octet-stream");}res.send(bytes);
}));
router.get("/colaboradores",wrap(async(req,res)=>{
if(!manager(req.usuario))return res.sendStatus(403);
res.json(await q("SELECT nome,email FROM usuarios WHERE ativo=1 ORDER BY nome"));
}));
router.post("/:id/excluir",wrap(async(req,res)=>{
if(!manager(req.usuario))return res.sendStatus(403);
const permanente=req.body?.permanente===true;
if(permanente&&(req.usuario.perfil!=="admin"||req.body?.confirmacao!=="EXCLUIR"))return res.status(403).json({erro:"Exclusão permanente exige administrador e confirmação."});
const [doc]=await q("SELECT id,titulo,corpo FROM sst_documentos WHERE id=?",[req.params.id]);
if(!doc)return res.status(404).json({erro:"Documento inexistente."});
const conn=await pool.getConnection();try{await conn.beginTransaction();await conn.execute("UPDATE sst_documentos SET arquivado_em=NOW() WHERE id=? AND arquivado_em IS NULL",[doc.id]);await conn.execute("DELETE FROM sst_assinaturas WHERE documento_id=? AND assinado_em IS NULL",[doc.id]);await conn.commit();}catch(err){await conn.rollback();throw err;}finally{conn.release();}
res.json({ok:true,arquivado:true});

}));
router.get("/:id/comprovantes",wrap(async(req,res)=>{
const rows=await q("SELECT a.usuario_id,u.nome,a.assinado_em,a.evidencia FROM sst_assinaturas a JOIN usuarios u ON u.id=a.usuario_id WHERE a.documento_id=? AND a.assinado_em IS NOT NULL"+(manager(req.usuario)?"":" AND a.usuario_id=?"),manager(req.usuario)?[req.params.id]:[req.params.id,req.usuario.id]);
res.json(rows);
}));
router.get("/:id/comprovante/:usuario",wrap(async(req,res)=>{
if(!manager(req.usuario)&&String(req.usuario.id)!==req.params.usuario)return res.sendStatus(403);
const [r]=await q("SELECT d.titulo,d.categoria,d.corpo,a.assinado_em,a.evidencia,a.provas,u.nome FROM sst_assinaturas a JOIN sst_documentos d ON d.id=a.documento_id JOIN usuarios u ON u.id=a.usuario_id WHERE d.id=? AND a.usuario_id=? AND a.assinado_em IS NOT NULL",[req.params.id,req.params.usuario]);
if(!r)return res.sendStatus(404);
let provas=null;try{provas=JSON.parse(String(r.provas));}catch{}
let hashDocumento;try{const a=JSON.parse(r.corpo);if(a.tipo==="sst-anexo-v1")hashDocumento=a.hash;}catch{}
res.json({titulo:r.titulo,categoria:r.categoria,nome:provas?.nome||r.nome,assinado_em:r.assinado_em,evidencia:r.evidencia,hashDocumento:hashDocumento||crypto.createHash("sha256").update(r.corpo).digest("hex"),provas});
}));
export default router;
