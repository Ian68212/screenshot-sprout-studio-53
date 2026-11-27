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

function nomePadraoAssinatura(nome, email) {
  const partes = (nome || "").trim().split(/\s+/).filter(Boolean);
  const [primeiro] = partes;
  if (partes.length < 2) return primeiro || "";

  const normalizar = valor => valor.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  const [inicio = "", sobrenome = ""] = (email || "").split("@")[0].split(/[._-]/);
  const sobrenomes = partes.slice(1).filter(parte => !/^(da|de|do|das|dos|e)$/i.test(parte));
  const correspondente = normalizar(inicio) === normalizar(primeiro)
    ? sobrenomes.find(parte => normalizar(parte) === normalizar(sobrenome))
    : undefined;
  return [primeiro, correspondente || sobrenomes.at(-1)].filter(Boolean).join(" ");
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
  cadastro.nome = nomePadraoAssinatura(cadastro.nome, cadastro.email);
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
  const assets = "https://rodrinoxpro.com.br/colaborador/assets/assinatura";
  const contatosHtml = [
    [email, "email"], [emailExtra, "email"], [site, "site"],
    [telefone, "telefone"], [whatsapp, "whatsapp"],
  ].filter(([valor]) => valor).map(([valor, icone]) =>
    `<tr><td width="26" valign="middle" style="padding:2px 0"><img src="${assets}/${icone}.png" width="19" alt="" style="display:block;height:auto;border:0"></td><td style="padding:2px 0 2px 9px;border-left:1px solid #5786a5;color:#fff;overflow-wrap:anywhere">${escapar(valor)}</td></tr>`
  ).join("");
  const temIdentificacao = Boolean(nome || cargo || setor);
  const divisa = `<td width="5" aria-hidden="true" style="width:5px;padding:0"><img src="${assets}/divisoria.png" width="5" alt="" style="display:block;width:5px;height:100%;max-height:153px"></td>`;
  const html = `<table role="presentation" cellpadding="0" cellspacing="0" bgcolor="#030917" style="width:100%;max-width:760px;margin-top:12px;color:#fff;background:#030917;border-top:1px solid #147aab;border-bottom:2px solid #f26a1b;table-layout:fixed;font:13px/1.35 Arial,sans-serif">
  <tr>
    <td width="40%" valign="middle" style="width:40%;padding:0"><img src="${assets}/marca.png" alt="Rodrinoxpro" width="302" style="display:block;width:100%;height:auto;border:0"></td>
    ${temIdentificacao ? `<td width="30%" valign="middle" style="padding:14px 8px;color:#fff;overflow-wrap:anywhere;word-wrap:break-word">
      ${nome ? `<strong style="display:block;font-size:27px;line-height:1.07;letter-spacing:-.04em;color:#fff">${escapar(nome)}</strong>` : ""}
      ${cargo ? `<strong style="display:block;margin-top:5px;font-size:14px;color:#fff">${escapar(cargo)}</strong>` : ""}
      ${setor ? `<div style="margin-top:2px;font-size:13px;color:#fff">${escapar(setor)}</div>` : ""}
    </td>` : ""}
    ${contatos.length ? `${divisa}<td valign="middle" style="padding:13px 10px;background:#030917 url('${assets}/canto.png') no-repeat right bottom;background-size:69px 25px"><table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;table-layout:fixed;font:12px/1.4 Arial,sans-serif;color:#fff">${contatosHtml}</table></td>` : ""}
  </tr></table>`;
  return { html, texto: [nome, cargo, setor, ...contatos].filter(Boolean).join("\n") };
}
