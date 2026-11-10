const CATS = { documentos: "Documentos", comunicados: "Comunicados", treinamentos: "Treinamentos", ferramentas: "Ferramentas" };
(async () => {
  const eu = await api("eu");
  ola.textContent = `Olá, ${eu.nome.split(" ")[0]}`;
  info.textContent = [eu.setor, eu.cargo, eu.perfil].filter(Boolean).join(" · ");
  if (eu.perfil === "admin" || eu.perfil === "gestor") lnkAdmin.hidden = false;
  if (eu.perfil === "admin") lnkSiteAdmin.hidden = false;

  // Central de Aplicativos: Android tenta abrir o app instalado; se não houver,
  // o Chrome usa o endereço da Play Store como fallback. No iOS usamos a App Store
  // até que a Intelbras publique/valide um esquema oficial de abertura direta.
  const androidLink = document.getElementById("abrirIsicAndroid");
  const iosLink = document.getElementById("abrirIsicIOS");
  const statusIsic = document.getElementById("statusIsic");
  const agente = navigator.userAgent || "";
  const android = /Android/i.test(agente);
  const ios = /iPhone|iPad|iPod/i.test(agente) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (android) {
    androidLink.href = "intent://#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=com.intelbras.isiclite;S.browser_fallback_url=https%3A%2F%2Fplay.google.com%2Fstore%2Fapps%2Fdetails%3Fid%3Dcom.intelbras.isiclite;end";
    androidLink.textContent = "Abrir aplicativo";
    iosLink.hidden = true;
    statusIsic.textContent = "Android: tentaremos abrir o iSIC Lite. Se não estiver instalado, abriremos a Google Play.";
  } else if (ios) {
    androidLink.hidden = true;
    iosLink.textContent = "Abrir / instalar iSIC Lite";
    statusIsic.textContent = "iPhone: abre a página oficial do iSIC Lite na App Store.";
  } else {
    statusIsic.textContent = "Acesse pelo celular: Android ou iPhone. No computador, escolha a loja correspondente ao seu aparelho.";
  }
  const itens = await api("ferramentas");
  cats.innerHTML = Object.entries(CATS).map(([k, t]) => {
    const l = itens.filter((i) => i.categoria === k);
    return `<section><h2>${t}</h2>${l.length ? `<div class="grid">${l.map((i) =>
      `<a class="card card-recurso" href="${esc(i.url)}" target="_blank" rel="noopener">${i.imagem_url ? `<img class="imagem-recurso" src="${esc(i.imagem_url)}" alt="">` : `<div class="imagem-recurso sem-imagem"><span>Rodrinox Pro</span></div>`}<div class="conteudo-recurso"><h3>${esc(i.nome)}</h3><p>${esc(i.descricao || "")}</p><span class="abrir-recurso">Abrir recurso ↗</span></div></a>`).join("")}</div>`
      : `<p style="color:#5d6b7e">Nenhum item disponível ainda.</p>`}</section>`;
  }).join("");
})();
