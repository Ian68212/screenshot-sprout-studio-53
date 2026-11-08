const form = (f) => Object.fromEntries(new FormData(f));
const opts = (l, vazio) => `<option value="">${vazio}</option>` + l.map((x) => `<option value="${x.id}">${esc(x.nome)}</option>`).join("");

async function carregar() {
  const { setores, cargos } = await api("admin/estrutura");
  document.querySelectorAll(".selSetor").forEach((s) => (s.innerHTML = opts(setores, "Qualquer / nenhum")));
  document.querySelectorAll(".selCargo").forEach((s) => (s.innerHTML = opts(cargos, "Qualquer / nenhum")));
  lista.textContent = `Setores: ${setores.map((s) => s.nome).join(", ") || "—"} | Cargos: ${cargos.map((c) => c.nome).join(", ") || "—"}`;
  const us = await api("admin/usuarios");
  tu.innerHTML = us.map((u) => `<tr><td>${esc(u.nome)}</td><td>${esc(u.email)}</td><td>${esc(u.perfil)}</td><td>${esc(u.setor)}</td><td>${esc(u.cargo)}</td>
    <td>${u.ativo ? "Ativo" : "Inativo"}</td><td><button class="sec" data-id="${u.id}" data-ativo="${u.ativo ? 0 : 1}">${u.ativo ? "Desativar" : "Ativar"}</button></td></tr>`).join("");
}
async function candidaturas() {
  const itens = await api("admin/candidaturas");
  const status = { recebido: "Recebido", em_analise: "Em análise", entrevista: "Entrevista", aprovado: "Aprovado", reprovado: "Reprovado" };
  tc.innerHTML = itens.map((x) => `<tr><td>${new Date(x.criado_em).toLocaleDateString("pt-BR")}</td><td>${esc(x.nome)}</td><td><a href="mailto:${encodeURIComponent(x.email)}">${esc(x.email)}</a><br>${esc(x.telefone)}</td><td>${esc(x.area)}</td><td>${esc(x.cargo_pretendido || "—")}</td><td><a href="api/admin/candidaturas/${x.id}/curriculo">Baixar currículo</a></td><td><select data-candidatura="${x.id}">${Object.entries(status).map(([v,t]) => `<option value="${v}" ${x.status === v ? "selected" : ""}>${t}</option>`).join("")}</select></td></tr>`).join("") || `<tr><td colspan="7">Nenhuma candidatura recebida.</td></tr>`;
}
async function auditoria() {
  const a = await api("admin/auditoria");
  ta.innerHTML = a.map((x) => `<tr><td>${new Date(x.criado_em).toLocaleString("pt-BR")}</td><td>${esc(x.email)}</td><td>${esc(x.acao)}</td><td>${esc(x.detalhe)}</td></tr>`).join("");
}
const enviar = (f, url, erroEl, montar = form) => f.addEventListener("submit", async (e) => {
  e.preventDefault(); if (erroEl) erroEl.textContent = "";
  try { await api(url, { method: "POST", body: montar(f) }); f.reset(); await carregar(); } catch (err) { if (erroEl) erroEl.textContent = err.message; else alert(err.message); }
});

(async () => {
  const eu = await api("eu");
  if (eu.perfil === "admin") {
    soAdmin.hidden = false;
    await carregar();
    await candidaturas();
    tc.addEventListener("change", async (e) => {
      const s = e.target.closest("select[data-candidatura]");
      if (!s) return;
      try {
        await api(`admin/candidaturas/${s.dataset.candidatura}`, { method: "PATCH", body: { status: s.value } });
        await auditoria();
      } catch (err) { alert(err.message); }
    });
    enviar(fu, "admin/usuarios", document.getElementById("eu"));
    enviar(fs, "admin/setores"); enviar(fc, "admin/cargos");
    enviar(ff, "admin/ferramentas", ef, (f) => {
      const d = form(f);
      return { nome: d.nome, url: d.url, descricao: d.descricao, categoria: d.categoria,
        regras: d.setor_id || d.cargo_id || d.perfil ? [{ setor_id: d.setor_id, cargo_id: d.cargo_id, perfil: d.perfil }] : [{}] };
    });
    tu.addEventListener("click", async (e) => {
      const b = e.target.closest("button[data-id]"); if (!b) return;
      try { await api(`admin/usuarios/${b.dataset.id}`, { method: "PATCH", body: { ativo: b.dataset.ativo === "1" } }); await carregar(); } catch (err) { alert(err.message); }
    });
  }
  await auditoria().catch(() => (location.href = "painel.html"));
})();
