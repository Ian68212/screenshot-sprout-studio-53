import {Router} from "express";
import multer from "multer";
import {exigir} from "./auth.js";
import {q,auditar} from "./db.js";
import {listManagedDriveFiles,managedDriveFile,trashManagedDriveFile,streamDriveFile,uploadManagedDriveFile} from "./drive-storage.js";
const router=Router();
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:25*1024*1024,files:1}});
const categories=["Administração","Financeiro","RH","PCP","Compras","Almoxarifado","Produção","Qualidade","Segurança do Trabalho","Treinamentos","Tarefas","Chat Interno","Midias do site","Curriculos","Documentos","Outros"];
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
 const site=await q("SELECT caminho FROM site_midias WHERE caminho LIKE 'gdrive:%'").catch(()=>[]);
 const siteIds=new Set(site.map(x=>x.caminho.slice(7)));
 const tasks=await q("SELECT drive_file_id FROM rp_task_attachments WHERE drive_file_id IS NOT NULL").catch(()=>[]);
 const taskIds=new Set(tasks.map(x=>x.drive_file_id));
 res.set("Cache-Control","no-store").json({files:files.map(f=>({...f,chat:chatMap.get(f.id)||null,origem:siteIds.has(f.id)?"Mídias do site":taskIds.has(f.id)?"Tarefas":chatMap.has(f.id)?"Chat Interno":null,emUso:siteIds.has(f.id)||taskIds.has(f.id)||chatMap.has(f.id)})),nextPageToken:data.nextPageToken||null});
}));
router.get("/categorias",(_req,res)=>res.json({categories}));
router.post("/adicionar",upload.single("arquivo"),wrap(async(req,res)=>{
 const category=String(req.body?.categoria||"");
 if(!categories.includes(category)||!req.file)return res.status(400).json({erro:"Escolha uma categoria e um arquivo de até 25 MB"});
 const id=await uploadManagedDriveFile({category,name:req.file.originalname,mime:req.file.mimetype,buffer:req.file.buffer});
 await auditar(req.usuario.id,"gestao_arquivos_upload",category+": "+req.file.originalname+" ("+id+")",req.ip);
 res.status(201).json({ok:true,id});
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
 const [site]=await q("SELECT id FROM site_midias WHERE caminho=? LIMIT 1",["gdrive:"+f.id]).catch(()=>[]);
 const [task]=await q("SELECT id FROM rp_task_attachments WHERE drive_file_id=? LIMIT 1",[f.id]).catch(()=>[]);
 const [chat]=await q("SELECT mensagem_id FROM chat_interno_anexos WHERE drive_id=? LIMIT 1",[f.id]).catch(()=>[]);
 if(site||task||chat)return res.status(409).json({erro:"Arquivo vinculado a "+(site?"uma mídia do site":task?"uma tarefa":"uma conversa")+". Exclua ou substitua pelo módulo de origem."});
 await trashManagedDriveFile(f.id);
 await auditar(req.usuario.id,"arquivo_google_lixeira","Arquivo enviado à lixeira: "+f.name+" ("+f.id+")",req.ip);
 res.json({ok:true});
}));
export default router;
