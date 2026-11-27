import { Router } from "express";
import crypto from "node:crypto";
import { q, pool } from "./db.js";
import { exigir } from "./auth.js";
export const blingRouter = Router();
const admin=exigir("admin.usuarios");
const configured=()=>!!(process.env.BLING_CLIENT_ID && process.env.BLING_CLIENT_SECRET && process.env.BLING_REDIRECT_URI && process.env.BLING_TOKEN_KEY);
const hash=s=>crypto.createHash("sha256").update(s).digest("hex");
const key=()=>crypto.createHash("sha256").update(process.env.BLING_TOKEN_KEY).digest();
function encrypt(value){const iv=crypto.randomBytes(12),c=crypto.createCipheriv("aes-256-gcm",key(),iv);return Buffer.concat([iv,Buffer.concat([c.update(JSON.stringify(value)),c.final()]),c.getAuthTag()]).toString("base64")}
let ready;
function schema(){return ready ||= (async()=>{
 await q("CREATE TABLE IF NOT EXISTS rp_bling_state (state_hash CHAR(64) PRIMARY KEY,user_id INT NOT NULL,expires_at DATETIME NOT NULL) ENGINE=InnoDB");
 await q("CREATE TABLE IF NOT EXISTS rp_bling_tokens (id INT PRIMARY KEY,token_enc TEXT NOT NULL,connected_by INT NOT NULL,updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB");
})().catch(e=>{ready=null;throw e})}
const wrap=fn=>async(req,res)=>{res.set("Cache-Control","no-store");try{await schema();await fn(req,res)}catch{res.status(500).json({erro:"Falha interna na integração Bling."})}};
blingRouter.get("/status",admin,wrap(async(req,res)=>{
 const [row]=await q("SELECT updated_at FROM rp_bling_tokens WHERE id=1");
 res.json({configured:configured(),authorized:!!row,updatedAt:row?.updated_at||null,mode:"read-only-foundation"});
}));
blingRouter.get("/oauth/start",admin,wrap(async(req,res)=>{
 if(!configured())return res.status(503).json({erro:"Configuração Bling incompleta."});
 const state=crypto.randomBytes(32).toString("hex");
 await q("DELETE FROM rp_bling_state WHERE expires_at<=UTC_TIMESTAMP()");
 await q("INSERT INTO rp_bling_state VALUES(?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 10 MINUTE))",[hash(state),req.usuario.id]);
 const url=new URL("https://www.bling.com.br/Api/v3/oauth/authorize");
 url.search=new URLSearchParams({response_type:"code",client_id:process.env.BLING_CLIENT_ID,state}).toString();
 res.redirect(url.toString());
}));
blingRouter.get("/callback",admin,wrap(async(req,res)=>{
 if(!configured())return res.sendStatus(503);
 const {state,code}=req.query;
 if(typeof state!=="string"||!/^[a-f0-9]{64}$/.test(state)||typeof code!=="string"||!code)return res.sendStatus(400);
 const result=await q("DELETE FROM rp_bling_state WHERE state_hash=? AND user_id=? AND expires_at>UTC_TIMESTAMP()",[hash(state),req.usuario.id]);
 if(result.affectedRows!==1)return res.sendStatus(403);
 const response=await fetch("https://www.bling.com.br/Api/v3/oauth/token",{method:"POST",headers:{Authorization:"Basic "+Buffer.from(process.env.BLING_CLIENT_ID+":"+process.env.BLING_CLIENT_SECRET).toString("base64"),"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({grant_type:"authorization_code",code}),signal:AbortSignal.timeout(15000)});
 const data=await response.json();
 if(!response.ok||!data.access_token||!data.refresh_token)return res.status(502).json({erro:"Autorização Bling não concluída."});
 await q("INSERT INTO rp_bling_tokens(id,token_enc,connected_by) VALUES(1,?,?) ON DUPLICATE KEY UPDATE token_enc=VALUES(token_enc),connected_by=VALUES(connected_by)",[encrypt({...data,received_at:Date.now()}),req.usuario.id]);
 res.type("text/plain").send("Autorização Bling armazenada. Sincronização ainda não ativada.");
}));

function decrypt(value){
 const b=Buffer.from(value,"base64"), d=crypto.createDecipheriv("aes-256-gcm",key(),b.subarray(0,12));
 d.setAuthTag(b.subarray(-16));
 return JSON.parse(Buffer.concat([d.update(b.subarray(12,-16)),d.final()]).toString("utf8"));
}
async function accessToken(){
 const conn=await pool.getConnection();
 try{
 await conn.beginTransaction();
 const [rows]=await conn.execute("SELECT token_enc FROM rp_bling_tokens WHERE id=1 FOR UPDATE");
 if(!rows.length)throw new Error("not_authorized");
 let t=decrypt(rows[0].token_enc);
 if(Date.now()+60000 >= t.received_at+Number(t.expires_in||0)*1000){
 const response=await fetch("https://www.bling.com.br/Api/v3/oauth/token",{method:"POST",headers:{Authorization:"Basic "+Buffer.from(process.env.BLING_CLIENT_ID+":"+process.env.BLING_CLIENT_SECRET).toString("base64"),"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({grant_type:"refresh_token",refresh_token:t.refresh_token}),signal:AbortSignal.timeout(15000)});
 const data=await response.json();
 if(!response.ok||!data.access_token||!data.refresh_token)throw new Error("refresh_failed");
 t={...data,received_at:Date.now()};
 await conn.execute("UPDATE rp_bling_tokens SET token_enc=? WHERE id=1",[encrypt(t)]);
 }
 await conn.commit();
 return t.access_token;
 }catch(e){await conn.rollback();throw e}finally{conn.release()}
}
const resources=Object.freeze({contatos:"contatos",produtos:"produtos",estoques:"estoques/saldos",notas:"nfe",vendas:"pedidos/vendas",compras:"pedidos/compras",receber:"contas/receber",pagar:"contas/pagar"});
blingRouter.get("/consulta/:resource",admin,wrap(async(req,res)=>{
 if(!configured())return res.status(503).json({erro:"Configuração incompleta."});
 if(!Object.hasOwn(resources,req.params.resource))return res.sendStatus(404);
 const page=Number(req.query.pagina??1),limit=Number(req.query.limite??20);
 if(!Number.isSafeInteger(page)||page<1||!Number.isSafeInteger(limit)||limit<1||limit>100)return res.sendStatus(400);
 const url=new URL("https://www.bling.com.br/Api/v3/"+resources[req.params.resource]);
 if(req.params.resource==="estoques"){
 const ids=String(req.query.ids??"").split(",");
 if(ids.length>50||ids.some(id=>!/^\d{1,18}$/.test(id)))return res.status(400).json({erro:"Informe ids de produtos separados por vírgula."});
 for(const id of ids)url.searchParams.append("idsProdutos[]",id);
 }else{url.searchParams.set("pagina",String(page));url.searchParams.set("limite",String(limit))}
 let token;
 try{token=await accessToken()}catch{return res.status(503).json({erro:"Não foi possível obter acesso ao Bling. Verifique a autorização."})}
 const response=await fetch(url,{headers:{Authorization:"Bearer "+token,Accept:"application/json"},signal:AbortSignal.timeout(15000)});
 if(!response.ok)return res.status(response.status===429?429:502).json({erro:"Consulta Bling não concluída.",statusBling:response.status});
 const data=await response.json();
 res.json({data:data.data??[],pagina:page,limite:limit});
}));
