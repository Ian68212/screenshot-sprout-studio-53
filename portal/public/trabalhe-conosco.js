
const form = document.getElementById("candidatura");
const retorno = document.getElementById("retorno");
const botao = document.getElementById("enviar");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  retorno.replaceChildren();

  const arquivo = form.elements.curriculo.files[0];

  if (!arquivo) {
    mostrarMensagem("Anexe seu currículo em PDF.", "error");
    return;
  }

  if (arquivo.size > 5 * 1024 * 1024) {
    mostrarMensagem("O currículo não pode ultrapassar 5 MB.", "error");
    return;
  }

  if (!arquivo.name.toLowerCase().endsWith(".pdf")) {
    mostrarMensagem("Envie seu currículo em formato PDF.", "error");
    return;
  }

  botao.disabled = true;
  botao.textContent = "Enviando...";

  try {
    const response = await fetch("/colaborador/api/candidaturas", {
      method: "POST",
      headers: {
        "X-Portal": "1"
      },
      body: new FormData(form),
      credentials: "same-origin"
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.erro || "Não foi possível enviar sua candidatura."
      );
    }

    mostrarMensagem(
      data.mensagem || "Candidatura enviada com sucesso!",
      "success"
    );

    form.reset();

  } catch (error) {
    mostrarMensagem(error.message, "error");

  } finally {
    botao.disabled = false;
    botao.textContent = "Enviar candidatura";
  }
});

function mostrarMensagem(texto, tipo) {
  const p = document.createElement("p");
  p.className = tipo;
  p.textContent = texto;
  retorno.replaceChildren(p);
}
