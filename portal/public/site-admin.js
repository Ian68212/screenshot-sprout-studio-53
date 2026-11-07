const $ = (s) => document.querySelector(s);
const aviso = (s) => { $("#aviso").textContent = s; };
async function carregarSite() {
  try {
    const tipo = $("#tipo").value;
    const dados = await api("site/itens?tipo=" + encodeURIComponent(tipo));
    $("#itens").replaceChildren();
    for (const item of dados) {
      const li = document.createElement("li");
      li.textContent = item.titulo + " (" + item.status + ")";
      $("#itens").append(li);
    }
    aviso(dados.length ? dados.length + " registro(s)" : "Nenhum item cadastrado");
  } catch (e) { aviso(e.message); }
}
async function carregarMidias() {
  const dados = await api("site/midias");
  $("#midias").replaceChildren();
  for (const m of dados) {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = "api/site/midias/" + m.id + "/arquivo";
    a.textContent = "#" + m.id + " — " + m.nome_original;
    a.target = "_blank"; a.rel = "noopener";
    li.append(a); $("#midias").append(li);
  }
}
$("#upload").addEventListener("submit", async (e) => {
  e.preventDefault();
  const dados = new FormData(e.currentTarget);
  try {
    const r = await fetch("api/site/midias", {method:"POST",credentials:"same-origin",headers:{"X-Portal":"1"},body:dados});
    const resposta = await r.json().catch(()=>({}));
    if (!r.ok) throw new Error(resposta.erro || "Falha no envio");
    aviso("Imagem enviada com sucesso: #" + resposta.id);
    e.currentTarget.reset();
    await carregarMidias();
  } catch(err) { aviso(err.message); }
});
$("#tipo").addEventListener("change", carregarSite);
$("#atualizar").addEventListener("click", carregarSite);
$("#novo").addEventListener("submit", async (e) => {
  e.preventDefault();
  const d = Object.fromEntries(new FormData(e.currentTarget));
  try {
    await api("site/itens", { method:"POST", body: { ...d, tipo:$("#tipo").value, status:"rascunho" } });
    e.currentTarget.reset(); aviso("Rascunho salvo no banco de testes"); await carregarSite();
  } catch (err) { aviso(err.message); }
});
(async () => {
  try {
    const u = await api("eu");
    if (u.perfil !== "admin") { aviso("Acesso restrito ao administrador"); $("#novo").hidden = true; return; }
    await carregarSite();
    await carregarMidias();
  } catch { location.href = "index.html"; }
})();
