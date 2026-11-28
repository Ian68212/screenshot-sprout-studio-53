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
 await q("CREATE TABLE IF NOT EXISTS rp_bling_finance_schedule (resource VARCHAR(12) NOT NULL,date_from CHAR(10) NOT NULL,date_to CHAR(10) NOT NULL,last_requested DATETIME NOT NULL,PRIMARY KEY(resource,date_from,date_to)) ENGINE=InnoDB");
 await q("CREATE TABLE IF NOT EXISTS rp_bling_read_cache (cache_key CHAR(64) PRIMARY KEY,payload MEDIUMTEXT NOT NULL,expires_at DATETIME NOT NULL) ENGINE=InnoDB");
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
 await q("DELETE FROM rp_bling_read_cache");await q("DELETE FROM rp_bling_finance_schedule");detailCache.clear();
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
async function readStored(k){
 const [row]=await q("SELECT payload FROM rp_bling_read_cache WHERE cache_key=? AND expires_at>UTC_TIMESTAMP()",[hash(k)]);
 return row?decrypt(row.payload):null;
}
async function saveStored(k,value,seconds){
 await q("INSERT INTO rp_bling_read_cache(cache_key,payload,expires_at) VALUES(?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL ? SECOND)) ON DUPLICATE KEY UPDATE payload=VALUES(payload),expires_at=VALUES(expires_at)",[hash(k),encrypt(value),seconds]);
}
const resources=Object.freeze({formas:"formas-pagamentos",contatos:"contatos",produtos:"produtos",estoques:"estoques/saldos",notas:"nfe",vendas:"pedidos/vendas",compras:"pedidos/compras",receber:"contas/receber",pagar:"contas/pagar"});
blingRouter.get("/consulta/:resource",admin,wrap(async(req,res)=>{
 if(!configured())return res.status(503).json({erro:"Configuração incompleta."});
 if(!Object.hasOwn(resources,req.params.resource))return res.sendStatus(404);
 const page=Number(req.query.pagina??1),limit=Number(req.query.limite??20);
 if(!Number.isSafeInteger(page)||page<1||!Number.isSafeInteger(limit)||limit<1||limit>100)return res.sendStatus(400);
 const url=new URL("https://api.bling.com.br/Api/v3/"+resources[req.params.resource]);
 if(req.params.resource==="estoques"){
 const ids=String(req.query.ids??"").split(",");
 if(ids.length>50||ids.some(id=>!/^\d{1,18}$/.test(id)))return res.status(400).json({erro:"Informe ids de produtos separados por vírgula."});
 for(const id of ids)url.searchParams.append("idsProdutos[]",id);
 }else{url.searchParams.set("pagina",String(page));url.searchParams.set("limite",String(limit))}
 const listKey="list:"+url.toString();
 const stored=await readStored(listKey);if(stored)return res.json({...stored,cached:true});
 let token;
 try{token=await accessToken()}catch{return res.status(503).json({erro:"Não foi possível obter acesso ao Bling. Verifique a autorização."})}
 const response=await fetch(url,{headers:{Authorization:"Bearer "+token,Accept:"application/json"},redirect:"error",signal:AbortSignal.timeout(15000)});
 if(!response.ok){const body=await response.json().catch(()=>null);const type=body?.error?.type;return res.status(response.status===429?429:502).json({erro:"Consulta Bling não concluída.",statusBling:response.status,tipoBling:typeof type==="string"&&/^[a-zA-Z_]{1,80}$/.test(type)?type:null});}
 const data=await response.json();
 const result={data:data.data??[],pagina:page,limite:limit};
 if(Array.isArray(data.data))await saveStored(listKey,result,60);
 res.json(result);
}));

const detailCache=new Map();
const detailPending=new Map();
let detailQueue=Promise.resolve();
async function cachedDetail(resource,id){
 const cacheKey=resource+"/"+id, cached=detailCache.get(cacheKey);
 if(cached&&cached.until>Date.now())return cached.data;
 if(detailPending.has(cacheKey))return detailPending.get(cacheKey);
 const stored=await readStored("detail:"+cacheKey);if(stored)return stored;
 const task=detailQueue.then(async()=>{
  const token=await accessToken();
  const response=await fetch("https://api.bling.com.br/Api/v3/"+resources[resource]+"/"+id,{headers:{Authorization:"Bearer "+token,Accept:"application/json"},redirect:"error",signal:AbortSignal.timeout(15000)});
  if(!response.ok)return {status:response.status};
  const payload=await response.json();const data={data:payload.data??null};
  if(data.data)await saveStored("detail:"+cacheKey,data,["contatos","formas"].includes(resource)?86400:1800);
  if(data.data){detailCache.set(cacheKey,{data,until:Date.now()+(["contatos","formas"].includes(resource)?300000:60000)});if(detailCache.size>2000)detailCache.delete(detailCache.keys().next().value)}
  return data;
 });
 detailPending.set(cacheKey,task);
 detailQueue=task.catch(()=>null).then(()=>new Promise(r=>setTimeout(r,400)));
 try{return await task}finally{detailPending.delete(cacheKey)}
}
blingRouter.get("/consulta/:resource/:id",admin,wrap(async(req,res)=>{
 const {resource,id}=req.params;
 if(!Object.hasOwn(resources,resource)||resource==="estoques"||!/^\d{1,18}$/.test(id))return res.sendStatus(400);
 if(!configured())return res.sendStatus(503);
 const result=await cachedDetail(resource,id);
 if(result.status)return res.status(result.status===429?429:502).json({erro:"Detalhe indisponível",statusBling:result.status});
 res.json(result);
}));

