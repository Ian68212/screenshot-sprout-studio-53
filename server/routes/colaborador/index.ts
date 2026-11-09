import { fromNodeHandler } from "nitro/h3";
import portalApp from "../../../portal/src/server.js";

// O Express controla o prefixo /colaborador e serve o HTML, CSS, JS e API.
export default fromNodeHandler(portalApp);
