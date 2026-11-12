import { Router } from "express";
import { q, auditar } from "./db.js";
import { exigir } from "./auth.js";

// Fase 1: catálogo e concessões. Nenhuma credencial IMAP/SMTP é armazenada.
const router=Router();
const emailRx=/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
let init;
async function schema(){
  if(!init)init=(async()=>{
    await q(`CREATE TABLE IF NOT EXISTS email_caixas (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      endereco VARCHAR(254) NOT NULL UNIQUE,
      nome VARCHAR(120) NOT NULL,
      tipo ENUM('individual','compartilhada') NOT NULL,
      usuario_dono_id BIGINT NULL,
      ativo TINYINT(1) NOT NULL DEFAULT 1,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await q(`CREATE TABLE IF NOT EXISTS email_caixa_acessos (
      caixa_id BIGINT UNSIGNED NOT NULL,
      usuario_id BIGINT UNSIGNED NOT NULL,
      pode_ler TINYINT(1) NOT NULL DEFAULT 1,
      pode_enviar TINYINT(1) NOT NULL DEFAULT 0,
      pode_excluir TINYINT(1) NOT NULL DEFAULT 0,
      PRIMARY KEY(caixa_id,usuario_id),
      FOREIGN KEY(caixa_id) REFERENCES email_caixas(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  })().catch(e=>{init=null;throw e});
  return init;
}
router.get("/minhas",exigir("painel"),async(req,res,next)=>{
 try{
  await schema();
  const rows=await q(`SELECT c.id,c.endereco,c.nome,c.tipo,
    IF(c.tipo='individual' AND c.usuario_dono_id=?,1,a.pode_ler) AS pode_ler,
    IF(c.tipo='individual' AND c.usuario_dono_id=?,1,a.pode_enviar) AS pode_enviar,
    IF(c.tipo='individual' AND c.usuario_dono_id=?,1,a.pode_excluir) AS pode_excluir
    FROM email_caixas c LEFT JOIN email_caixa_acessos a ON a.caixa_id=c.id AND a.usuario_id=?
    WHERE c.ativo=1 AND ((c.tipo='individual' AND c.usuario_dono_id=?) OR (c.tipo='compartilhada' AND a.pode_ler=1))
    ORDER BY c.tipo,c.nome`,[req.usuario.id,req.usuario.id,req.usuario.id,req.usuario.id,req.usuario.id]);
  res.set("Cache-Control","no-store").json({caixas:rows,conectado:false});
 }catch(e){next(e)}
});
router.get("/admin/caixas",exigir("admin.usuarios"),async(_req,res,next)=>{
 try{await schema();res.set("Cache-Control","no-store").json({caixas:await q("SELECT id,endereco,nome,tipo,usuario_dono_id,ativo FROM email_caixas ORDER BY tipo,nome")})}catch(e){next(e)}
});
router.post("/admin/caixas",exigir("admin.usuarios"),async(req,res,next)=>{
 try{
  const endereco=String(req.body?.endereco||"").trim().toLowerCase(),nome=String(req.body?.nome||"").trim(),tipo=req.body?.tipo;
  const dono=Number(req.body?.usuario_dono_id);
  if(!emailRx.test(endereco)||endereco.length>254||!nome||nome.length>120||!["individual","compartilhada"].includes(tipo)||tipo==="individual"&&(!Number.isSafeInteger(dono)||dono<1))
   return res.status(400).json({erro:"Dados da caixa inválidos."});
  if(tipo==="individual"){const [u]=await q("SELECT id,email FROM usuarios WHERE id=? AND ativo=1",[dono]);if(!u||u.email.toLowerCase()!==endereco)return res.status(400).json({erro:"Caixa individual deve corresponder ao e-mail do colaborador."})}
  await schema();
  const result=await q("INSERT INTO email_caixas(endereco,nome,tipo,usuario_dono_id) VALUES(?,?,?,?)",[endereco,nome,tipo,tipo==="individual"?dono:null]);
  await auditar(req.usuario.id,"email_caixa_criada",endereco,req.ip);
  res.status(201).json({id:result.insertId});
 }catch(e){if(e.code==="ER_DUP_ENTRY")return res.status(409).json({erro:"Caixa já cadastrada."});next(e)}
});
router.get("/admin/caixas/:id/acessos",exigir("admin.usuarios"),async(req,res,next)=>{
 try{await schema();res.set("Cache-Control","no-store").json({acessos:await q("SELECT usuario_id,pode_ler,pode_enviar,pode_excluir FROM email_caixa_acessos WHERE caixa_id=?",[req.params.id])})}catch(e){next(e)}
});
router.put("/admin/caixas/:id/acessos/:usuarioId",exigir("admin.usuarios"),async(req,res,next)=>{
 try{
  const caixa=Number(req.params.id),usuario=Number(req.params.usuarioId);
  if(!Number.isSafeInteger(caixa)||caixa<1||!Number.isSafeInteger(usuario)||usuario<1)return res.status(400).json({erro:"Identificador inválido."});
  const values=["pode_ler","pode_enviar","pode_excluir"];
  if(values.some(k=>typeof req.body?.[k]!=="boolean")||req.body.pode_excluir&&!req.body.pode_ler||req.body.pode_enviar&&!req.body.pode_ler)
    return res.status(400).json({erro:"Permissões inválidas."});
  await schema();
  const [c]=await q("SELECT id,tipo FROM email_caixas WHERE id=? AND ativo=1",[caixa]);
  const [u]=await q("SELECT id FROM usuarios WHERE id=? AND ativo=1",[usuario]);
  if(!c||!u)return res.status(404).json({erro:"Caixa ou usuário não encontrado."});
  if(c.tipo!=="compartilhada")return res.status(403).json({erro:"A caixa individual é exclusiva do titular."});
  await q(`INSERT INTO email_caixa_acessos(caixa_id,usuario_id,pode_ler,pode_enviar,pode_excluir)
    VALUES(?,?,?,?,?) ON DUPLICATE KEY UPDATE pode_ler=VALUES(pode_ler),pode_enviar=VALUES(pode_enviar),pode_excluir=VALUES(pode_excluir)`,
    [caixa,usuario,+req.body.pode_ler,+req.body.pode_enviar,+req.body.pode_excluir]);
  await auditar(req.usuario.id,"email_permissao_alterada",`caixa:${caixa};usuario:${usuario}`,req.ip);
  res.json({ok:true});
 }catch(e){next(e)}
});
export default router;
