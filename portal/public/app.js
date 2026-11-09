window.api = async (url, opts = {}) => {
  const r = await fetch("/colaborador/api/" + url, {
    ...opts, credentials: "same-origin",
    headers: { "Content-Type": "application/json", "X-Portal": "1" },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  if (r.status === 401 && !location.pathname.endsWith("/colaborador/") && !location.pathname.endsWith("index.html")) location.href = "/colaborador/";
  if (!r.ok) throw new Error(data.erro || "Erro");
  return data;
};
window.esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
window.sair = async () => { await api("logout", { method: "POST" }); location.href = "/colaborador/"; };
document.addEventListener("click", (e) => { if (e.target.id === "sair") { e.preventDefault(); sair(); } });
