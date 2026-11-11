import { Router } from "express";
import { q } from "./db.js";
import { exigir } from "./auth.js";
import { taskPolicy } from "./access-profiles.js";
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

tasksRouter.delete("/items/:id",wrap(async(req,res)=>{
 if(!admin(req))return res.status(403).json({erro:"Somente administradores podem excluir tarefas"});
 if(!validId(req.params.id))return res.status(400).json({erro:"ID inválido"});
 const rows=await q("SELECT id FROM rp_task_items WHERE id=?",[req.params.id]);
 if(!rows.length)return res.status(404).json({erro:"Tarefa não encontrada"});
 await q("DELETE FROM rp_task_comments WHERE task_id=?",[req.params.id]);
 await q("DELETE FROM rp_task_items WHERE id=?",[req.params.id]);
 res.json({ok:true});
}));
tasksRouter.delete("/projects/:id",wrap(async(req,res)=>{
 if(!admin(req))return res.status(403).json({erro:"Somente administradores podem excluir projetos"});
 if(!validId(req.params.id))return res.status(400).json({erro:"ID inválido"});
 const rows=await q("SELECT id FROM rp_task_projects WHERE id=?",[req.params.id]);
 if(!rows.length)return res.status(404).json({erro:"Projeto não encontrado"});
 const items=await q("SELECT id FROM rp_task_items WHERE project_id=?",[req.params.id]);
 for(const item of items)await q("DELETE FROM rp_task_comments WHERE task_id=?",[item.id]);
 await q("DELETE FROM rp_task_items WHERE project_id=?",[req.params.id]);
 await q("DELETE FROM rp_task_projects WHERE id=?",[req.params.id]);
 res.json({ok:true});
}));

/* Shared state for the approved full Tasks interface. Starts empty; never imports browser demos. */
tasksRouter.get("/board",wrap(async(req,res)=>{
 await q("CREATE TABLE IF NOT EXISTS rp_task_board (id INT PRIMARY KEY, revision BIGINT NOT NULL DEFAULT 0, state_json LONGTEXT NOT NULL, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
 await q("INSERT IGNORE INTO rp_task_board(id,revision,state_json) VALUES (1,0,'{\"projects\":[],\"tasks\":[],\"trash\":[]}')");
 const [row]=await q("SELECT revision,state_json FROM rp_task_board WHERE id=1");
 res.setHeader("Cache-Control","no-store");
 const policy=await taskPolicy(req.usuario);
 res.json({revision:Number(row.revision),state:JSON.parse(row.state_json),permissions:policy,user:{id:req.usuario.id,nome:req.usuario.nome,email:req.usuario.email,perfil:req.usuario.perfil}});
}));
tasksRouter.put("/board",wrap(async(req,res)=>{
 const state=req.body?.state,revision=req.body?.revision;
 if(!state||!Array.isArray(state.projects)||!Array.isArray(state.tasks)||!Array.isArray(state.trash)||!Number.isSafeInteger(revision))return res.status(400).json({erro:"Estado inválido"});
 if(state.projects.length>1000||state.tasks.length>10000||state.trash.length>10000)return res.status(413).json({erro:"Limite excedido"});
 const json=JSON.stringify(state);if(json.length>3000000)return res.status(413).json({erro:"Dados excedem 3 MB"});
 const [current]=await q("SELECT revision,state_json FROM rp_task_board WHERE id=1");
 if(!current||Number(current.revision)!==revision)return res.status(409).json({erro:"O quadro foi alterado. Atualize antes de salvar."});
 if(!admin(req)){
   const policy=await taskPolicy(req.usuario);
   const grants=policy.grants;
   const before=JSON.parse(current.state_json);
   const userId=Number(req.usuario.id);
   const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
   const allowed=(task)=>policy.scope==="all"||Number(task.ownerId)===userId||Number(task.createdById)===userId;
   const has=(action)=>grants[action]===true;
   const deny=(message)=>res.status(403).json({erro:message});
   if(!same(before.trash,state.trash))return deny("Alterações na lixeira exigem administrador.");
   const previousProjects=new Map(before.projects.map(p=>[String(p.id),p]));
   const currentProjects=new Map(state.projects.map(p=>[String(p.id),p]));
   if(currentProjects.size!==state.projects.length||previousProjects.size!==before.projects.length)return deny("Projetos duplicados.");
   for(const p of state.projects){
     const old=previousProjects.get(String(p.id));
     if(!old&&!has("projects.create"))return deny("Sem permissão para criar projetos.");
     if(old&&!same(old,p)&&!has("projects.edit"))return deny("Sem permissão para editar projetos.");
   }
   for(const p of before.projects)if(!currentProjects.has(String(p.id)))return deny("Exclusão de projetos restrita ao administrador.");
   const previous=new Map(before.tasks.map(t=>[String(t.id),t]));
   const currentTasks=new Map(state.tasks.map(t=>[String(t.id),t]));
   if(currentTasks.size!==state.tasks.length||previous.size!==before.tasks.length)return deny("Identificadores de tarefas duplicados.");
   for(const t of state.tasks){
     const old=previous.get(String(t.id));
     if(!old){
       if(!has("tasks.create"))return deny("Sem permissão para criar tarefas.");
       if(!currentProjects.has(String(t.projectId)))return deny("Projeto inválido.");
       if(Number(t.ownerId)!==userId&&!has("tasks.assign"))return deny("Sem permissão para delegar.");
       continue;
     }
     if(same(old,t))continue;
     if(!allowed(old))return deny("Tarefa fora do seu alcance.");
     if(!same(old.id,t.id)||!same(old.projectId,t.projectId)||!same(old.createdBy,t.createdBy)||!same(old.createdById,t.createdById))return deny("Identificação protegida.");
     const changes=[
       ["ownerId","tasks.assign"],["ownerEmail","tasks.assign"],["owner","tasks.assign"],["manager","tasks.assign"],
       ["due","tasks.due"],["priority","tasks.priority"],["checklist","tasks.checklist"],
       ["comments","tasks.comment"],["repeat","tasks.recurrence"],["status","tasks.status"]
     ];
     for(const [field,action] of changes)if(!same(old[field],t[field])&&!has(action))return deny("Sem permissão: "+action);
     const protectedFields=new Set(["ownerId","ownerEmail","owner","manager","due","priority","checklist","comments","repeat","status","history","id","projectId","createdBy","createdById"]);
     for(const field of new Set([...Object.keys(old),...Object.keys(t)])){
       if(!same(old[field],t[field])&&!protectedFields.has(field))return deny("Alteração não autorizada: "+field);
     }
     if(!same(old.history,t.history)){
       if(!changes.some(([field,action])=>!same(old[field],t[field])&&has(action)))return deny("Histórico sem alteração autorizada.");
       if(!Array.isArray(t.history)||t.history.length<(old.history?.length||0)||!same(t.history.slice(0,old.history?.length||0),old.history||[]))return deny("Histórico anterior protegido.");
     }
   }
   for(const t of before.tasks)if(!currentTasks.has(String(t.id))){
     if(!has("tasks.delete")||!allowed(t))return deny("Sem permissão para excluir esta tarefa.");
   }
 }

 const result=await q("UPDATE rp_task_board SET state_json=?,revision=revision+1 WHERE id=1 AND revision=?",[json,revision]);
 if(!result.affectedRows)return res.status(409).json({erro:"Outro usuário atualizou o quadro. Recarregue antes de salvar."});
 res.json({revision:revision+1});
}));
