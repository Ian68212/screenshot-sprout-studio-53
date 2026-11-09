import { fromNodeHandler } from "nitro/h3";
import portalApp from "../../../portal/src/server.js";

// Mount the existing Express portal under the institutional domain.
// Hostinger runs this application on Node.js, which is required by the adapter.
export default fromNodeHandler(portalApp);
