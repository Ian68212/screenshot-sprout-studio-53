const form = (f) => Object.fromEntries(new FormData(f));
const opts = (l, vazio) => `<option value="">${vazio}</option>` + l.map((x) => `<option value="${x.id}">${esc(x.nome)}</option>`).join("");

async function carregar() {
  const { setores, cargos } = await api("admin/estrutura");
  document.querySelectorAll(".selSetor").forEach((s) => (s.innerHTML = opts(setores, "Qualquer / nenhum")));
  document.querySelectorAll(".selCargo").forEach((s) => (s.innerHTML = opts(cargos, "Qualquer / nenhum")));
  lista.textContent = `Setores: ${setores.map((s) => s.nome).join(", ") || "—"} | Cargos: ${cargos.map((c) => c.nome).join(", ") || "—"}`;
  const us = await api("admin/usuarios");
  tu.innerHTML = us.map((u) => `<tr><td>${esc(u.nome)}</td><td>${esc(u.email)}</td><td>${esc(u.perfil)}</td><td>${esc(u.setor || "—")}</td><td>${esc(u.cargo || "—")}</td>
    <td>${u.ativo ? "Ativo" : "Inativo"}</td><td class="acoes-usuario">
      <button class="sec" data-acao="editar" data-id="${u.id}">Editar</button>
      <button class="sec" data-acao="status" data-id="${u.id}" data-ativo="${u.ativo ? 0 : 1}">${u.ativo ? "Desativar" : "Ativar"}</button>
      <button class="perigo" data-acao="excluir" data-id="${u.id}" data-nome="${esc(u.nome)}">Excluir</button>
    </td></tr>`).join("");
}
async function candidaturas() {
 const items=await api("admin/candidaturas");
 tc.replaceChildren();
 for(const item of items){
  const tr=document.createElement("tr");
  const cells=[new Date(item.criado_em).toLocaleString("pt-BR"),item.nome,item.email+" · "+item.telefone,item.area];
  for(const value of cells){const td=document.createElement("td");td.textContent=value??"";tr.append(td);}
  const fileTd=document.createElement("td"),link=document.createElement("a");
  link.href="api/admin/candidaturas/"+item.id+"/curriculo";link.textContent="Baixar PDF";link.setAttribute("download","curriculo.pdf");fileTd.append(link);tr.append(fileTd);
  const statusTd=document.createElement("td"),select=document.createElement("select");
  for(const [value,label] of [["recebido","Recebido"],["em_analise","Em análise"],["aprovado","Aprovado"],["reprovado","Reprovado"]])select.add(new Option(label,value));
  select.value=item.status;select.addEventListener("change",async()=>{try{await api("admin/candidaturas/"+item.id,{method:"PATCH",body:{status:select.value}});}catch(e){alert(e.message);}});
  statusTd.append(select);tr.append(statusTd);tc.append(tr);
 }
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
    enviar(fu, "admin/usuarios", document.getElementById("eu"));
    enviar(fs, "admin/setores"); enviar(fc, "admin/cargos");
    enviar(ff, "admin/ferramentas", ef, (f) => {
      const d = form(f);
      return { nome: d.nome, url: d.url, descricao: d.descricao, categoria: d.categoria,
        regras: d.setor_id || d.cargo_id || d.perfil ? [{ setor_id: d.setor_id, cargo_id: d.cargo_id, perfil: d.perfil }] : [{}] };
    });
    const dialog = document.getElementById("editarUsuario");
    const editarForm = document.getElementById("formEditarUsuario");
    tu.addEventListener("click", async (e) => {
      const b = e.target.closest("button[data-id]"); if (!b) return;
      const id = b.dataset.id;
      try {
        if (b.dataset.acao === "editar") {
          const usuarios = await api("admin/usuarios");
          const u = usuarios.find((item) => String(item.id) === String(id));
          if (!u) throw new Error("Colaborador não encontrado.");
          editarForm.elements.id.value = u.id;
          editarForm.elements.nome.value = u.nome || "";
          editarForm.elements.email.value = u.email || "";
          editarForm.elements.perfil.value = u.perfil || "colaborador";
          editarForm.elements.setor_id.value = u.setor_id || "";
          editarForm.elements.cargo_id.value = u.cargo_id || "";
          dialog.showModal();
          return;
        }
        if (b.dataset.acao === "status") {
          await api(`admin/usuarios/${id}`, { method: "PATCH", body: { ativo: b.dataset.ativo === "1" } });
          await carregar();
          return;
        }
        if (b.dataset.acao === "excluir") {
          if (!confirm(`Tem certeza de que deseja excluir definitivamente o cadastro de ${b.dataset.nome}? Essa ação não poderá ser desfeita.`)) return;
          await api(`admin/usuarios/${id}`, { method: "DELETE" });
          await carregar();
        }
      } catch (err) { alert(err.message); }
    });
    editarForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const dados = Object.fromEntries(new FormData(editarForm));
      const id = dados.id;
      delete dados.id;
      dados.setor_id = dados.setor_id || null;
      dados.cargo_id = dados.cargo_id || null;
      const erro = document.getElementById("erroEditarUsuario");
      erro.textContent = "";
      try {
        await api(`admin/usuarios/${id}`, { method: "PATCH", body: dados });
        dialog.close();
        await carregar();
      } catch (err) { erro.textContent = err.message; }
    });
  }
  await auditoria().catch(() => (location.href = "painel.html"));
  if ((await api("eu")).perfil === "admin") await candidaturas().catch(err => console.error(err));
})();
