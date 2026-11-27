const UUID = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;

export function identidadeDigiSac(valorConfigurado = process.env.DIGISAC_CORPORATE_USER_ID) {
  const id = String(valorConfigurado ?? "").trim();
  return { corporativa: id !== "", valida: id === "" || UUID.test(id), id };
}

export function autorDigiSac(identidade, autorLegado) {
  if (!identidade.valida) {
    throw Object.assign(new Error("Identidade corporativa da Central de Atendimento inválida."), { status: 503 });
  }
  return identidade.corporativa ? identidade.id : autorLegado;
}

export function assinarMensagemDigiSac(texto, usuario, identidade, habilitada = process.env.DIGISAC_PORTAL_SIGNATURE === "true") {
  const mensagem = texto.trim();
  if (!habilitada || !identidade.corporativa) return mensagem;

  const nome = String(usuario?.nome ?? "").trim().split(/\s+/, 1)[0];
  if (!nome) return mensagem;
  const assinatura = "*" + nome.replace(/\*/g, "") + ":*";
  return mensagem ? assinatura + "\n" + mensagem : assinatura;
}

export function classificarChamadoCorporativo(chamado, atribuicao, usuarioId) {
  const criadoEm = Date.parse(chamado.createdAt || chamado.startedAt);
  const atribuidoEm = new Date(atribuicao?.atualizado_em ?? NaN).getTime();
  // O MySQL registra a atribuição com precisão de segundos.
  const atribuicaoAtual = atribuicao?.usuario_id &&
    Number.isFinite(criadoEm) && atribuidoEm >= Math.floor(criadoEm / 1000) * 1000;
  if (!atribuicaoAtual) {
    const responsavelDigiSac = chamado.userId || chamado.assignedUserId || chamado.attendantId ||
      chamado.operatorId || chamado.agentId || chamado.responsibleId || chamado.assignedToId ||
      chamado.user?.id || chamado.assignedUser?.id || chamado.currentTicketTransfer?.userId;
    return responsavelDigiSac ? "atribuido" : "fila";
  }
  return String(atribuicao.usuario_id) === String(usuarioId) ? "meus" : "atribuido";
}
