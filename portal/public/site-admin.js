
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
  } catch (e) {
    aviso(e.message);
  }
}

async function carregarMidias() {
  try {
    const dados = await api("site/midias");
    $("#midias").replaceChildren();

    for (const m of dados) {
      const li = document.createElement("li");

      li.style.cssText =
        "display:flex;align-items:center;gap:14px;padding:12px;margin:10px 0;border:1px solid #ddd;border-radius:10px;flex-wrap:wrap";

      const img = document.createElement("img");
      img.src = "api/site/midias/" + m.id + "/arquivo";
      img.alt = m.descricao || m.nome_original;
      img.style.cssText =
        "width:100px;height:85px;object-fit:cover;border-radius:8px";

      const info = document.createElement("div");
      info.style.flex = "1";

      const nome = document.createElement("strong");
      nome.textContent = m.descricao || m.nome_original;

      const detalhe = document.createElement("small");
      detalhe.textContent =
        "#" + m.id + "  " + m.mime + "  " +
        Math.round(m.tamanho / 1024) + " KB";
      detalhe.style.display = "block";

      const visualizar = document.createElement("a");
      visualizar.href = img.src;
      visualizar.target = "_blank";
      visualizar.rel = "noopener";
      visualizar.textContent = "Visualizar";

      const excluir = document.createElement("button");
      excluir.type = "button";
      excluir.textContent = "Excluir";
      excluir.style.cssText =
        "background:#b42318;color:white;border:0;border-radius:6px;padding:9px 14px;cursor:pointer";

      excluir.addEventListener("click", async () => {
        if (!confirm("Deseja realmente excluir esta imagem?")) return;

        excluir.disabled = true;

        try {
          await api("site/midias/" + m.id, { method: "DELETE" });
          aviso("Imagem excluída com sucesso.");
          await carregarMidias();
        } catch (e) {
          aviso(e.message);
          excluir.disabled = false;
        }
      });

      info.append(nome, detalhe, document.createElement("br"), visualizar);
      li.append(img, info, excluir);
      $("#midias").append(li);
    }

    if (!dados.length) {
      $("#midias").textContent = "Nenhuma imagem cadastrada.";
    }
  } catch (e) {
    aviso(e.message);
  }
}

$("#upload").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const dados = new FormData(form);

  try {
    const r = await fetch("api/site/midias", {
      method: "POST",
      credentials: "same-origin",
      headers: { "X-Portal": "1" },
      body: dados
    });

    const resposta = await r.json().catch(() => ({}));

    if (!r.ok) throw new Error(resposta.erro || "Falha no envio");

    aviso("Imagem enviada com sucesso: #" + resposta.id);
    form.reset();
    await carregarMidias();
  } catch (err) {
    aviso(err.message);
  }
});

$("#tipo").addEventListener("change", carregarSite);
$("#atualizar").addEventListener("click", carregarSite);

$("#novo").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const d = Object.fromEntries(new FormData(form));

  try {
    await api("site/itens", {
      method: "POST",
      body: {
        ...d,
        tipo: $("#tipo").value,
        status: "rascunho"
      }
    });

    form.reset();
    aviso("Rascunho salvo no banco de testes.");
    await carregarSite();
  } catch (err) {
    aviso(err.message);
  }
});

(async () => {
  try {
    const u = await api("eu");

    if (u.perfil !== "admin") {
      aviso("Acesso restrito ao administrador.");
      $("#novo").hidden = true;
      return;
    }

    await carregarSite();
    await carregarMidias();
  } catch {
    location.href = "index.html";
  }
})();
