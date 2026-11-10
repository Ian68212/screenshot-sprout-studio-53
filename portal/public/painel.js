const CATS = { documentos: "Documentos", comunicados: "Comunicados", treinamentos: "Treinamentos", ferramentas: "Ferramentas" };
(async () => {
  const eu = await api("eu");
  ola.textContent = `Olá, ${eu.nome.split(" ")[0]}`;
  info.textContent = [eu.setor, eu.cargo, eu.perfil].filter(Boolean).join(" · ");
  if (eu.perfil === "admin" || eu.perfil === "gestor") lnkAdmin.hidden = false;
  if (eu.perfil === "admin") lnkSiteAdmin.hidden = false;
  const itens = await api("ferramentas");
  cats.innerHTML = Object.entries(CATS).map(([k, t]) => {
    const l = itens.filter((i) => i.categoria === k);
    return `<section><h2>${t}</h2>${l.length ? `<div class="grid">${l.map((i) =>
      `<a class="card card-recurso" href="${esc(i.url)}" target="_blank" rel="noopener">${i.imagem_url ? `<img class="imagem-recurso" src="${esc(i.imagem_url)}" alt="">` : `<div class="imagem-recurso sem-imagem"><span>Rodrinox Pro</span></div>`}<div class="conteudo-recurso"><h3>${esc(i.nome)}</h3><p>${esc(i.descricao || "")}</p><span class="abrir-recurso">Abrir recurso ↗</span></div></a>`).join("")}</div>`
      : `<p style="color:#5d6b7e">Nenhum item disponível ainda.</p>`}</section>`;
  }).join("");
})();
