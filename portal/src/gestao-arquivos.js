import {Router} from "express";
import {exigir} from "./auth.js";
import {q,auditar} from "./db.js";
import {listManagedDriveFiles,managedDriveFile,trashManagedDriveFile,streamDriveFile} from "./drive-storage.js";
const router=Router();
router.use(exigir("admin.usuarios"));
const wrap=fn=>async(req,res,next)=>{try{await fn(req,res)}catch(e){next(e)}};
router.get("/listar",wrap(async(req,res)=>{
 const token=String(req.query.pageToken||"");
 if(token.length>500)return res.status(400).json({erro:"Página inválida"});
 const data=await listManagedDriveFiles(token||undefined);
 const files=data.files||[];
 const ids=files.filter(f=>f.mimeType!=="application/vnd.google-apps.folder").map(f=>f.id);
 let chat=[];
 if(ids.length){
  try{chat=await q("SELECT a.drive_id,m.remetente_id,m.destinatario_id FROM chat_interno_anexos a JOIN chat_interno_mensagens m ON m.id=a.mensagem_id WHERE a.drive_id IN ("+ids.map(()=>"?").join(",")+")",ids)}catch(_){}
 }
 const chatMap=new Map(chat.map(x=>[x.drive_id,x]));
 res.set("Cache-Control","no-store").json({files:files.map(f=>({...f,chat:chatMap.get(f.id)||null})),nextPageToken:data.nextPageToken||null});
}));
router.get("/baixar/:id",wrap(async(req,res)=>{
 const f=await managedDriveFile(req.params.id);
 if(f.trashed||f.mimeType==="application/vnd.google-apps.folder")return res.status(404).json({erro:"Arquivo não disponível"});
 res.set("Cache-Control","private, no-store");
 res.set("Content-Type",f.mimeType||"application/octet-stream");
 res.set("X-Content-Type-Options","nosniff");
 res.set("Content-Disposition","attachment; filename*=UTF-8''"+encodeURIComponent(f.name||"arquivo"));
 await streamDriveFile(f.id,res);
}));
router.post("/lixeira/:id",wrap(async(req,res)=>{
 const f=await managedDriveFile(req.params.id);
 if(f.trashed)return res.status(404).json({erro:"Arquivo já está na lixeira"});
 if(f.mimeType==="application/vnd.google-apps.folder")return res.status(400).json({erro:"Exclusão de pastas não disponível"});
 await trashManagedDriveFile(f.id);
 await auditar(req.usuario.id,"arquivo_google_lixeira","Arquivo enviado à lixeira: "+f.name+" ("+f.id+")",req.ip);
 res.json({ok:true});
}));
export default router;
