import test from "node:test";
import assert from "node:assert/strict";
import { autorDigiSac, identidadeDigiSac } from "../src/digisac-identidade.js";

const corporativo = "10000000-0000-4000-8000-000000000001";
const individual = "10000000-0000-4000-8000-000000000002";

test("usa a identidade corporativa mesmo quando o navegador envia outro autor", () => {
  const identidade = identidadeDigiSac(" " + corporativo + " ");
  assert.equal(identidade.corporativa, true);
  assert.equal(autorDigiSac(identidade, individual), corporativo);
  assert.equal(autorDigiSac(identidade), corporativo);
});

test("mantém o autor individual sem configuração corporativa", () => {
  const identidade = identidadeDigiSac("");
  assert.equal(identidade.corporativa, false);
  assert.equal(autorDigiSac(identidade, individual), individual);
});

test("rejeita configuração corporativa inválida", () => {
  const identidade = identidadeDigiSac("id-invalido");
  assert.equal(identidade.valida, false);
  assert.throws(() => autorDigiSac(identidade, individual), { status: 503 });
});