const snapshotJobs=new Map();
const snapshotFailures=new Map();
const snapshotProgress=new Map();
async function buildFinanceSnapshot(resource,from,to,k){
 const rows=new Map();
 for(let page=1;page<=50;page++){
  const token=await accessToken();
  const url=new URL("https://api.bling.com.br/Api/v3/"+resources[resource]);
  url.search=new URLSearchParams({pagina:String(page),limite:"100"}).toString();
  const res=await fetch(url,{headers:{Authorization:"Bearer "+token,Accept:"application/json"},signal:AbortSignal.timeout(15000),redirect:"error"});
  if(!res.ok)throw Error("list_failed");
  const {data}=await res.json();if(!Array.isArray(data))throw Error("invalid_list");
  for(const row of data)if(row.id&&row.vencimento>=from&&row.vencimento<=to)rows.set(String(row.id),row);
  if(data.length<100)break;
  if(page===50)throw Error("limit");
  await new Promise(r=>setTimeout(r,450));
 }
 const refs=new Map();
 snapshotProgress.set(k,{data:[...rows.values()].sort((a,b)=>String(a.vencimento).localeCompare(String(b.vencimento))),done:0});
 let done=0;
 for(const row of [...rows.values()].sort((a,b)=>Number(b.situacao===1)-Number(a.situacao===1)||String(a.vencimento).localeCompare(String(b.vencimento)))){
  const detail=await cachedDetail(resource,String(row.id));if(!detail.data){if(detail.status===429)throw Error("rate_limit");continue;}
  Object.assign(row,detail.data);
  for(const [field,type] of [["contato","contatos"],["formaPagamento","formas"]]){
   const v=row[field],id=String(v?.id??v??"");
   if(!/^\d{1,18}$/.test(id)||id==="0"||v?.nome||v?.descricao)continue;
   const refKey=type+"/"+id;
   if(!refs.has(refKey)){const result=await cachedDetail(type,id);if(!result.data){if(result.status===429)throw Error("rate_limit");continue;}refs.set(refKey,result.data)}
   const ref=refs.get(refKey);if(!ref)continue;row[field]={id,nome:ref.nome??ref.descricao??"Não identificado"};
  }
  row._geDone=true;snapshotProgress.get(k).done=++done;
 }
 const data=[...rows.values()].sort((a,b)=>String(a.vencimento).localeCompare(String(b.vencimento)));
 if(done!==rows.size)throw Error("incomplete_details");
 await saveStored(k,{data,updatedAt:Date.now()},604800);
}
blingRouter.get("/financeiro/:resource/snapshot",admin,wrap(async(req,res)=>{
 const {resource}=req.params,{from,to}=req.query;
 if(!["pagar","receber"].includes(resource)||typeof from!=="string"||typeof to!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(from)||!/^\d{4}-\d{2}-\d{2}$/.test(to)||from>to)return res.sendStatus(400);
 const k="finance:"+resource+":"+from+":"+to;
 await q("INSERT INTO rp_bling_finance_schedule(resource,date_from,date_to,last_requested) VALUES(?,?,?,UTC_TIMESTAMP()) ON DUPLICATE KEY UPDATE last_requested=UTC_TIMESTAMP()",[resource,from,to]);
 const stored=await readStored(k);
 let job=snapshotJobs.get(k);
 if((!stored||Date.now()-stored.updatedAt>300000)&&!job&&snapshotJobs.size<1&&(!snapshotFailures.has(k)||Date.now()-snapshotFailures.get(k)>60000)){
  job=buildFinanceSnapshot(resource,from,to,k).then(()=>snapshotFailures.delete(k)).catch(()=>{snapshotFailures.set(k,Date.now());if(snapshotFailures.size>100)snapshotFailures.delete(snapshotFailures.keys().next().value)}).finally(()=>{snapshotJobs.delete(k);snapshotProgress.delete(k)});snapshotJobs.set(k,job);
 }
 res.json({data:stored?.data??null,updatedAt:stored?.updatedAt??null,partial:stored?null:snapshotProgress.get(k)??null,refreshing:!!job,failed:snapshotFailures.has(k)&&!job});
}));

async function refreshScheduledFinance(){
 if(!configured()||snapshotJobs.size)return;
 await schema();
 const [authorized]=await q("SELECT id FROM rp_bling_tokens WHERE id=1");if(!authorized)return;
 const schedules=await q("SELECT resource,date_from,date_to FROM rp_bling_finance_schedule WHERE last_requested>DATE_SUB(UTC_TIMESTAMP(),INTERVAL 7 DAY) ORDER BY last_requested DESC LIMIT 12");
 for(const item of schedules){
  if(snapshotJobs.size)return;
  const {resource,date_from:from,date_to:to}=item,k="finance:"+resource+":"+from+":"+to;
  if(!["pagar","receber"].includes(resource))continue;
  const stored=await readStored(k);
  if(snapshotJobs.size)return;
  if(stored&&Date.now()-stored.updatedAt<1800000)continue;
  if(snapshotFailures.has(k)&&Date.now()-snapshotFailures.get(k)<120000)continue;
  const job=buildFinanceSnapshot(resource,from,to,k).then(()=>snapshotFailures.delete(k)).catch(()=>snapshotFailures.set(k,Date.now())).finally(()=>{snapshotJobs.delete(k);snapshotProgress.delete(k)});
  snapshotJobs.set(k,job);return;
 }
}
const financeTimer=setInterval(()=>refreshScheduledFinance().catch(()=>{}),60000);
financeTimer.unref();
