import express from "express";
import {q,auditar} from "./db.js";
import {exigir} from "./auth.js";
const router=express.Router();
router.use(exigir("painel"));
let initialized;
async function ready(){if(!initialized)initialized=q(`CREATE TABLE IF NOT EXISTS propostas_comerciais (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 usuario_id BIGINT NOT NULL,
 numero VARCHAR(50) NOT NULL,
 data_proposta DATE NULL,
 destinatario VARCHAR(190) NOT NULL,
 titulo VARCHAR(240) NOT NULL,
 introducao TEXT NOT NULL,
 itens_json JSON NOT NULL,
 prazo VARCHAR(240) NOT NULL,
 pagamento VARCHAR(240) NOT NULL,
 garantia VARCHAR(240) NOT NULL,
 status VARCHAR(30) NOT NULL DEFAULT 'rascunho',
 criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 INDEX idx_propostas_usuario(usuario_id),
 INDEX idx_propostas_data(atualizado_em)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`).catch(e=>{initialized=null;throw e});return initialized}
function validate(body){const s=(v,max)=>String(v??"").trim().slice(0,max);const itens=Array.isArray(body.itens)?body.itens.slice(0,60).map(i=>({descricao:s(i.descricao,350),valor:Number(i.valor)})):[];if(!itens.length||itens.some(i=>!i.descricao||!Number.isFinite(i.valor)||i.valor<0||i.valor>1e9))throw Object.assign(new Error("Preencha os itens com descrição e valores válidos."),{status:400});const o={numero:s(body.numero,50),data:/^\d{4}-\d{2}-\d{2}$/.test(String(body.data||""))?String(body.data):null,destinatario:s(body.destinatario,190),titulo:s(body.titulo,240),introducao:s(body.introducao,3000),itens,prazo:s(body.prazo,240),pagamento:s(body.pagamento,240),garantia:s(body.garantia,240),status:["rascunho","finalizada"].includes(body.status)?body.status:"rascunho"};if(!o.destinatario||!o.titulo)throw Object.assign(new Error("Informe o destinatário e o título."),{status:400});return o}
const wrap=fn=>(req,res,next)=>Promise.resolve(fn(req,res)).catch(next);
router.get("/",wrap(async(req,res)=>{await ready();const rows=await q("SELECT id,numero,destinatario,titulo,status,criado_em,atualizado_em FROM propostas_comerciais WHERE usuario_id=? ORDER BY atualizado_em DESC LIMIT 250",[req.usuario.id]);res.json({propostas:rows})}));
router.get("/:id",wrap(async(req,res)=>{await ready();const rows=await q("SELECT * FROM propostas_comerciais WHERE id=? AND usuario_id=?",[req.params.id,req.usuario.id]);if(!rows.length)return res.status(404).json({erro:"Proposta não encontrada."});const p=rows[0];p.itens=typeof p.itens_json==="string"?JSON.parse(p.itens_json):p.itens_json;delete p.itens_json;res.json({proposta:p})}));
router.post("/",wrap(async(req,res)=>{await ready();const p=validate(req.body||{});const result=await q("INSERT INTO propostas_comerciais (usuario_id,numero,data_proposta,destinatario,titulo,introducao,itens_json,prazo,pagamento,garantia,status) VALUES (?,?,?,?,?,?,?,?,?,?,?)",[req.usuario.id,p.numero,p.data,p.destinatario,p.titulo,p.introducao,JSON.stringify(p.itens),p.prazo,p.pagamento,p.garantia,p.status]);await auditar(req.usuario.id,"proposta_criada",String(result.insertId),req.ip);res.status(201).json({ok:true,id:result.insertId})}));
router.put("/:id",wrap(async(req,res)=>{await ready();const p=validate(req.body||{});const result=await q("UPDATE propostas_comerciais SET numero=?,data_proposta=?,destinatario=?,titulo=?,introducao=?,itens_json=?,prazo=?,pagamento=?,garantia=?,status=? WHERE id=? AND usuario_id=?",[p.numero,p.data,p.destinatario,p.titulo,p.introducao,JSON.stringify(p.itens),p.prazo,p.pagamento,p.garantia,p.status,req.params.id,req.usuario.id]);if(!result.affectedRows)return res.status(404).json({erro:"Proposta não encontrada."});await auditar(req.usuario.id,"proposta_atualizada",String(req.params.id),req.ip);res.json({ok:true,id:Number(req.params.id)})}));
router.delete("/:id",wrap(async(req,res)=>{await ready();const result=await q("DELETE FROM propostas_comerciais WHERE id=? AND usuario_id=?",[req.params.id,req.usuario.id]);if(!result.affectedRows)return res.status(404).json({erro:"Proposta não encontrada."});await auditar(req.usuario.id,"proposta_excluida",String(req.params.id),req.ip);res.json({ok:true})}));
export default router;
