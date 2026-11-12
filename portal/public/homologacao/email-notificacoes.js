(() => {
  "use strict";
  if (window.__rodrinoxEmailNoticeStarted) return;
  window.__rodrinoxEmailNoticeStarted = true;

  const style = document.createElement("style");
  style.textContent = `
    #rp-email-notice{position:fixed;right:22px;top:86px;z-index:9998;display:flex;align-items:center;gap:10px;padding:10px 14px;border:1px solid #426987;border-radius:12px;background:#102f4c;color:#edf6ff;box-shadow:0 12px 32px #00101f66;font:600 13px Inter,"Segoe UI",Arial,sans-serif;cursor:pointer;transition:transform .2s,opacity .2s}
    #rp-email-notice:hover{transform:translateY(-2px);background:#173d5e}
    #rp-email-notice .rp-mail-dot{width:9px;height:9px;border-radius:50%;background:#72d6a2;box-shadow:0 0 0 4px #72d6a222}
    #rp-email-notice.has-unread .rp-mail-dot{background:#ff9a38;box-shadow:0 0 0 4px #ff9a3828}
    #rp-email-notice .rp-mail-count{min-width:22px;height:22px;padding:0 6px;display:grid;place-items:center;border-radius:20px;background:#ff922f;color:#13283b;font-weight:800}
    #rp-email-toast{position:fixed;right:22px;top:136px;z-index:9999;max-width:min(360px,calc(100vw - 32px));padding:14px 17px;border:1px solid #ff922f;border-radius:12px;background:#102f4c;color:#edf6ff;box-shadow:0 12px 32px #00101f77;font:13px Inter,"Segoe UI",Arial,sans-serif;display:none}
    #rp-email-toast.show{display:block;animation:rpEmailIn .25s ease-out}
    @keyframes rpEmailIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
    @media(max-width:600px){#rp-email-notice{right:10px;top:76px;padding:8px 10px;font-size:12px}#rp-email-toast{right:10px;top:122px}}
  `;
  document.head.append(style);

  const button = document.createElement("button");
  button.id = "rp-email-notice";
  button.type = "button";
  button.innerHTML = '<span class="rp-mail-dot"></span><span>E-mail corporativo</span><span class="rp-mail-count" id="rp-email-count">0</span>';
  button.addEventListener("click", () => { window.location.href = new URL("email-corporativo.html", window.location.href).href; });
  document.body.append(button);

  const toast = document.createElement("div");
  toast.id = "rp-email-toast";
  toast.setAttribute("role", "status");
  toast.setAttribute("aria-live", "polite");
  document.body.append(toast);

  let lastCount = null;
  let toastTimer = null;
  async function check() {
    if (document.visibilityState !== "visible") return;
    try {
      const response = await fetch("/colaborador/api/email-corporativo/notificacoes", {
        credentials: "same-origin", cache: "no-store", headers: { Accept: "application/json" }
      });
      if (response.status === 401) return;
      if (!response.ok) return;
      const data = await response.json();
      const count = Number(data.naoLidas || 0);
      document.getElementById("rp-email-count").textContent = count > 99 ? "99+" : String(count);
      button.classList.toggle("has-unread", count > 0);
      button.title = count ? count + " e-mail(s) não lido(s)" : "Nenhum e-mail não lido";
      if (lastCount !== null && count > lastCount) {
        const added = count - lastCount;
        toast.textContent = added + (added === 1 ? " novo e-mail chegou." : " novos e-mails chegaram.") + " Clique aqui para abrir sua caixa de entrada.";
        toast.classList.add("show");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.remove("show"), 9000);
      }
      lastCount = count;
    } catch (_) { /* Falha temporária de rede: a próxima verificação tenta novamente. */ }
  }
  toast.addEventListener("click", () => { window.location.href = new URL("email-corporativo.html", window.location.href).href; });
  check();
  setInterval(check, 90000);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") check(); });
})();