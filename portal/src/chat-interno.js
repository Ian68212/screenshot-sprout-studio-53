import { Router } from "express";
import { q } from "./db.js";
import { exigir } from "./auth.js";

const router = Router();
router.use(exigir("painel"));
let ready;
async function schema() {
  if (!ready) ready = (async () => {
    await q(`CREATE TABLE IF NOT EXISTS chat_interno_mensagens (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      remetente_id BIGINT NOT NULL,
      destinatario_id BIGINT NOT NULL,
      texto TEXT NOT NULL,
      criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      lido_em TIMESTAMP NULL DEFAULT NULL,
      INDEX ix_destinatario (destinatario_id, remetente_id, id),
      INDEX ix_remetente (remetente_id, destinatario_id, id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  })().catch(e => { ready = null; throw e; });
  return ready;
}
const fail = (fn) => async (req,res,next) => { try { await schema(); await fn(req,res); } catch(e) { next(e); } };
router.get("/pessoas", fail(async (req,res) => {
  const pessoas = await q("SELECT id,nome,setor_id FROM usuarios WHERE ativo=1 AND id<>? ORDER BY nome", [req.usuario.id]);
  res.set("Cache-Control","no-store").json({pessoas});
}));
router.get("/conversas", fail(async (req,res) => {
  const id=req.usuario.id;
  const conversas=await q(`SELECT u.id,u.nome,s.nome AS setor,
    (SELECT m.texto FROM chat_interno_mensagens m WHERE (m.remetente_id=? AND m.destinatario_id=u.id) OR (m.destinatario_id=? AND m.remetente_id=u.id) ORDER BY m.id DESC LIMIT 1) AS ultima,
    (SELECT m.criado_em FROM chat_interno_mensagens m WHERE (m.remetente_id=? AND m.destinatario_id=u.id) OR (m.destinatario_id=? AND m.remetente_id=u.id) ORDER BY m.id DESC LIMIT 1) AS ultima_em,
    (SELECT COUNT(*) FROM chat_interno_mensagens m WHERE m.remetente_id=u.id AND m.destinatario_id=? AND m.lido_em IS NULL) AS nao_lidas
    FROM usuarios u LEFT JOIN setores s ON s.id=u.setor_id
    WHERE u.ativo=1 AND u.id<>? ORDER BY (ultima_em IS NULL),ultima_em DESC,u.nome`,
    [id,id,id,id,id,id]);
  res.set("Cache-Control","no-store").json({conversas});
}));
router.get("/mensagens/:id", fail(async (req,res) => {
  const outro=Number(req.params.id), id=req.usuario.id;
  if (!Number.isSafeInteger(outro) || outro<=0 || outro===id) return res.status(400).json({erro:"Conversa inválida"});
  const [p]=await q("SELECT id,nome FROM usuarios WHERE id=? AND ativo=1",[outro]);
  if(!p) return res.status(404).json({erro:"Colaborador indisponível"});
  const mensagens=await q(`SELECT * FROM (SELECT id,remetente_id,destinatario_id,texto,criado_em,lido_em
    FROM chat_interno_mensagens WHERE (remetente_id=? AND destinatario_id=?) OR (remetente_id=? AND destinatario_id=?)
    ORDER BY id DESC LIMIT 100) x ORDER BY id ASC`,[id,outro,outro,id]);
  await q("UPDATE chat_interno_mensagens SET lido_em=NOW() WHERE remetente_id=? AND destinatario_id=? AND lido_em IS NULL",[outro,id]);
  res.set("Cache-Control","no-store").json({pessoa:p,mensagens});
}));
router.post("/mensagens", fail(async (req,res) => {
  const id=req.usuario.id, outro=Number(req.body?.destinatario_id), texto=String(req.body?.texto??"").trim();
  if(!Number.isSafeInteger(outro)||outro<=0||outro===id||!texto||texto.length>3000)
    return res.status(400).json({erro:"Informe destinatário e mensagem de até 3.000 caracteres"});
  const [p]=await q("SELECT id FROM usuarios WHERE id=? AND ativo=1",[outro]);
  if(!p) return res.status(404).json({erro:"Destinatário indisponível"});
  const result=await q("INSERT INTO chat_interno_mensagens (remetente_id,destinatario_id,texto) VALUES (?,?,?)",[id,outro,texto]);
  res.status(201).json({ok:true,id:result.insertId});
}));
router.get("/nao-lidas", fail(async (req,res) => {
  const [row]=await q("SELECT COUNT(*) AS total FROM chat_interno_mensagens WHERE destinatario_id=? AND lido_em IS NULL",[req.usuario.id]);
  res.set("Cache-Control","no-store").json({total:Number(row.total)||0});
}));
export default router;
