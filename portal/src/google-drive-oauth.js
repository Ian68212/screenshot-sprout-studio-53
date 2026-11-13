import { Router } from "express";
import crypto from "node:crypto";
import { q, auditar } from "./db.js";
import { exigir } from "./auth.js";

export const googleDriveRouter=Router();
// O callback OAuth valida o state de uso único; as demais rotas exigem administrador.
const scope="https://www.googleapis.com/auth/drive.file";
const callback=()=>process.env.GOOGLE_DRIVE_REDIRECT_URI;
const client=()=>process.env.GOOGLE_DRIVE_CLIENT_ID;
const secret=()=>process.env.GOOGLE_DRIVE_CLIENT_SECRET;
const key=()=>{const raw=process.env.GOOGLE_DRIVE_TOKEN_KEY;if(!raw)throw Error("GOOGLE_DRIVE_TOKEN_KEY não configurada");return crypto.createHash("sha256").update(raw).digest()};
const encrypt=value=>{const iv=crypto.randomBytes(12);const cipher=crypto.createCipheriv("aes-256-gcm",key(),iv);const body=Buffer.concat([cipher.update(value,"utf8"),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),body]).toString("base64")};
const decrypt=value=>{const bytes=Buffer.from(value,"base64");const decipher=crypto.createDecipheriv("aes-256-gcm",key(),bytes.subarray(0,12));decipher.setAuthTag(bytes.subarray(12,28));return Buffer.concat([decipher.update(bytes.subarray(28)),decipher.final()]).toString("utf8")};
let initialized;
async function schema(){
 if(!initialized)initialized=(async()=>{
 await q(`CREATE TABLE IF NOT EXISTS rp_drive_oauth_state (
 state_hash CHAR(64) PRIMARY KEY, user_id INT NOT NULL, expires_at DATETIME NOT NULL,
 INDEX(expires_at)
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
 await q(`CREATE TABLE IF NOT EXISTS rp_drive_oauth_tokens (
 id INT PRIMARY KEY, refresh_token_enc TEXT NOT NULL,
 connected_by INT NOT NULL, connected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
 })().catch(e=>{initialized=null;throw e});
 return initialized;
}
const wrap=fn=>async(req,res,next)=>{try{await schema();await fn(req,res)}catch(e){next(e)}};
function configured(){return Boolean(client()&&secret()&&callback()&&process.env.GOOGLE_DRIVE_TOKEN_KEY)}
googleDriveRouter.get("/status",exigir("admin.usuarios"),wrap(async(req,res)=>{
 const [row]=await q("SELECT connected_at FROM rp_drive_oauth_tokens WHERE id=1");
 res.set("Cache-Control","no-store").json({configured:configured(),connected:!!row,connectedAt:row?.connected_at||null});
}));
googleDriveRouter.get("/oauth/start",exigir("admin.usuarios"),wrap(async(req,res)=>{
 if(!configured())return res.status(503).json({erro:"Configuração OAuth incompleta. Configure GOOGLE_DRIVE_TOKEN_KEY no servidor."});
 const state=crypto.randomBytes(32).toString("hex");
 await q("DELETE FROM rp_drive_oauth_state WHERE expires_at < UTC_TIMESTAMP()");
 await q("INSERT INTO rp_drive_oauth_state(state_hash,user_id,expires_at) VALUES(?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 10 MINUTE))",
 [crypto.createHash("sha256").update(state).digest("hex"),req.usuario.id]);
 const url=new URL("https://accounts.google.com/o/oauth2/v2/auth");
 for(const [k,v] of Object.entries({client_id:client(),redirect_uri:callback(),response_type:"code",scope,access_type:"offline",prompt:"consent",state}))url.searchParams.set(k,v);
 res.redirect(302,url.toString());
}));
googleDriveRouter.get("/oauth/callback",wrap(async(req,res)=>{
 const state=String(req.query.state||""),code=String(req.query.code||"");
 if(!/^[a-f0-9]{64}$/.test(state)||!code)return res.status(400).send("Autorização inválida ou cancelada.");
 const hash=crypto.createHash("sha256").update(state).digest("hex");
 const [row]=await q("SELECT user_id FROM rp_drive_oauth_state WHERE state_hash=? AND expires_at>UTC_TIMESTAMP()",[hash]);
 await q("DELETE FROM rp_drive_oauth_state WHERE state_hash=?",[hash]);
 if(!row)return res.status(403).send("Autorização expirada ou inválida. Inicie a conexão novamente pelo portal.");
 const response=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({code,client_id:client(),client_secret:secret(),redirect_uri:callback(),grant_type:"authorization_code"})});
 const data=await response.json();
 if(!response.ok||!data.refresh_token)return res.status(502).send("Google não forneceu um token de renovação. Tente conectar novamente.");
 await q("INSERT INTO rp_drive_oauth_tokens(id,refresh_token_enc,connected_by) VALUES(1,?,?) ON DUPLICATE KEY UPDATE refresh_token_enc=VALUES(refresh_token_enc),connected_by=VALUES(connected_by)",[encrypt(data.refresh_token),row.user_id]);
 await auditar(row.user_id,"google_drive_conectado","Integração OAuth autorizada",req.ip);
 res.set("Cache-Control","no-store").type("html").send("<!doctype html><html lang='pt-BR'><meta charset='utf-8'><title>Google Drive conectado</title><body><h2>Google Drive conectado à Rodrinox Pro.</h2><p>Você pode fechar esta janela.</p></body></html>");
}));
export async function driveAccessToken(){
 await schema();
 const [row]=await q("SELECT refresh_token_enc FROM rp_drive_oauth_tokens WHERE id=1");
 if(!row)throw Error("Google Drive ainda não autorizado");
 const response=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({client_id:client(),client_secret:secret(),refresh_token:decrypt(row.refresh_token_enc),grant_type:"refresh_token"})});
 const data=await response.json();
 if(!response.ok||!data.access_token)throw Error("Falha ao renovar autorização Google Drive");
 return data.access_token;
}
