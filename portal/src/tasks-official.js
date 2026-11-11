import { Router } from "express";
import { q } from "./db.js";
import { exigir } from "./auth.js";
export const tasksRouter = Router();
tasksRouter.use(exigir("painel"));
let setupPromise;
async function setup(){
 if(!setupPromise)setupPromise=(async()=>{
 await q(`CREATE TABLE IF NOT EXISTS rp_task_projects (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, name VARCHAR(160) NOT NULL, created_by INT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, INDEX(created_by)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
 await q(`CREATE TABLE IF NOT EXISTS rp_task_items (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, project_id BIGINT UNSIGNED NOT NULL, title VARCHAR(220) NOT NULL, description TEXT NULL, owner_id INT NULL, priority ENUM('baixa','normal','alta','urgente') NOT NULL DEFAULT 'normal', status ENUM('a_fazer','andamento','revisao','concluida') NOT NULL DEFAULT 'a_fazer', due_date DATE NULL, created_by INT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, INDEX(project_id), INDEX(owner_id), FOREIGN KEY(project_id) REFERENCES rp_task_projects(id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
 await q(`CREATE TABLE IF NOT EXISTS rp_task_comments (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, task_id BIGINT UNSIGNED NOT NULL, author_id INT NOT NULL, body TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, INDEX(task_id), FOREIGN KEY(task_id) REFERENCES rp_task_items(id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
 })().catch(e=>{setupPromise=null;throw e});
 return setupPromise;
}
const wrap=f=>(req,res,next)=>Promise.resolve().then(()=>setup()).then(()=>f(req,res)).catch(next);
const admin=req=>req.usuario.perfil==="admin";
const validId=v=>/^\d+$/.test(String(v))&&Number(v)>0;
tasksRouter.get("/projects",wrap(async(req,res)=>{
 const rows=admin(req)?await q("SELECT * FROM rp_task_projects ORDER BY id DESC"):await q("SELECT DISTINCT p.* FROM rp_task_projects p JOIN rp_task_items t ON t.project_id=p.id WHERE t.owner_id=? OR t.created_by=? ORDER BY p.id DESC",[req.usuario.id,req.usuario.id]);
 res.json(rows);
}));
tasksRouter.post("/projects",wrap(async(req,res)=>{
 if(!admin(req))return res.status(403).json({erro:"Somente administradores podem criar projetos"});
 const name=String(req.body?.name||"").trim().slice(0,160);
 if(!name)return res.status(400).json({erro:"Informe o nome"});
 const out=await q("INSERT INTO rp_task_projects(name,created_by) VALUES (?,?)",[name,req.usuario.id]);res.status(201).json({id:out.insertId});
}));
tasksRouter.get("/items",wrap(async(req,res)=>{
 const rows=admin(req)?await q("SELECT t.*,p.name project_name,u.nome owner_name FROM rp_task_items t JOIN rp_task_projects p ON p.id=t.project_id LEFT JOIN usuarios u ON u.id=t.owner_id ORDER BY t.id DESC"):await q("SELECT t.*,p.name project_name,u.nome owner_name FROM rp_task_items t JOIN rp_task_projects p ON p.id=t.project_id LEFT JOIN usuarios u ON u.id=t.owner_id WHERE t.owner_id=? OR t.created_by=? ORDER BY t.id DESC",[req.usuario.id,req.usuario.id]);
 res.json(rows);
}));
tasksRouter.post("/items",wrap(async(req,res)=>{
 if(!admin(req))return res.status(403).json({erro:"Somente administradores podem delegar"});
 const {project_id,owner_id}=req.body||{},title=String(req.body?.title||"").trim().slice(0,220),description=String(req.body?.description||"").slice(0,10000);
 if(!validId(project_id)||!title||owner_id!=null&&!validId(owner_id))return res.status(400).json({erro:"Dados inválidos"});
 const [p]=await q("SELECT id FROM rp_task_projects WHERE id=?",[project_id]);if(!p)return res.status(404).json({erro:"Projeto não encontrado"});
 if(owner_id!=null){const [u]=await q("SELECT id FROM usuarios WHERE id=? AND ativo=1",[owner_id]);if(!u)return res.status(400).json({erro:"Responsável inválido"});}
 const priority=["baixa","normal","alta","urgente"].includes(req.body?.priority)?req.body.priority:"normal";
 const due=req.body?.due_date||null;if(due&&!/^\d{4}-\d{2}-\d{2}$/.test(due))return res.status(400).json({erro:"Prazo inválido"});
 const out=await q("INSERT INTO rp_task_items(project_id,title,description,owner_id,priority,due_date,created_by) VALUES (?,?,?,?,?,?,?)",[project_id,title,description,owner_id??null,priority,due,req.usuario.id]);res.status(201).json({id:out.insertId});
}));
tasksRouter.patch("/items/:id",wrap(async(req,res)=>{
 if(!validId(req.params.id))return res.status(400).json({erro:"ID inválido"});
 const [t]=await q("SELECT * FROM rp_task_items WHERE id=?",[req.params.id]);if(!t)return res.status(404).json({erro:"Tarefa não encontrada"});
 if(!admin(req)&&Number(t.owner_id)!==Number(req.usuario.id))return res.status(403).json({erro:"Sem acesso"});
 const status=req.body?.status;if(!["a_fazer","andamento","revisao","concluida"].includes(status))return res.status(400).json({erro:"Status inválido"});
 await q("UPDATE rp_task_items SET status=? WHERE id=?",[status,t.id]);res.json({ok:true});
}));

tasksRouter.get("/comments/:id",wrap(async(req,res)=>{
 if(!validId(req.params.id))return res.status(400).json({erro:"ID inválido"});
 const [task]=await q("SELECT owner_id,created_by FROM rp_task_items WHERE id=?",[req.params.id]);
 if(!task)return res.status(404).json({erro:"Tarefa não encontrada"});
 if(!admin(req)&&Number(task.owner_id)!==Number(req.usuario.id)&&Number(task.created_by)!==Number(req.usuario.id))return res.status(403).json({erro:"Sem acesso"});
 res.json(await q("SELECT c.id,c.body,c.created_at,u.nome author_name FROM rp_task_comments c JOIN usuarios u ON u.id=c.author_id WHERE c.task_id=? ORDER BY c.id ASC",[req.params.id]));
}));
tasksRouter.post("/comments/:id",wrap(async(req,res)=>{
 if(!validId(req.params.id))return res.status(400).json({erro:"ID inválido"});
 const [task]=await q("SELECT owner_id,created_by FROM rp_task_items WHERE id=?",[req.params.id]);
 if(!task)return res.status(404).json({erro:"Tarefa não encontrada"});
 if(!admin(req)&&Number(task.owner_id)!==Number(req.usuario.id)&&Number(task.created_by)!==Number(req.usuario.id))return res.status(403).json({erro:"Sem acesso"});
 const body=String(req.body?.body||"").trim();
 if(!body||body.length>4000)return res.status(400).json({erro:"Comentário deve ter entre 1 e 4000 caracteres"});
 const result=await q("INSERT INTO rp_task_comments(task_id,author_id,body) VALUES (?,?,?)",[req.params.id,req.usuario.id,body]);
 res.status(201).json({id:result.insertId});
}));
