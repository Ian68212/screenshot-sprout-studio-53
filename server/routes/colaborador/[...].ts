import { fromNodeHandler } from "nitro/h3";
import portalApp from "../../../portal/src/server.js";

// Nitro encaminha /colaborador/** para esta rota. Normalize o caminho
// para que o Express receba /, /portal.css e /api/... em vez do prefixo.
// A checagem também funciona caso o Nitro já tenha removido o prefixo.
function portalHandler(req: any, res: any) {
  const prefix = "/colaborador";
  const currentUrl = req.url || "/";
  const queryIndex = currentUrl.indexOf("?");
  const pathname = queryIndex < 0 ? currentUrl : currentUrl.slice(0, queryIndex);
  const query = queryIndex < 0 ? "" : currentUrl.slice(queryIndex);

  if (pathname === prefix || pathname.startsWith(prefix + "/")) {
    req.url = (pathname.slice(prefix.length) || "/") + query;
  }

  return portalApp(req, res);
}

export default fromNodeHandler(portalHandler);
