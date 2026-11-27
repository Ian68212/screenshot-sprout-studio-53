import { q } from "./db.js";

export const camposAssinatura = {
  nome: 160, cargo: 120, setor: 120, email: 254, emailExtra: 254, telefone: 40, whatsapp: 40,
};
export const visibilidadePadrao = Object.freeze({
  nome: true, cargo: true, email: true,
  setor: false, emailExtra: false, telefone: true, whatsapp: true, site: true,
});
const contatosPadrao = { telefone: "(11) 4863-1292", whatsapp: "(11) 96598-8004" };

export async function salvarContatosOficiais(telefone, whatsapp) {
  await garantirTabela();
  await q(`INSERT INTO email_assinaturas_colaboradores (usuario_id,campos) VALUES (0,?)
    ON DUPLICATE KEY UPDATE campos=VALUES(campos)`, [JSON.stringify({ telefone, whatsapp })]);
}

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
  const [usuario] = await q(`SELECT u.nome,u.email,c.nome cargo,s.nome setor,a.campos,g.campos contatos
    FROM usuarios u LEFT JOIN cargos c ON c.id=u.cargo_id
    LEFT JOIN setores s ON s.id=u.setor_id
    LEFT JOIN email_assinaturas_colaboradores a ON a.usuario_id=u.id
    LEFT JOIN email_assinaturas_colaboradores g ON g.usuario_id=0 WHERE u.id=?`, [id]);
  if (!usuario) return null;
  const { campos, contatos, ...cadastro } = usuario;
  const { visibilidade, ...personalizados } = (typeof campos === "string" ? JSON.parse(campos) : campos) || {};
  const contatosOficiais = { ...contatosPadrao, ...(typeof contatos === "string" ? JSON.parse(contatos) : contatos) };
  return { cadastro, personalizados, contatosOficiais, visibilidade: { ...visibilidadePadrao, ...visibilidade }, usaModelo: campos != null };
}

export async function salvarAssinatura(id, campos) {
  await garantirTabela();
  await q(`INSERT INTO email_assinaturas_colaboradores (usuario_id,campos) VALUES (?,?)
    ON DUPLICATE KEY UPDATE campos=VALUES(campos)`, [id, JSON.stringify(campos)]);
}

const escapar = value => String(value ?? "").replace(/[&<>"']/g,
  c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[c]);

export function modeloAssinatura(dados) {
  const valores = { ...dados.cadastro, ...dados.personalizados, ...(dados.contatosOficiais || contatosPadrao), site: "www.rodrinoxpro.com.br" };
  const visibilidade = { ...visibilidadePadrao, ...dados.visibilidade };
  const { nome, cargo, setor, email, emailExtra, telefone, whatsapp, site } = Object.fromEntries(
    Object.entries(valores).filter(([campo]) => visibilidade[campo])
  );
  const contatos = [email, emailExtra, site, telefone, whatsapp].filter(Boolean);
  const contatosHtml = [
    [email, "✉", "#42b4ff"], [emailExtra, "✉", "#42b4ff"], [site, "↗", "#42b4ff"],
    [telefone, "☎", "#42b4ff"], [whatsapp, "☎", "#38dc87"],
  ].filter(([valor]) => valor).map(([valor, icone, cor]) =>
    `<div style="margin-top:5px"><span style="display:inline-block;width:20px;color:${cor};font-size:15px" aria-hidden="true">${icone}</span><span style="padding-left:7px;border-left:1px solid #41668a">${escapar(valor)}</span></div>`
  ).join("");
  const temIdentificacao = Boolean(nome || cargo || setor);
  const linha = value => value ? `<div style="margin-top:4px">${escapar(value)}</div>` : "";
  const html = `<table role="presentation" cellpadding="0" cellspacing="0" bgcolor="#060e20" style="width:100%;max-width:760px;margin-top:12px;color:#fff;background:#060e20;background-image:linear-gradient(120deg,#030711,#0b172e 53%,#040914);border-top:2px solid #3495ec;border-bottom:3px solid #f26a1b;font:13px/1.45 Arial,sans-serif;table-layout:fixed">
  <tr>
    <td valign="middle" align="center" style="width:31%;padding:20px 12px;border-right:1px solid #479ce9"><img src="https://rodrinoxpro.com.br/colaborador/assets/logo-horizontal-oficial-colorida.png" alt="Rodrinoxpro" width="168" style="display:block;width:100%;max-width:168px;height:auto;margin:0 auto"></td>
    ${temIdentificacao ? `<td valign="middle" style="width:29%;padding:20px 12px;border-right:1px solid #ed833e;overflow-wrap:anywhere;word-wrap:break-word"><strong style="display:block;font-size:22px;line-height:1.18;color:#fff">${escapar(nome)}</strong><div style="margin-top:6px;color:#dbe9fa">${cargo ? `<strong style="color:#fff">${escapar(cargo)}</strong>` : ""}${linha(setor)}</div></td>` : ""}
    ${contatos.length ? `<td valign="middle" style="width:40%;padding:16px 12px;color:#dbe9fa;overflow-wrap:anywhere;word-wrap:break-word">${contatosHtml}</td>` : ""}
  </tr></table>`;
  return { html, texto: [nome, cargo, setor, ...contatos].filter(Boolean).join("\n") };
}
