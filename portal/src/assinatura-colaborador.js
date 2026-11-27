import { q } from "./db.js";

export const camposAssinatura = {
  nome: 160, cargo: 120, setor: 120, email: 254, emailExtra: 254, telefone: 40, whatsapp: 40,
};
let schema;
async function garantirTabela() {
  schema ??= q(`CREATE TABLE IF NOT EXISTS email_assinaturas_colaboradores (
    usuario_id BIGINT UNSIGNED PRIMARY KEY,
    campos JSON NOT NULL
  )`).catch(error => { schema = null; throw error; });
  await schema;
}

export async function dadosAssinatura(id) {
  await garantirTabela();
  const [usuario] = await q(`SELECT u.nome,u.email,c.nome cargo,s.nome setor,a.campos
    FROM usuarios u LEFT JOIN cargos c ON c.id=u.cargo_id
    LEFT JOIN setores s ON s.id=u.setor_id
    LEFT JOIN email_assinaturas_colaboradores a ON a.usuario_id=u.id WHERE u.id=?`, [id]);
  if (!usuario) return null;
  const { campos, ...cadastro } = usuario;
  const personalizados = typeof campos === "string" ? JSON.parse(campos) : campos;
  return { cadastro, personalizados: personalizados || {}, usaModelo: campos != null };
}

export async function salvarAssinatura(id, campos) {
  await garantirTabela();
  await q(`INSERT INTO email_assinaturas_colaboradores (usuario_id,campos) VALUES (?,?)
    ON DUPLICATE KEY UPDATE campos=VALUES(campos)`, [id, JSON.stringify(campos)]);
}

const escapar = value => String(value ?? "").replace(/[&<>"']/g,
  c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[c]);

export function modeloAssinatura(dados) {
  const { nome, cargo, setor, email, emailExtra, telefone, whatsapp } = {
    ...dados.cadastro, ...dados.personalizados,
  };
  const site = "www.rodrinoxpro.com.br";
  const contatos = [email, emailExtra, site, telefone, whatsapp].filter(Boolean);
  const linha = value => value ? `<div style="margin-top:4px">${escapar(value)}</div>` : "";
  const html = `<table role="presentation" cellpadding="0" cellspacing="0" bgcolor="#09162a" style="width:100%;max-width:760px;margin-top:12px;color:#fff;background:#09162a;background-image:linear-gradient(120deg,#112747,#09162a 55%,#101f36);border-top:2px solid #3495ec;border-bottom:3px solid #f26a1b;font:13px/1.45 Arial,sans-serif;table-layout:fixed">
  <tr>
    <td valign="middle" align="center" style="width:28%;padding:16px 10px;border-right:1px solid #479ce9"><img src="https://rodrinoxpro.com.br/colaborador/assets/logo-horizontal-oficial-colorida.png" alt="Rodrinoxpro" width="168" style="display:block;width:100%;max-width:168px;height:auto;margin:0 auto"></td>
    <td valign="middle" style="width:30%;padding:16px 12px;border-right:1px solid #ed833e;overflow-wrap:anywhere;word-wrap:break-word"><strong style="display:block;font-size:19px;line-height:1.18;color:#fff">${escapar(nome)}</strong><div style="margin-top:6px;color:#dbe9fa">${cargo ? `<strong style="color:#fff">${escapar(cargo)}</strong>` : ""}${linha(setor)}</div></td>
    <td valign="middle" style="width:42%;padding:16px 12px;color:#dbe9fa;overflow-wrap:anywhere;word-wrap:break-word">${contatos.map(linha).join("")}</td>
  </tr></table>`;
  return { html, texto: [nome, cargo, setor, ...contatos].filter(Boolean).join("\n") };
}
