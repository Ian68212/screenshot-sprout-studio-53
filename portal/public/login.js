const form = document.getElementById("f");
const emailInput = document.getElementById("email");
const senhaInput = document.getElementById("senha");
const erro = document.getElementById("erro");
const submit = document.getElementById("submit");
const toggle = document.getElementById("toggle-password");

api("eu").then(() => {
  location.href = "/colaborador/painel.html";
}).catch(() => {});

toggle?.addEventListener("click", () => {
  const mostrar = senhaInput.type === "password";
  senhaInput.type = mostrar ? "text" : "password";
  toggle.setAttribute("aria-label", mostrar ? "Ocultar senha" : "Mostrar senha");
  toggle.setAttribute("aria-pressed", String(mostrar));
  toggle.innerHTML = mostrar
    ? '<svg viewBox="0 0 24 24"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>'
    : '<svg viewBox="0 0 24 24"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/><path d="m3 3 18 18"/></svg>';
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  erro.textContent = "";
  if (!emailInput.value.trim() || !senhaInput.value) {
    erro.textContent = "Informe seu e-mail e sua senha corporativa.";
    return;
  }
  submit.disabled = true;
  submit.querySelector("span").textContent = "Verificando acesso...";
  try {
    await api("login", {
      method: "POST",
      body: { email: emailInput.value.trim(), senha: senhaInput.value }
    });
    location.href = "/colaborador/painel.html";
  } catch (error) {
    erro.textContent = error.message || "Não foi possível entrar. Confira suas credenciais.";
  } finally {
    submit.disabled = false;
    submit.querySelector("span").textContent = "Entrar com segurança";
  }
});

const forgotPassword = document.getElementById("forgot-password");
forgotPassword?.addEventListener("click", () => {
  erro.textContent = "Para redefinir sua senha corporativa, entre em contato com o administrador responsável pelo seu e-mail.";
});
