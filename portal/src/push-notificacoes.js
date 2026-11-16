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
