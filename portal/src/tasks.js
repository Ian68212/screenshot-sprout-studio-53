import { Router } from "express";
import { q, auditar } from "./db.js";
import { exigir } from "./auth.js";

// Fase 1: API isolada; exige sessão do Portal e filtra projetos por associação.
export const tarefasRouter = Router();
tarefasRouter.use(exigir("painel"));
const idValido = v => Number.isSafeInteger(Number(v)) && Number(v)>0;
const isAdmin = req => req.usuario.perfil === "admin";
async function podeAcessar(req, projetoId) {
 const [row] = await q("SELECT p.id FROM rt_projetos p LEFT JOIN rt_projeto_membros m ON m.projeto_id=p.id AND m.usuario_id=? WHERE p.id=? AND p.ativo=1 AND (p.criado_por=? OR m.usuario_id IS NOT NULL OR ?=1) LIMIT 1",[req.usuario.id,projetoId,req.usuario.id,isAdmin(req)?1:0]);
 return Boolean(row);
}
async function podeGerenciar(req, projetoId) {
 if(isAdmin(req))return true;
 const [row]=await q("SELECT p.id FROM rt_projetos p LEFT JOIN rt_projeto_membros m ON m.projeto_id=p.id AND m.usuario_id=? WHERE p.id=? AND (p.criado_por=? OR m.papel='gestor') LIMIT 1",[req.usuario.id,projetoId,req.usuario.id]);
 return Boolean(row);
}
tarefasRouter.get("/projetos",async(req,res,next)=>{try{
 const rows=await q("SELECT DISTINCT p.id,p.nome,p.descricao,p.setor_id,p.criado_em FROM rt_projetos p LEFT JOIN rt_projeto_membros m ON m.projeto_id=p.id AND m.usuario_id=? WHERE p.ativo=1 AND (?=1 OR p.criado_por=? OR m.usuario_id IS NOT NULL) ORDER BY p.nome",[req.usuario.id,isAdmin(req)?1:0,req.usuario.id]);
 res.json(rows);
}catch(e){next(e)}});
tarefasRouter.post("/projetos",async(req,res,next)=>{try{
 if(!isAdmin(req)&&req.usuario.perfil!=="gestor")return res.status(403).json({erro:"Sem permissão para criar projetos"});
 const nome=String(req.body?.nome||"").trim();
 if(!nome||nome.length>160)return res.status(400).json({erro:"Nome inválido"});
 const [out]=await q("INSERT INTO rt_projetos(nome,descricao,criado_por) VALUES (?,?,?)",[nome,String(req.body?.descricao||"").slice(0,4000),req.usuario.id]);
 await auditar(req.usuario.id,"rt_criou_projeto",String(out.insertId),req.ip);
 res.status(201).json({id:out.insertId});
}catch(e){next(e)}});
tarefasRouter.post("/projetos/:id/membros",async(req,res,next)=>{try{
 const projetoId=req.params.id,usuarioId=req.body?.usuario_id;
 if(!idValido(projetoId)||!idValido(usuarioId))return res.status(400).json({erro:"Identificador inválido"});
 if(!await podeGerenciar(req,projetoId))return res.status(403).json({erro:"Sem permissão"});
 const papel=req.body?.papel==="gestor"?"gestor":"membro";
 const [usuario]=await q("SELECT id FROM usuarios WHERE id=? AND ativo=1",[usuarioId]);
 if(!usuario)return res.status(404).json({erro:"Usuário não encontrado"});
 await q("INSERT INTO rt_projeto_membros(projeto_id,usuario_id,papel) VALUES (?,?,?) ON DUPLICATE KEY UPDATE papel=VALUES(papel)",[projetoId,usuarioId,papel]);
 await auditar(req.usuario.id,"rt_atualizou_membro",projetoId+":"+usuarioId,req.ip);
 res.json({ok:true});
}catch(e){next(e)}});
tarefasRouter.get("/projetos/:id/tarefas",async(req,res,next)=>{try{
 const id=req.params.id;
 if(!idValido(id))return res.status(400).json({erro:"Projeto inválido"});
 if(!await podeAcessar(req,id))return res.status(403).json({erro:"Sem acesso ao projeto"});
 const rows=await q("SELECT t.id,t.titulo,t.descricao,t.status,t.prioridade,t.prazo_em,t.atualizado_em FROM rt_tarefas t WHERE t.projeto_id=? ORDER BY t.criado_em DESC LIMIT 300",[id]);
 res.json(rows);
}catch(e){next(e)}});
tarefasRouter.post("/projetos/:id/tarefas",async(req,res,next)=>{try{
 const id=req.params.id,titulo=String(req.body?.titulo||"").trim();
 if(!idValido(id)||!titulo||titulo.length>220)return res.status(400).json({erro:"Dados inválidos"});
 if(!await podeAcessar(req,id))return res.status(403).json({erro:"Sem acesso ao projeto"});
 const [out]=await q("INSERT INTO rt_tarefas(projeto_id,titulo,descricao,criado_por) VALUES (?,?,?,?)",[id,titulo,String(req.body?.descricao||"").slice(0,10000),req.usuario.id]);
 await q("INSERT INTO rt_historico(tarefa_id,usuario_id,evento) VALUES (?,?,?)",[out.insertId,req.usuario.id,"criada"]);
 res.status(201).json({id:out.insertId});
}catch(e){next(e)}});
tarefasRouter.patch("/tarefas/:id",async(req,res,next)=>{try{
 const id=req.params.id;
 if(!idValido(id))return res.status(400).json({erro:"Tarefa inválida"});
 const [task]=await q("SELECT projeto_id FROM rt_tarefas WHERE id=?",[id]);
 if(!task)return res.status(404).json({erro:"Tarefa não encontrada"});
 if(!await podeAcessar(req,task.projeto_id))return res.status(403).json({erro:"Sem acesso"});
 const status=req.body?.status;
 if(!["a_fazer","andamento","revisao","concluida"].includes(status))return res.status(400).json({erro:"Status inválido"});
 await q("UPDATE rt_tarefas SET status=?,atualizado_por=? WHERE id=?",[status,req.usuario.id,id]);
 await q("INSERT INTO rt_historico(tarefa_id,usuario_id,evento,detalhes) VALUES (?,?,?,?)",[id,req.usuario.id,"status_alterado",JSON.stringify({status})]);
 res.json({ok:true});
}catch(e){next(e)}});
