import { test } from "node:test";
import assert from "node:assert/strict";
import { pode, podeVerFerramenta, senhaValida } from "../src/permissions.js";

const colab = { ativo: true, perfil: "colaborador", setor_id: 1, cargo_id: 2 };

test("só administrador cadastra colaboradores", () => {
  assert.equal(pode({ ativo: true, perfil: "admin" }, "admin.usuarios"), true);
  assert.equal(pode({ ativo: true, perfil: "gestor" }, "admin.usuarios"), false);
  assert.equal(pode(colab, "admin.usuarios"), false);
});

test("usuário desativado não acessa o painel", () => {
  assert.equal(pode({ ...colab, ativo: false }, "painel"), false);
});

test("ferramenta sem regra só aparece para admin", () => {
  assert.equal(podeVerFerramenta(colab, []), false);
  assert.equal(podeVerFerramenta({ ativo: true, perfil: "admin" }, []), true);
});

test("ferramenta liberada por setor respeita o setor", () => {
  assert.equal(podeVerFerramenta(colab, [{ setor_id: 1 }]), true);
  assert.equal(podeVerFerramenta(colab, [{ setor_id: 9 }]), false);
});

test("regra combinando setor e cargo exige os dois", () => {
  assert.equal(podeVerFerramenta(colab, [{ setor_id: 1, cargo_id: 3 }]), false);
  assert.equal(podeVerFerramenta(colab, [{ setor_id: 1, cargo_id: 2 }]), true);
});

test("senha exige 10 caracteres com letras e números", () => {
  assert.equal(senhaValida("abc123"), false);
  assert.equal(senhaValida("somenteletras"), false);
  assert.equal(senhaValida("Rodrinox2026"), true);
});
