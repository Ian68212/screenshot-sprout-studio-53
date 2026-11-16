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
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`).catch(error => { initialized = null; throw error; });
  return initialized;
}

const digest = token => crypto.createHash("sha256").update(token).digest("hex");

router.post("/registrar", async (req, res, next) => {
  try {
    await schema();
    const token = String(req.body?.token || "").trim();
    if (!/^[A-Za-z0-9_:\-]{40,4096}$/.test(token)) {
      return res.status(400).json({ erro: "Token Firebase inválido." });
    }
    await q(
      "INSERT INTO dispositivos_push (usuario_id,token_hash,token,plataforma) VALUES (?,?,?,'android') ON DUPLICATE KEY UPDATE usuario_id=VALUES(usuario_id),token=VALUES(token),plataforma='android',atualizado_em=NOW()",
      [req.usuario.id, digest(token), token]
    );
    res.set("Cache-Control", "no-store").json({ ok: true });
  } catch (error) { next(error); }
});

router.post("/remover", async (req, res, next) => {
  try {
    await schema();
    const token = String(req.body?.token || "").trim();
    if (!token) return res.status(400).json({ erro: "Token obrigatório." });
    await q("DELETE FROM dispositivos_push WHERE usuario_id=? AND token_hash=?", [req.usuario.id, digest(token)]);
    res.set("Cache-Control", "no-store").json({ ok: true });
  } catch (error) { next(error); }
});

router.get("/status", async (req, res, next) => {
  try {
    await schema();
    const [row] = await q("SELECT COUNT(*) AS total FROM dispositivos_push WHERE usuario_id=?", [req.usuario.id]);
    const configured = Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_APPLICATION_CREDENTIALS);
    res.set("Cache-Control", "no-store").json({
      dispositivosRegistrados: Number(row?.total || 0),
      envioConfigurado: configured,
      motivo: configured ? null : "Credencial de envio do Firebase ainda não configurada no servidor",
      observacao: "Cadastro do dispositivo não comprova entrega de notificações."
    });
  } catch (error) { next(error); }
});

export default router;


export async function enviarPush(usuarioId, payload) {
  const credentialsJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credentialsJson && !credentialsPath) return { sent: 0, reason: "firebase_not_configured" };

  await schema();
  const { GoogleAuth } = await import("google-auth-library");
  const auth = new GoogleAuth({
    ...(credentialsJson ? { credentials: JSON.parse(credentialsJson) } : {}),
    scopes: ["https://www.googleapis.com/auth/firebase.messaging"]
  });
  const client = await auth.getClient();
  const access = await client.getAccessToken();
  if (!access.token) throw new Error("Não foi possível autenticar no Firebase.");

  const devices = await q("SELECT token,token_hash FROM dispositivos_push WHERE usuario_id=?", [usuarioId]);
  let sent = 0;
  for (const device of devices) {
    const response = await fetch("https://fcm.googleapis.com/v1/projects/rodrinox-pro/messages:send", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + access.token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: {
          token: device.token,
          data: {
            type: String(payload.type || "message"),
            title: String(payload.title || "Rodrinox Pro").slice(0, 100),
            body: String(payload.body || "Você recebeu uma nova atividade.").slice(0, 200),
            ...(payload.callId ? { callId: String(payload.callId) } : {})
          },
          android: { priority: "high" }
        }
      })
    });
    if (response.ok) {
      sent++;
    } else {
      const error = await response.json().catch(() => ({}));
      const unregistered = error.error?.details?.some(item => item.errorCode === "UNREGISTERED");
      if (unregistered) {
        await q("DELETE FROM dispositivos_push WHERE token_hash=?", [device.token_hash]);
      } else {
        console.error("[push] Firebase recusou o envio:", response.status, error.error?.status || "UNKNOWN");
      }
    }
  }
  return { sent };
}

export function enviarPushSemBloquear(usuarioId, payload) {
  enviarPush(usuarioId, payload).catch(error => {
    console.error("[push] Falha ao enviar notificação:", error.message);
  });
}
