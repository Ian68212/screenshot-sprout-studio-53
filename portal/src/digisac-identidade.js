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
