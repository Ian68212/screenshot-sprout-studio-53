import { Router } from "express";
import { q, auditar } from "./db.js";
import { exigir } from "./auth.js";

const router=Router();
let pending;
function schema(){
  if(!pending)pending=q(`CREATE TABLE IF NOT EXISTS atendimento_rodrinox (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    contato_digisac VARCHAR(100) NOT NULL,
    usuario_id BIGINT NULL,
    setor_id BIGINT NULL,
    atualizado_por BIGINT NOT NULL,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_contato_digisac (contato_digisac),
    KEY idx_atendimento_usuario (usuario_id),
    KEY idx_atendimento_setor (setor_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`).catch(e=>{pending=null;throw e});
  return pending;
}
const admin=u=>u.perfil==="admin";
const validId=x=>Number.isSafeInteger(Number(x))&&Number(x)>0;
router.get("/equipe",exigir("painel"),async(req,res,next)=>{
  try{
    if(!admin(req.usuario))return res.status(403).json({erro:"Acesso administrativo obrigatório."});
    const usuarios=await q("SELECT id,nome,email,setor_id FROM usuarios WHERE ativo=1 ORDER BY nome");
    const setores=await q("SELECT id,nome FROM setores ORDER BY nome");
    res.set("Cache-Control","no-store").json({usuarios,setores});
  }catch(e){next(e)}
});
router.get("/atribuicoes",exigir("painel"),async(req,res,next)=>{
  try{
    await schema();
    const rows=admin(req.usuario)?
      await q("SELECT contato_digisac,usuario_id,setor_id,atualizado_em FROM atendimento_rodrinox ORDER BY atualizado_em DESC LIMIT 200"):
      await q("SELECT contato_digisac,usuario_id,setor_id,atualizado_em FROM atendimento_rodrinox WHERE usuario_id=? OR (usuario_id IS NULL AND setor_id=?) ORDER BY atualizado_em DESC LIMIT 200",[req.usuario.id,req.usuario.setor_id||0]);
    res.set("Cache-Control","no-store").json({atribuicoes:rows,usuario:{id:req.usuario.id,nome:req.usuario.nome,perfil:req.usuario.perfil,setor_id:req.usuario.setor_id}});
  }catch(e){next(e)}
});
router.put("/atribuicoes/:contato",exigir("painel"),async(req,res,next)=>{
  try{
    if(!admin(req.usuario))return res.status(403).json({erro:"Somente administradores podem distribuir atendimentos."});
    const contato=String(req.params.contato||"");
    if(!/^[a-zA-Z0-9_-]{1,100}$/.test(contato))return res.status(400).json({erro:"Contato inválido."});
    const usuarioId=req.body?.usuario_id==null?null:Number(req.body.usuario_id);
    const setorId=req.body?.setor_id==null?null:Number(req.body.setor_id);
    if((usuarioId!==null&&!validId(usuarioId))||(setorId!==null&&!validId(setorId)))return res.status(400).json({erro:"Responsável ou setor inválido."});
    if(usuarioId!==null){
      const [u]=await q("SELECT id,setor_id FROM usuarios WHERE id=? AND ativo=1",[usuarioId]);
      if(!u)return res.status(400).json({erro:"Colaborador inativo ou inexistente."});
      if(setorId!==null&&Number(u.setor_id)!==setorId)return res.status(400).json({erro:"Colaborador não pertence ao setor selecionado."});
    }
    if(setorId!==null){
      const [s]=await q("SELECT id FROM setores WHERE id=?",[setorId]);
      if(!s)return res.status(400).json({erro:"Setor inexistente."});
    }
    await schema();
    await q(`INSERT INTO atendimento_rodrinox (contato_digisac,usuario_id,setor_id,atualizado_por) VALUES (?,?,?,?)
      ON DUPLICATE KEY UPDATE usuario_id=VALUES(usuario_id),setor_id=VALUES(setor_id),atualizado_por=VALUES(atualizado_por)`,[contato,usuarioId,setorId,req.usuario.id]);
    await auditar(req.usuario.id,"atendimento_atribuido",JSON.stringify({contato,usuarioId,setorId}),req.ip);
    res.json({ok:true});
  }catch(e){next(e)}
});
export default router;
