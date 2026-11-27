import test from "node:test";
import assert from "node:assert/strict";
import { assinarMensagemDigiSac, autorDigiSac, classificarChamadoCorporativo, identidadeDigiSac } from "../src/digisac-identidade.js";

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
  assert.equal(assinarMensagemDigiSac(" teste 002 ", usuario, identidade, true), "*Rodrigo:*\nteste 002");
  assert.equal(assinarMensagemDigiSac("", usuario, identidade, true), "*Rodrigo:*");
  assert.equal(assinarMensagemDigiSac(" teste 002 ", usuario, identidade, false), "teste 002");
  assert.equal(assinarMensagemDigiSac(" teste 002 ", usuario, identidadeDigiSac(""), true), "teste 002");
});

test("a fila corporativa ignora o responsável do protocolo anterior", () => {
  const novo = { createdAt: "2026-11-27T22:58:47.379Z", userId: null };
  const anterior = { usuario_id: 9, atualizado_em: "2026-11-27T22:58:46.000Z" };
  assert.equal(classificarChamadoCorporativo(novo, anterior, 9), "fila");
  assert.equal(classificarChamadoCorporativo(novo, undefined, 9), "fila");
  const assumido = { usuario_id: 9, atualizado_em: "2026-11-27T22:58:47.000Z" };
  assert.equal(classificarChamadoCorporativo(novo, assumido, 9), "meus");
  assert.equal(classificarChamadoCorporativo(novo, assumido, 10), "atribuido");
});


test("a fila corporativa exclui chamados já atribuídos na DigiSac", () => {
  const chamado = { createdAt: "2026-11-27T22:58:47.379Z", userId: individual };
  assert.equal(classificarChamadoCorporativo(chamado, undefined, 9), "atribuido");
  assert.equal(classificarChamadoCorporativo({
    ...chamado, userId: null, currentTicketTransfer: { userId: individual }
  }, undefined, 9), "atribuido");
});
