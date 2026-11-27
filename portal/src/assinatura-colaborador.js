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
  const contatosHtml = [
    [email, "✉", "#42b4ff"], [emailExtra, "✉", "#42b4ff"], [site, "◎", "#42b4ff"],
    [telefone, "☎", "#42b4ff"], [whatsapp, "☎", "#38dc87"],
  ].filter(([valor]) => valor).map(([valor, icone, cor]) =>
    `<tr><td width="22" valign="middle" style="padding:2px 0;color:${cor};font-size:17px" aria-hidden="true">${icone}</td><td style="padding:2px 0 2px 10px;background:linear-gradient(#58a2d5,#58a2d5) left center/1px 70% no-repeat;overflow-wrap:anywhere">${escapar(valor)}</td></tr>`
  ).join("");
  const temIdentificacao = Boolean(nome || cargo || setor);
  const linha = value => value ? `<div style="margin-top:4px">${escapar(value)}</div>` : "";
  const divisoria = "background-image:linear-gradient(180deg,transparent,#118cf1 25%,#ff7619 52%,#175d9f 82%,transparent);background-position:right center;background-size:2px 78%;background-repeat:no-repeat";
  const html = `<table role="presentation" cellpadding="0" cellspacing="0" bgcolor="#060e20" style="width:100%;max-width:760px;margin-top:12px;color:#fff;background:#060e20;background-image:linear-gradient(135deg,transparent 34%,#ff6a0a 35%,transparent 38%,#1158a6 48%,transparent 51%) top left/64px 64px no-repeat,linear-gradient(315deg,transparent 34%,#1687ef 35%,transparent 38%,#ff6a0a 48%,transparent 51%) bottom right/64px 64px no-repeat,radial-gradient(ellipse at 21% 48%,#102e57 0%,transparent 40%),linear-gradient(105deg,#02050c,#071227 55%,#02050e);border-top:1px solid #3495ec;border-bottom:2px solid #f26a1b;font:13px/1.45 Arial,sans-serif;table-layout:fixed">
  <tr>
    <td valign="middle" align="center" style="width:39%;padding:26px 18px;${temIdentificacao || contatos.length ? divisoria : ""}"><img src="https://rodrinoxpro.com.br/colaborador/assets/logo-horizontal-oficial-colorida.png" alt="Rodrinoxpro" width="242" style="display:block;width:100%;max-width:242px;height:auto;margin:0 auto;filter:drop-shadow(0 0 9px #1674bf)"></td>
    ${temIdentificacao ? `<td valign="middle" style="width:32%;padding:20px 12px;${contatos.length ? divisoria : ""};overflow-wrap:anywhere;word-wrap:break-word"><strong style="display:block;font-size:25px;line-height:1.08;letter-spacing:-.025em;color:#fff">${escapar(nome)}</strong><div style="margin-top:6px;color:#dbe9fa">${cargo ? `<strong style="color:#fff">${escapar(cargo)}</strong>` : ""}${linha(setor)}</div></td>` : ""}
    ${contatos.length ? `<td valign="middle" style="width:29%;padding:13px 12px;color:#dbe9fa;overflow-wrap:anywhere;word-wrap:break-word"><table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;table-layout:fixed;font:12px/1.4 Arial,sans-serif;color:#eef6ff">${contatosHtml}</table></td>` : ""}
  </tr></table>`;
  return { html, texto: [nome, cargo, setor, ...contatos].filter(Boolean).join("\n") };
}
