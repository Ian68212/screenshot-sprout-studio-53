import test from "node:test";
import assert from "node:assert/strict";
import { assinarMensagemDigiSac, autorDigiSac, identidadeDigiSac } from "../src/digisac-identidade.js";

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

test("assina textos e anexos com o primeiro nome da sessão quando habilitado", () => {
  const identidade = identidadeDigiSac(corporativo);
  const usuario = { nome: " Rodrigo Batista do Nascimento " };
  assert.equal(assinarMensagemDigiSac(" teste 002 ", usuario, identidade, true), "Rodrigo:\nteste 002");
  assert.equal(assinarMensagemDigiSac("", usuario, identidade, true), "Rodrigo:");
  assert.equal(assinarMensagemDigiSac(" teste 002 ", usuario, identidade, false), "teste 002");
  assert.equal(assinarMensagemDigiSac(" teste 002 ", usuario, identidadeDigiSac(""), true), "teste 002");
});
