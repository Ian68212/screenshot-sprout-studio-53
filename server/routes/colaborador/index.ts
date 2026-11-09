
import { fromNodeHandler } from "nitro/h3";
import portalApp from "../../../portal/src/server.js";

export default fromNodeHandler(portalApp);
