import express from "express";
import crypto from "node:crypto";
import { q } from "./db.js";
import { exigir } from "./auth.js";
const router=express.Router();
const manager=u=>u.perfil==="admin"||String(u.email).toLowerCase()==="eduardo.lazaretti@rodrinoxpro.com.br";
const wrap=fn=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);
let schema;
function init(){return schema??=(async()=>{
await q("CREATE TABLE IF NOT EXISTS sst_documentos (id BIGINT AUTO_INCREMENT PRIMARY KEY, titulo VARCHAR(200) NOT NULL, categoria VARCHAR(80) NOT NULL, corpo TEXT NOT NULL, autor_id BIGINT NOT NULL, criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");
await q("CREATE TABLE IF NOT EXISTS sst_assinaturas (documento_id BIGINT NOT NULL, usuario_id BIGINT NOT NULL, assinado_em DATETIME NULL, evidencia CHAR(64) NULL, PRIMARY KEY(documento_id,usuario_id))");
})().catch(e=>{schema=null;throw e;});}
router.use(exigir("painel"),wrap(async(req,res,next)=>{await init();res.set("Cache-Control","private, no-store");next();}));
router.get("/",wrap(async(req,res)=>{
const admin=manager(req.usuario);
const documentos=await q(admin?"SELECT d.*, (SELECT COUNT(*) FROM sst_assinaturas a WHERE a.documento_id=d.id AND a.assinado_em IS NULL) pendentes FROM sst_documentos d ORDER BY id DESC":"SELECT d.*,a.assinado_em FROM sst_documentos d JOIN sst_assinaturas a ON a.documento_id=d.id WHERE a.usuario_id=? ORDER BY d.id DESC",admin?[]:[req.usuario.id]);
res.json({gestor:admin,documentos});
}));
router.post("/",wrap(async(req,res)=>{
if(!manager(req.usuario))return res.sendStatus(403);
const {titulo,categoria,corpo}=req.body||{};
if(typeof titulo!=="string"||!titulo.trim()||titulo.length>200||typeof categoria!=="string"||categoria.length>80||typeof corpo!=="string"||!corpo.trim()||corpo.length>50000)return res.sendStatus(400);
const result=await q("INSERT INTO sst_documentos(titulo,categoria,corpo,autor_id) VALUES(?,?,?,?)",[titulo,categoria,corpo,req.usuario.id]);res.status(201).json({id:result.insertId});
}));
router.post("/:id/solicitar",wrap(async(req,res)=>{
if(!manager(req.usuario))return res.sendStatus(403);
const [d]=await q("SELECT id FROM sst_documentos WHERE id=?",[req.params.id]);
const [u]=await q("SELECT id FROM usuarios WHERE email=? AND ativo=1",[String(req.body?.email||"").trim().toLowerCase()]);
if(!d||!u)return res.sendStatus(404);
await q("INSERT IGNORE INTO sst_assinaturas(documento_id,usuario_id) VALUES(?,?)",[d.id,u.id]);res.json({ok:true});
}));
router.post("/:id/assinar",wrap(async(req,res)=>{
if(req.body?.aceito!==true)return res.sendStatus(400);
const [d]=await q("SELECT d.* FROM sst_documentos d JOIN sst_assinaturas a ON a.documento_id=d.id WHERE d.id=? AND a.usuario_id=? AND a.assinado_em IS NULL",[req.params.id,req.usuario.id]);
if(!d)return res.sendStatus(404);
const instante=new Date();const evidencia=crypto.createHash("sha256").update(JSON.stringify([d.id,d.titulo,d.categoria,d.corpo,req.usuario.id,instante.toISOString()])).digest("hex");
const result=await q("UPDATE sst_assinaturas SET assinado_em=?,evidencia=? WHERE documento_id=? AND usuario_id=? AND assinado_em IS NULL",[instante,evidencia,d.id,req.usuario.id]);
if(!result.affectedRows)return res.sendStatus(409);res.json({ok:true,evidencia});
}));
export default router;
