import { fromNodeHandler } from "nitro/h3";
import portalApp from "../../../portal/src/server.js";

// Encaminha todos os caminhos internos do portal para o Express.
export default fromNodeHandler(portalApp);
