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
  const linha = value => value ? `<div style="margin-bottom:3px">${escapar(value)}</div>` : "";
  const html = `<table role="presentation" cellpadding="0" cellspacing="0" bgcolor="#081429" style="width:100%;max-width:680px;margin-top:16px;color:#fff;background:#081429;border-top:2px solid #248ce3;border-bottom:3px solid #f26a1b;font:13px Arial,sans-serif;table-layout:fixed">
  <tr>
    <td style="width:25%;padding:12px;border-right:2px solid #248ce3"><img src="https://rodrinoxpro.com.br/colaborador/assets/logo-horizontal-oficial-colorida.png" alt="Rodrinoxpro" width="135" style="display:block;width:100%;max-width:135px;height:auto"></td>
    <td style="width:36%;padding:12px;border-right:2px solid #f26a1b;overflow-wrap:anywhere;word-break:break-word"><strong style="font-size:18px;color:#fff">${escapar(nome)}</strong><div style="padding-top:5px;color:#dbe9fa">${linha(cargo)}${linha(setor)}</div></td>
    <td style="padding:12px;color:#dbe9fa;overflow-wrap:anywhere;word-break:break-word">${contatos.map(linha).join("")}</td>
  </tr></table>`;
  return { html, texto: [nome, cargo, setor, ...contatos].filter(Boolean).join("\n") };
}
