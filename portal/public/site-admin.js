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
  } catch { location.href = "index.html"; }
})();
