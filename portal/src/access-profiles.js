import { Router } from "express";
import { q, auditar } from "./db.js";
import { exigir } from "./auth.js";

export const accessProfilesRouter = Router();
accessProfilesRouter.use(exigir("admin.usuarios"));
export const TASK_ACTIONS = Object.freeze(["projects.view","projects.create","projects.edit","tasks.create","tasks.assign","tasks.due","tasks.priority","tasks.checklist","tasks.comment","tasks.recurrence","tasks.delete","tasks.history","tasks.status","tasks.all","tasks.attachments.upload","tasks.attachments.delete"]);
let initialized;
async function schema() {
  if (!initialized) initialized = (async () => {
    await q(`CREATE TABLE IF NOT EXISTS rp_access_profiles (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL UNIQUE,
      description VARCHAR(500) NOT NULL DEFAULT '',
      scope ENUM('own','sector','all') NOT NULL DEFAULT 'own',
      grants_json TEXT NOT NULL,
      active TINYINT(1) NOT NULL DEFAULT 1,
      created_by INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await q(`CREATE TABLE IF NOT EXISTS rp_access_profile_users (
      user_id INT NOT NULL PRIMARY KEY,
      profile_id BIGINT UNSIGNED NOT NULL,
      assigned_by INT NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX(profile_id),
      FOREIGN KEY (profile_id) REFERENCES rp_access_profiles(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  })().catch(e => { initialized=null; throw e; });
  return initialized;
}
const wrap = fn => async (req,res,next) => { try { await schema(); await fn(req,res); } catch(e) { next(e); } };
const idOk = v => /^[1-9][0-9]*$/.test(String(v));
function validate(body) {
  const name=typeof body?.name==="string"?body.name.trim():"";
  const description=typeof body?.description==="string"?body.description.trim():"";
  const scope=body?.scope;
  const grants=body?.grants;
  if (!name || name.length>120 || description.length>500 || !["own","sector","all"].includes(scope) || !grants || typeof grants!=="object" || Array.isArray(grants) || Object.keys(grants).some(k=>!TASK_ACTIONS.includes(k)||typeof grants[k]!=="boolean"))
    return null;
  return {name,description,scope,grants};
}
accessProfilesRouter.get("/",wrap(async (_req,res)=>{
 const profiles=await q("SELECT id,name,description,scope,grants_json,active,created_at FROM rp_access_profiles ORDER BY name");
 const assignments=await q("SELECT user_id,profile_id FROM rp_access_profile_users");
 res.set("Cache-Control","no-store").json({actions:TASK_ACTIONS,profiles:profiles.map(({grants_json,...p})=>({...p,grants:JSON.parse(grants_json)})),assignments});
}));
accessProfilesRouter.post("/",wrap(async (req,res)=>{
 const data=validate(req.body);
 if(!data)return res.status(400).json({erro:"Dados do perfil inválidos"});
 const out=await q("INSERT INTO rp_access_profiles (name,description,scope,grants_json,created_by) VALUES (?,?,?,?,?)",[data.name,data.description,data.scope,JSON.stringify(data.grants),req.usuario.id]);
 await auditar(req.usuario.id,"criou_perfil_acesso",data.name,req.ip);
 res.status(201).json({id:out.insertId});
}));
accessProfilesRouter.put("/:id",wrap(async(req,res)=>{
 if(!idOk(req.params.id))return res.status(400).json({erro:"ID inválido"});
 const data=validate(req.body);
 if(!data||typeof req.body.active!=="boolean")return res.status(400).json({erro:"Dados do perfil inválidos"});
 const [p]=await q("SELECT id FROM rp_access_profiles WHERE id=?",[req.params.id]);
 if(!p)return res.status(404).json({erro:"Perfil não encontrado"});
 await q("UPDATE rp_access_profiles SET name=?,description=?,scope=?,grants_json=?,active=? WHERE id=?",[data.name,data.description,data.scope,JSON.stringify(data.grants),req.body.active?1:0,req.params.id]);
 await auditar(req.usuario.id,"editou_perfil_acesso",data.name,req.ip);
 res.json({ok:true});
}));
accessProfilesRouter.put("/users/:userId",wrap(async(req,res)=>{
 const userId=req.params.userId,profileId=req.body?.profile_id;
 if(!idOk(userId)||profileId!==null&&!idOk(profileId))return res.status(400).json({erro:"IDs inválidos"});
 const [user]=await q("SELECT id,perfil FROM usuarios WHERE id=?",[userId]);
 if(!user)return res.status(404).json({erro:"Colaborador não encontrado"});
 if(user.perfil==="admin")return res.status(403).json({erro:"O administrador principal mantém seu perfil protegido"});
 if(profileId===null)await q("DELETE FROM rp_access_profile_users WHERE user_id=?",[userId]);
 else {
  const [profile]=await q("SELECT id FROM rp_access_profiles WHERE id=? AND active=1",[profileId]);
  if(!profile)return res.status(400).json({erro:"Perfil personalizado inativo ou inexistente"});
  await q("INSERT INTO rp_access_profile_users (user_id,profile_id,assigned_by) VALUES (?,?,?) ON DUPLICATE KEY UPDATE profile_id=VALUES(profile_id),assigned_by=VALUES(assigned_by)",[userId,profileId,req.usuario.id]);
 }
 await auditar(req.usuario.id,"atribuiu_perfil_acesso",`usuario:${userId} perfil:${profileId}`,req.ip);
 res.json({ok:true});
}));

export async function taskPolicy(user) {
 await schema();
 if(user.perfil==="admin")return {scope:"all",grants:Object.fromEntries(TASK_ACTIONS.map(k=>[k,true])),custom:false};
 const [row]=await q("SELECT p.scope,p.grants_json FROM rp_access_profile_users a JOIN rp_access_profiles p ON p.id=a.profile_id WHERE a.user_id=? AND p.active=1",[user.id]);
 if(row)return {scope:row.scope,grants:JSON.parse(row.grants_json),custom:true};
 return {scope:"own",grants:{"projects.view":true,"tasks.status":true,"tasks.comment":true,"tasks.history":true},custom:false};
}
