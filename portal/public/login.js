api("eu").then(() => (location.href = "painel.html")).catch(() => {});
document.getElementById("f").addEventListener("submit", async (e) => {
  e.preventDefault();
  const erro = document.getElementById("erro");
  erro.textContent = "";
  try {
    await api("login", { method: "POST", body: { email: email.value, senha: senha.value } });
    location.href = "painel.html";
  } catch (err) { erro.textContent = err.message; }
});
