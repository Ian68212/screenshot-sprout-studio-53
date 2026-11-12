let installPrompt = null;
const installButton = document.getElementById("install-app");
window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  installPrompt = event;
  if (installButton) installButton.style.display = "inline-flex";
});
installButton?.addEventListener("click", async () => {
  if (!installPrompt) return;
  installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = null;
  installButton.style.display = "none";
});
window.addEventListener("appinstalled", () => {
  if (installButton) installButton.style.display = "none";
});
if ("serviceWorker" in navigator && location.protocol === "https:") {
  window.addEventListener("load", async () => { try { const registration = await navigator.serviceWorker.register("/colaborador/sw.js", { scope: "/colaborador/", updateViaCache: "none" }); await registration.update(); } catch (error) { console.warn("Atualizacao do portal indisponivel:", error); } });
}