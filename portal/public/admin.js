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
    const preview = document.getElementById("previewFerramenta");
    ff.elements.imagem.addEventListener("change", () => {
      const file = ff.elements.imagem.files[0];
      if (!file) { preview.hidden = true; preview.removeAttribute("src"); return; }
      if (!["image/jpeg","image/png","image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
        ff.elements.imagem.value = ""; preview.hidden = true;
        alert("Selecione JPG, PNG ou WebP de até 5 MB."); return;
      }
      preview.src = URL.createObjectURL(file); preview.hidden = false;
    });
    async function carregarFerramentas() {
      const { ferramentas } = await api("admin/ferramentas");
      const tbody = document.getElementById("listaFerramentas");
      tbody.innerHTML = ferramentas.map((item) => `<tr>
        <td>${item.imagem_url ? `<img class="miniatura-ferramenta" src="${esc(item.imagem_url)}" alt="">` : "—"}</td>
        <td>${esc(item.nome)}</td><td>${esc(item.categoria)}</td><td>${esc(item.descricao || "—")}</td>
        <td><button type="button" class="perigo" data-excluir-ferramenta="${item.id}" data-nome="${esc(item.nome)}">Excluir</button></td>
      </tr>`).join("") || '<tr><td colspan="5">Nenhuma ferramenta ou documento cadastrado.</td></tr>';
    }
    ff.addEventListener("submit", async (e) => {
      e.preventDefault();
      const erro = document.getElementById("ef"); erro.textContent = "";
      const d = form(ff);
      try {
        let imagem_url = null;
        const arquivo = ff.elements.imagem.files[0];
        if (arquivo) {
          const dadosImagem = new FormData();
          dadosImagem.append("imagem", arquivo);
          dadosImagem.append("descricao", "Ferramenta/documento: " + d.nome);
          const resposta = await fetch("/colaborador/api/site/midias", {
            method: "POST", credentials: "same-origin", headers: { "X-Portal": "1" }, body: dadosImagem
          });
          const enviada = await resposta.json().catch(() => ({}));
          if (!resposta.ok) throw new Error("Falha ao enviar a foto: " + (enviada.erro || ("HTTP " + resposta.status)));
          if (!enviada.id) throw new Error("O servidor recebeu a foto, mas não retornou o identificador da imagem.");
          imagem_url = "/colaborador/api/site/midias/" + enviada.id + "/arquivo";
        }
        try {
          await api("admin/ferramentas", { method: "POST", body: {
            nome: d.nome, url: d.url, descricao: d.descricao, categoria: d.categoria, imagem_url,
            regras: d.setor_id || d.cargo_id || d.perfil ? [{ setor_id: d.setor_id, cargo_id: d.cargo_id, perfil: d.perfil }] : [{}]
          }});
        } catch (falhaCadastro) {
          throw new Error("A foto foi enviada, mas o cadastro não foi salvo: " + falhaCadastro.message);
        }
        ff.reset(); preview.hidden = true; preview.removeAttribute("src");
        await carregarFerramentas();
        alert("Ferramenta ou documento cadastrado com sucesso.");
      } catch (err) { erro.textContent = err.message; }
    });
    document.getElementById("listaFerramentas").addEventListener("click", async (e) => {
      const b = e.target.closest("button[data-excluir-ferramenta]");
      if (!b) return;
      if (!confirm(`Deseja excluir definitivamente "${b.dataset.nome}"? A imagem continuará na biblioteca de mídias e poderá ser reutilizada.`)) return;
      try {
        await api("admin/ferramentas/" + b.dataset.excluirFerramenta, { method: "DELETE" });
        await carregarFerramentas();
      } catch (err) { alert(err.message); }
    });
    await carregarFerramentas();
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
  document.getElementById("cancelarEdicao")?.addEventListener("click", () => document.getElementById("editarUsuario").close());
  await auditoria().catch(() => (location.href = "painel.html"));
})();
