const CATS = { documentos: "Documentos", comunicados: "Comunicados", treinamentos: "Treinamentos", ferramentas: "Ferramentas" };
(async () => {
  const eu = await api("eu");
  ola.textContent = `Olá, ${eu.nome.split(" ")[0]}`;
  info.textContent = [eu.setor, eu.cargo, eu.perfil].filter(Boolean).join(" · ");
  if (eu.perfil === "admin" || eu.perfil === "gestor") lnkAdmin.hidden = false;
  const itens = await api("ferramentas");
  cats.innerHTML = Object.entries(CATS).map(([k, t]) => {
    const l = itens.filter((i) => i.categoria === k);
    return `<section><h2>${t}</h2>${l.length ? `<div class="grid">${l.map((i) =>
      `<a class="card" style="text-decoration:none;color:inherit" href="${esc(i.url)}" target="_blank" rel="noopener"><h3>${esc(i.nome)}</h3><p style="color:#5d6b7e;margin:0">${esc(i.descricao)}</p></a>`).join("")}</div>`
      : `<p style="color:#5d6b7e">Nenhum item disponível ainda.</p>`}</section>`;
  }).join("");
})();
