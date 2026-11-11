import {Router} from "express";
import crypto from "node:crypto";
import {q,auditar} from "./db.js";
import {exigir} from "./auth.js";
const router=Router();
const version=process.env.META_GRAPH_VERSION||"v25.0";
const configured=()=>Boolean(process.env.META_WA_ACCESS_TOKEN&&process.env.META_WA_PHONE_NUMBER_ID&&process.env.META_WA_APP_SECRET&&process.env.META_WA_VERIFY_TOKEN);
let init;
function schema(){
 if(!init)init=(async()=>{
 await q(`CREATE TABLE IF NOT EXISTS rp_wa_conversas (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, telefone VARCHAR(32) NOT NULL UNIQUE,
 nome VARCHAR(190), setor_id BIGINT NULL, responsavel_id BIGINT NULL,
 ultima_mensagem_em DATETIME NULL, atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 KEY idx_responsavel (responsavel_id), KEY idx_setor (setor_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
 await q(`CREATE TABLE IF NOT EXISTS rp_wa_mensagens (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, meta_id VARCHAR(190) NOT NULL UNIQUE,
 telefone VARCHAR(32) NOT NULL, direcao VARCHAR(12) NOT NULL,
 tipo VARCHAR(30) NOT NULL, texto TEXT NULL, estado VARCHAR(32) NULL,
 usuario_id BIGINT NULL, criado_em DATETIME NOT NULL,
 KEY idx_conversa (telefone,criado_em)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
 })().catch(e=>{init=null;throw e});
 return init;
}
const isAdmin=u=>u.perfil==="admin";
const phone=x=>/^\d{8,18}$/.test(String(x||""));
async function allowed(u,telefone){
 if(isAdmin(u))return true;
 const [c]=await q("SELECT responsavel_id,setor_id FROM rp_wa_conversas WHERE telefone=?",[telefone]);
 if(!c)return false;
 return Number(c.responsavel_id)===Number(u.id)||(c.responsavel_id==null&&c.setor_id!=null&&Number(c.setor_id)===Number(u.setor_id));
}
router.get("/status",exigir("painel"),(req,res)=>{
 res.set("Cache-Control","no-store").json({configurada:configured(),canal:"meta_cloud_api",modo:configured()?"configurado":"aguardando_meta",usuario:{id:req.usuario.id,nome:req.usuario.nome,perfil:req.usuario.perfil}});
});
router.get("/conversas",exigir("painel"),async(req,res,next)=>{try{
 await schema();const admin=isAdmin(req.usuario);
 const rows=admin?await q("SELECT telefone,nome,setor_id,responsavel_id,ultima_mensagem_em FROM rp_wa_conversas ORDER BY ultima_mensagem_em DESC LIMIT 100"):
 await q("SELECT telefone,nome,setor_id,responsavel_id,ultima_mensagem_em FROM rp_wa_conversas WHERE responsavel_id=? OR (responsavel_id IS NULL AND setor_id=?) ORDER BY ultima_mensagem_em DESC LIMIT 100",[req.usuario.id,req.usuario.setor_id||0]);
 res.set("Cache-Control","no-store").json({conversas:rows});
}catch(e){next(e)}});
router.get("/conversas/:telefone/mensagens",exigir("painel"),async(req,res,next)=>{try{
 await schema();if(!phone(req.params.telefone))return res.status(400).json({erro:"Telefone inválido"});
 if(!await allowed(req.usuario,req.params.telefone))return res.status(403).json({erro:"Conversa não autorizada"});
 const rows=await q("SELECT meta_id,direcao,tipo,texto,estado,criado_em,usuario_id FROM rp_wa_mensagens WHERE telefone=? ORDER BY criado_em DESC,id DESC LIMIT 100",[req.params.telefone]);
 res.set("Cache-Control","no-store").json({mensagens:rows.reverse()});
}catch(e){next(e)}});
router.put("/conversas/:telefone/atribuir",exigir("painel"),async(req,res,next)=>{try{
 if(!isAdmin(req.usuario))return res.status(403).json({erro:"Apenas administrador"});
 const telefone=req.params.telefone;if(!phone(telefone))return res.status(400).json({erro:"Telefone inválido"});
 const uid=req.body?.usuario_id==null?null:Number(req.body.usuario_id),sid=req.body?.setor_id==null?null:Number(req.body.setor_id);
 if(uid!==null&&(!Number.isSafeInteger(uid)||uid<1))return res.status(400).json({erro:"Usuário inválido"});
 if(sid!==null&&(!Number.isSafeInteger(sid)||sid<1))return res.status(400).json({erro:"Setor inválido"});
 if(uid!==null){const [u]=await q("SELECT id,setor_id FROM usuarios WHERE id=? AND ativo=1",[uid]);if(!u||sid!==null&&Number(u.setor_id)!==sid)return res.status(400).json({erro:"Usuário inexistente ou fora do setor"});}
 if(sid!==null){const [d]=await q("SELECT id FROM setores WHERE id=?",[sid]);if(!d)return res.status(400).json({erro:"Setor inexistente"});}
 await schema();const [c]=await q("SELECT telefone FROM rp_wa_conversas WHERE telefone=?",[telefone]);if(!c)return res.status(404).json({erro:"Conversa inexistente"});
 await q("UPDATE rp_wa_conversas SET responsavel_id=?,setor_id=? WHERE telefone=?",[uid,sid,telefone]);
 await auditar(req.usuario.id,"wa_atribuicao",JSON.stringify({telefone,uid,sid}),req.ip);
 res.json({ok:true});
}catch(e){next(e)}});
router.post("/conversas/:telefone/enviar",exigir("painel"),async(req,res,next)=>{try{
 const telefone=req.params.telefone,body=String(req.body?.texto||"").trim();
 if(!phone(telefone)||!body||body.length>4096)return res.status(400).json({erro:"Telefone ou mensagem inválidos"});
 if(!configured())return res.status(503).json({erro:"Configure a integração Meta antes de enviar"});
 await schema();if(!await allowed(req.usuario,telefone))return res.status(403).json({erro:"Conversa não autorizada"});
 const [last]=await q("SELECT MAX(criado_em) AS ultima FROM rp_wa_mensagens WHERE telefone=? AND direcao='entrada'",[telefone]);
 if(!last?.ultima||Date.now()-new Date(last.ultima).getTime()>24*3600*1000)return res.status(409).json({erro:"Fora da janela de atendimento de 24 horas; é necessário modelo aprovado pela Meta"});
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
 let result;
 try{
 const response=await fetch("https://graph.facebook.com/"+version+"/"+encodeURIComponent(process.env.META_WA_PHONE_NUMBER_ID)+"/messages",{method:"POST",signal:controller.signal,headers:{"Authorization":"Bearer "+process.env.META_WA_ACCESS_TOKEN,"Content-Type":"application/json"},body:JSON.stringify({messaging_product:"whatsapp",to:telefone,type:"text",text:{body}})});
 result=await response.json();if(!response.ok||!result.messages?.[0]?.id)return res.status(502).json({erro:"A Meta recusou o envio",codigo:response.status});
 }finally{clearTimeout(timer)}
 await q("INSERT IGNORE INTO rp_wa_mensagens(meta_id,telefone,direcao,tipo,texto,estado,usuario_id,criado_em) VALUES (?,?,?,?,?,?,?,NOW())",[result.messages[0].id,telefone,"saida","text",body,"enviada",req.usuario.id]);
 await q("UPDATE rp_wa_conversas SET ultima_mensagem_em=NOW() WHERE telefone=?",[telefone]);
 await auditar(req.usuario.id,"wa_envio",JSON.stringify({telefone,meta_id:result.messages[0].id}),req.ip);
 res.json({ok:true,id:result.messages[0].id});
}catch(e){next(e)}});
router.get("/webhook",(req,res)=>{
 const token=process.env.META_WA_VERIFY_TOKEN;
 if(!token||req.query["hub.mode"]!=="subscribe"||typeof req.query["hub.verify_token"]!=="string")return res.sendStatus(403);
 const a=Buffer.from(req.query["hub.verify_token"]),b=Buffer.from(token);
 if(a.length!==b.length||!crypto.timingSafeEqual(a,b))return res.sendStatus(403);
 res.status(200).type("text/plain").send(String(req.query["hub.challenge"]||""));
});
router.post("/webhook",async(req,res,next)=>{try{
 const secret=process.env.META_WA_APP_SECRET,raw=req.rawBody,sig=req.get("x-hub-signature-256")||"";
 if(!secret||!Buffer.isBuffer(raw)||!/^sha256=[0-9a-f]{64}$/.test(sig))return res.sendStatus(403);
 const expected="sha256="+crypto.createHmac("sha256",secret).update(raw).digest("hex");
 if(!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))return res.sendStatus(403);
 if(req.body?.object!=="whatsapp_business_account")return res.sendStatus(200);
 await schema();
 for(const entry of req.body.entry||[])for(const change of entry.changes||[]){
 const value=change.value||{};
 if(String(value.metadata?.phone_number_id)!==String(process.env.META_WA_PHONE_NUMBER_ID))continue;
 for(const msg of value.messages||[]){
  const telefone=String(msg.from||"");if(!phone(telefone)||!msg.id)continue;
  const nome=value.contacts?.find(c=>c.wa_id===telefone)?.profile?.name||null;
  await q("INSERT INTO rp_wa_conversas(telefone,nome,ultima_mensagem_em) VALUES (?,?,NOW()) ON DUPLICATE KEY UPDATE nome=COALESCE(VALUES(nome),nome),ultima_mensagem_em=NOW()",[telefone,nome]);
  const tipo=String(msg.type||"unknown").slice(0,30),texto=tipo==="text"?String(msg.text?.body||""):null;
  await q("INSERT IGNORE INTO rp_wa_mensagens(meta_id,telefone,direcao,tipo,texto,estado,criado_em) VALUES (?,?,?,?,?,?,FROM_UNIXTIME(?))",[String(msg.id),telefone,"entrada",tipo,texto,"recebida",Number(msg.timestamp)||Math.floor(Date.now()/1000)]);
 }
 for(const status of value.statuses||[]){
  const st=String(status.status||"").slice(0,32);
  if(status.id)await q("UPDATE rp_wa_mensagens SET estado=? WHERE meta_id=?",[st,String(status.id)]);
 }
 }
 res.sendStatus(200);
}catch(e){next(e)}});
export default router;
