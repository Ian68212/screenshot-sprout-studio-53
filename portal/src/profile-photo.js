import { Router } from "express";
import multer from "multer";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { fileTypeFromBuffer } from "file-type";
import { q, auditar } from "./db.js";
import { exigir } from "./auth.js";
import { pode } from "./permissions.js";
import { SITE_MEDIA_DIR } from "./media-storage.js";

export const profilePhotoRouter = Router();
const upload = multer({storage:multer.memoryStorage(),limits:{fileSize:3*1024*1024,files:1}});
const extensions = new Map([["image/jpeg","jpg"],["image/png","png"],["image/webp","webp"]]);
let schemaPromise;
export async function ensureProfilePhotoSchema(){
  if(!schemaPromise){
    schemaPromise=(async()=>{
      const cols=await q("SHOW COLUMNS FROM usuarios LIKE 'foto_url'");
      if(!Array.isArray(cols))throw new Error("Não foi possível verificar a coluna foto_url.");
      if(!cols.length)await q("ALTER TABLE usuarios ADD COLUMN foto_url VARCHAR(500) NULL AFTER email");
    })().catch(e=>{schemaPromise=null;throw e;});
  }
  await schemaPromise;
}
const validId=v=>Number.isSafeInteger(Number(v))&&Number(v)>0?Number(v):null;
function canManage(req,id){return Number(req.usuario.id)===Number(id)||pode(req.usuario,"admin.usuarios");}
async function savePhoto(req,res,id){
  if(!req.file)return res.status(400).json({erro:"Selecione uma foto."});
  const kind=await fileTypeFromBuffer(req.file.buffer);
  if(!kind||!extensions.has(kind.mime))return res.status(415).json({erro:"Envie uma imagem JPG, PNG ou WebP válida."});
  await ensureProfilePhotoSchema();
  const [user]=await q("SELECT foto_url FROM usuarios WHERE id=?",[id]);
  if(!user)return res.status(404).json({erro:"Colaborador não encontrado."});
  const filename=randomUUID()+"."+extensions.get(kind.mime);
  await mkdir(SITE_MEDIA_DIR,{recursive:true,mode:0o700});
  await writeFile(path.join(SITE_MEDIA_DIR,filename),req.file.buffer,{flag:"wx",mode:0o600});
  const url="/colaborador/api/perfil/foto/"+id+"/arquivo/"+filename;
  try{
    await q("UPDATE usuarios SET foto_url=? WHERE id=?",[url,id]);
    await auditar(req.usuario.id,"perfil_foto_atualizada",String(id),req.ip);
    const previous=String(user.foto_url||"").match(/\/([a-f0-9-]{36}\.(?:jpg|png|webp))$/i);
    if(previous&&previous[1]!==filename)await unlink(path.join(SITE_MEDIA_DIR,previous[1])).catch(()=>{});
    res.json({ok:true,foto_url:url+"?v="+Date.now()});
  }catch(e){await unlink(path.join(SITE_MEDIA_DIR,filename)).catch(()=>{});throw e;}
}
profilePhotoRouter.put("/foto",exigir("painel"),upload.single("foto"),async(req,res,next)=>{
  try{await savePhoto(req,res,Number(req.usuario.id));}catch(e){next(e);}
});
profilePhotoRouter.put("/foto/:id",exigir("painel"),upload.single("foto"),async(req,res,next)=>{
  try{
    const id=validId(req.params.id);
    if(!id)return res.status(400).json({erro:"Identificador inválido."});
    if(!canManage(req,id))return res.status(403).json({erro:"Você não tem permissão para alterar esta foto."});
    await savePhoto(req,res,id);
  }catch(e){next(e);}
});
profilePhotoRouter.get("/foto/:id/arquivo/:filename",exigir("painel"),async(req,res,next)=>{
  try{
    const id=validId(req.params.id);
    if(!id)return res.status(400).json({erro:"Identificador inválido."});
    if(!canManage(req,id))return res.status(403).json({erro:"Acesso negado."});
    await ensureProfilePhotoSchema();
    const [user]=await q("SELECT foto_url FROM usuarios WHERE id=?",[id]);
    if(!user?.foto_url)return res.status(404).end();
    const filename=String(req.params.filename||"");
    if(!/^[a-f0-9-]{36}\\.(?:jpg|png|webp)$/i.test(filename))return res.status(404).end();
    const expected="/colaborador/api/perfil/foto/"+id+"/arquivo/"+filename;
    if(user.foto_url!==expected)return res.status(404).end();
    const file=path.join(SITE_MEDIA_DIR,filename);
    const buffer=await readFile(file);
    const ext=path.extname(file).toLowerCase();
    res.set("Content-Type",ext===".jpg"?"image/jpeg":ext===".png"?"image/png":"image/webp");
    res.set("Cache-Control","private, no-store");
    res.set("X-Content-Type-Options","nosniff");
    res.send(buffer);
  }catch(e){if(e?.code==="ENOENT")return res.status(404).end();next(e);}
});
