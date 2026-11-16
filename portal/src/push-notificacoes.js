import { Router } from "express";
import crypto from "node:crypto";
import { q } from "./db.js";
import { exigir } from "./auth.js";

const router = Router();
router.use(exigir("painel"));
let initialized;
async function schema() {
  if (!initialized) initialized = q(`CREATE TABLE IF NOT EXISTS dispositivos_push (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    usuario_id BIGINT NOT NULL,
    token_hash CHAR(64) NOT NULL UNIQUE,
    token TEXT NOT NULL,
    plataforma VARCHAR(20) NOT NULL DEFAULT 'android',
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_usuario (usuario_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`).catch(err => {initialized=null;throw err;});
  return initialized;
}
const digest = t => crypto.createHash("sha256").update(t).digest("hex");
router.post("/registrar", async(req,res,next) => {
  try {
    await schema();
    const token=String(req.body?.token||"").trim();
    if (!/^[A-Za-z0-9_:\-]{40,4096}$/.test(token)) return res.status(400).json({erro:"Token inválido"});
    await q("INSERT INTO dispositivos_push (usuario_id,token_hash,token) VALUES (?,?,?) ON DUPLICATE KEY UPDATE usuario_id=VALUES(usuario_id),token=VALUES(token),atualizado_em=NOW()",[req.usuario.id,digest(token),token]);
    res.set("Cache-Control","no-store").json({ok:true});
  } catch(err){next(err);}
});
router.post("/remover", async(req,res,next)=>{
  try{
    await schema();
    const token=String(req.body?.token||"").trim();
    if(!token)return res.status(400).json({erro:"Token obrigatório"});
    await q("DELETE FROM dispositivos_push WHERE usuario_id=? AND token_hash=?",[req.usuario.id,digest(token)]);
    res.json({ok:true});
  }catch(err){next(err);}
});
// Diagnóstico autenticado: nunca retorna tokens nem credenciais.
router.get("/status", async (req, res, next) => {
  try {
    await schema();
    const [row] = await q("SELECT COUNT(*) AS total FROM dispositivos_push WHERE usuario_id=?", [req.usuario.id]);
    const configured = Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_EXTERNAL_ACCOUNT_JSON);
    res.set("Cache-Control", "no-store").json({
      dispositivosRegistrados: Number(row?.total || 0),
      envioConfigurado: configured,
      motivo: configured ? null : "Autenticação do Firebase pendente no servidor",
      observacao: "Cadastro de dispositivo não comprova entrega de notificações"
    });
  } catch (error) { next(error); }
});
export async function enviarPush(usuarioId,payload) {
  await schema();
  const devices=await q("SELECT token FROM dispositivos_push WHERE usuario_id=?",[usuarioId]);
  if(!devices.length)return {sent:0,reason:"no_registered_devices"};
  const credentials=process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const external=process.env.GOOGLE_EXTERNAL_ACCOUNT_JSON;
  if(!credentials && !external && !process.env.GOOGLE_APPLICATION_CREDENTIALS)return {sent:0,reason:"firebase_not_configured"};
  const {GoogleAuth}=await import("google-auth-library");
  const auth=new GoogleAuth({
    ...(credentials ? {credentials:JSON.parse(credentials)} : external ? {credentials:JSON.parse(external)} : {}),
    scopes:["https://www.googleapis.com/auth/firebase.messaging"]
  });
  const client=await auth.getClient();
  const access=await client.getAccessToken();
  if(!access.token)throw Error("Não foi possível autenticar Firebase");
  let sent=0;
  let failed=0;
  for(const device of devices){
    const response=await fetch(`https://fcm.googleapis.com/v1/projects/${encodeURIComponent("rodrinox-pro")}/messages:send`,{
      method:"POST",headers:{"Authorization":`Bearer ${access.token}`,"Content-Type":"application/json"},
      body:JSON.stringify({message:{token:device.token,data:{
        type:String(payload.type||"message"),title:String(payload.title||"Rodrinox Pro").slice(0,100),
        body:String(payload.body||"Nova atividade").slice(0,200),
        ...(payload.callId?{callId:String(payload.callId)}:{})
      },android:{priority:"high"}}})
    });
    if(response.ok)sent++;
    else {
      failed++;
      console.error("[push] FCM rejeitou entrega", {status:response.status, usuarioId});
      if(response.status===404||response.status===400){
      const error=await response.json().catch(()=>({}));
      if(error.error?.details?.some(d=>d.errorCode==="UNREGISTERED"))await q("DELETE FROM dispositivos_push WHERE token_hash=?",[digest(device.token)]);
      }
    }
  }
  return {sent,failed};
}
export function enviarPushSemBloquear(usuarioId,payload){
  enviarPush(usuarioId,payload).catch(error=>console.error("[push] falha ao enviar notificação:",error.message));
}
export default router;
