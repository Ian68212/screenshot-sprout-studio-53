// Carrega as imagens públicas configuradas em Gerenciador do Site > Login — Acesso restrito.
// Este script só altera o navegador; o aplicativo instalado mantém a arte integral original.
(async () => {
  if (document.body.dataset.view !== "browser") return;
  try {
    const response = await fetch("/colaborador/api/public/site/", {
      credentials: "same-origin",
      cache: "no-store",
      headers: { "Accept": "application/json" }
    });
    if (!response.ok) return;
    const data = await response.json();
    const registro = (data.conteudos || []).find((item) => item.chave === "pagina.login");
    if (!registro) return;
    let config;
    try { config = JSON.parse(registro.corpo || "{}"); } catch { return; }
    const versao = encodeURIComponent(registro.atualizado_em || Date.now());
    const fotoId = Number(config.imagem_id);
    const logoId = Number(config.logo_imagem_id);
    const painelFoto = document.querySelector(".hero-panel");
    const logo = document.getElementById("login-logo");

    if (Number.isSafeInteger(fotoId) && fotoId > 0 && painelFoto) {
      const url = "/colaborador/api/public/site/midias/" + fotoId + "?v=" + versao;
      const imagem = new Image();
      imagem.onload = () => {
        painelFoto.style.backgroundImage =
          'linear-gradient(90deg,rgba(3,19,40,.16),rgba(3,19,40,0)),url("' + url + '")';
        painelFoto.style.backgroundSize = "cover,cover";
        painelFoto.style.backgroundPosition = "center,center";
      };
      imagem.src = url;
    }

    if (Number.isSafeInteger(logoId) && logoId > 0 && logo) {
      const url = "/colaborador/api/public/site/midias/" + logoId + "?v=" + versao;
      const imagem = new Image();
      imagem.onload = () => { logo.src = url; };
      imagem.src = url;
    }
  } catch (error) {
    console.warn("Não foi possível carregar as imagens personalizadas do login.", error);
  }
})();
