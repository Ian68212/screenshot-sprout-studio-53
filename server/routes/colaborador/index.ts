import { defineEventHandler, sendRedirect } from "nitro/h3";

// Padroniza a URL com barra final para que os arquivos estáticos e a API
// relativos ao Portal do Colaborador sejam resolvidos sob /colaborador/.
export default defineEventHandler((event) => sendRedirect(event, "/colaborador/", 308));
