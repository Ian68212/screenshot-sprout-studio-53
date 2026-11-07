// Regras de permissão puras (testáveis sem banco).
export const PERFIS = ["admin", "gestor", "colaborador"];

const PERMISSOES = {
  admin: ["painel", "admin.usuarios", "admin.estrutura", "admin.ferramentas", "admin.auditoria"],
  gestor: ["painel", "admin.auditoria"],
  colaborador: ["painel"],
};

export function pode(usuario, permissao) {
  if (!usuario || !usuario.ativo) return false;
  return (PERMISSOES[usuario.perfil] || []).includes(permissao);
}

/** Uma ferramenta é visível se o usuário é admin ou se alguma regra combina com ele. */
export function podeVerFerramenta(usuario, regras) {
  if (!usuario || !usuario.ativo) return false;
  if (usuario.perfil === "admin") return true;
  return regras.some(
    (r) =>
      (r.setor_id == null || r.setor_id === usuario.setor_id) &&
      (r.cargo_id == null || r.cargo_id === usuario.cargo_id) &&
      (r.perfil == null || r.perfil === usuario.perfil),
  );
}

/** Senha: mínimo 10 caracteres, com letra e número. */
export function senhaValida(s) {
  return typeof s === "string" && s.length >= 10 && /[A-Za-z]/.test(s) && /\d/.test(s);
}

export const MAX_TENTATIVAS = 5;
export const BLOQUEIO_MINUTOS = 15;
