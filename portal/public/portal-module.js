(() => {
  const path = location.pathname;
  const isEmail = path.endsWith("/email-corporativo.html");
  const module = isEmail ? "email" : "propostas";
  const embedded = window.parent !== window && new URLSearchParams(location.search).get("noPortal") === "1";

  if (embedded) {
    document.body.classList.add("portal-embedded");
    return;
  }

  const portal = path.includes("/homologacao/") ? "homologacao" : "oficial";
  location.replace("/colaborador/" + portal + "/#" + module);
})();
