import { Router } from "express";
import multer from "multer";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { q, auditar } from "./db.js";
import { exigir } from "./auth.js";
import { taskPolicy } from "./access-profiles.js";
import { uploadDriveFile, readDriveFile, deleteDriveFile } from "./drive-storage.js";

export const taskAttachmentsRouter = Router();
taskAttachmentsRouter.use(exigir("painel"));
const folder=path.resolve(process.env.TASK_ATTACHMENTS_DIR || path.join(process.cwd(),"private","task-attachments"));
const allowed=new Set([".pdf",".png",".jpg",".jpeg",".webp",".txt",".csv",".doc",".docx",".xls",".xlsx"]);
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:10*1024*1024,files:1},fileFilter:(_req,file,cb)=>{
 const ext=path.extname(file.originalname).toLowerCase();
 cb(null,allowed.has(ext));
}}).single("arquivo");
let ready;
async function schema(){
 if(!ready)ready=q(`CREATE TABLE IF NOT EXISTS rp_task_attachments (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 task_id VARCHAR(120) NOT NULL,
 stored_name VARCHAR(80) NOT NULL,
 original_name VARCHAR(255) NOT NULL,
 mime_type VARCHAR(150) NOT NULL,
 file_size INT UNSIGNED NOT NULL,
 uploaded_by INT NOT NULL,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 INDEX(task_id)
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`).catch(e=>{ready=null;throw e});
 await ready;
 const cols=await q("SHOW COLUMNS FROM rp_task_attachments LIKE 'drive_file_id'");
 if(!cols.length)await q("ALTER TABLE rp_task_attachments ADD COLUMN drive_file_id VARCHAR(200) NULL");
 return ready;
}
const wrap=fn=>async(req,res,next)=>{try{await schema();await fn(req,res);}catch(e){next(e)}};
const admin=req=>req.usuario.perfil==="admin";
async function access(req,taskId,action){
 const [board]=await q("SELECT state_json FROM rp_task_board WHERE id=1");
 if(!board)return false;
 const task=(JSON.parse(board.state_json).tasks||[]).find(t=>String(t.id)===String(taskId));
 if(!task)return false;
 const policy=await taskPolicy(req.usuario);
 const owned=Number(task.ownerId)===Number(req.usuario.id)||Number(task.createdById)===Number(req.usuario.id);
 if(!admin(req)&&!owned)return false;
 return !action||admin(req)||policy.grants[action]===true;
}
taskAttachmentsRouter.get("/:taskId",wrap(async(req,res)=>{
 if(!await access(req,req.params.taskId))return res.status(403).json({erro:"Sem acesso à tarefa"});
 const rows=await q("SELECT id,original_name AS name,file_size AS size,uploaded_by,created_at FROM rp_task_attachments WHERE task_id=? ORDER BY id",[req.params.taskId]);
 res.set("Cache-Control","no-store").json(rows);
}));
taskAttachmentsRouter.post("/:taskId",wrap(async(req,res,next)=>{
 if(!await access(req,req.params.taskId,"tasks.attachments.upload"))return res.status(403).json({erro:"Sem permissão para anexar documentos"});
 upload(req,res,async err=>{
  if(err)return next(err);
  if(!req.file)return res.status(400).json({erro:"Arquivo ausente ou formato não permitido"});
  try{
   const driveId=await uploadDriveFile({category:"Tarefas",name:req.file.originalname,mime:req.file.mimetype,buffer:req.file.buffer});
   let out;
   try{out=await q("INSERT INTO rp_task_attachments(task_id,stored_name,original_name,mime_type,file_size,uploaded_by,drive_file_id) VALUES (?,?,?,?,?,?,?)",
    [req.params.taskId,crypto.randomUUID(),path.basename(req.file.originalname).slice(0,255),req.file.mimetype,req.file.size,req.usuario.id,driveId]);}
   catch(e){await deleteDriveFile(driveId).catch(()=>{});throw e;}
   await auditar(req.usuario.id,"anexou_documento_tarefa",String(req.params.taskId),req.ip);
   res.status(201).json({id:out.insertId,name:req.file.originalname,size:req.file.size});
  }catch(e){next(e)}
 });
}));
taskAttachmentsRouter.get("/:taskId/:id/download",wrap(async(req,res)=>{
 if(!await access(req,req.params.taskId))return res.status(403).json({erro:"Sem acesso à tarefa"});
 const [row]=await q("SELECT * FROM rp_task_attachments WHERE id=? AND task_id=?",[req.params.id,req.params.taskId]);
 if(!row)return res.status(404).json({erro:"Anexo não encontrado"});
 res.set("Cache-Control","private, no-store");
 if(row.drive_file_id){
  const bytes=await readDriveFile(row.drive_file_id);
  res.set("Content-Type","application/octet-stream");
  res.set("X-Content-Type-Options","nosniff");
  res.set("Content-Disposition","attachment; filename*=UTF-8''"+encodeURIComponent(row.original_name));
  return res.send(bytes);
 }
 res.download(path.join(folder,row.stored_name),row.original_name);
}));
taskAttachmentsRouter.delete("/:taskId/:id",wrap(async(req,res)=>{
 if(!await access(req,req.params.taskId,"tasks.attachments.delete"))return res.status(403).json({erro:"Sem permissão para excluir anexos"});
 const [row]=await q("SELECT * FROM rp_task_attachments WHERE id=? AND task_id=?",[req.params.id,req.params.taskId]);
 if(!row)return res.status(404).json({erro:"Anexo não encontrado"});
 if(row.drive_file_id)await deleteDriveFile(row.drive_file_id);
 await q("DELETE FROM rp_task_attachments WHERE id=?",[row.id]);
 if(!row.drive_file_id)await fs.unlink(path.join(folder,row.stored_name)).catch(()=>{});
 await auditar(req.usuario.id,"excluiu_documento_tarefa",String(req.params.taskId),req.ip);
 res.json({ok:true});
}));
