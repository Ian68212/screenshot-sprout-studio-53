import os from "node:os";
import path from "node:path";

const home = process.env.HOME || os.homedir();
const fallback = path.join(home, "rodrinox-site-media");
const configured = process.env.SITE_UPLOAD_DIR?.trim();
const candidate = configured ? path.resolve(configured) : fallback;
const temporaryBuildPath = /(?:^|[\\/])hbuilds[\\/](?:current|versions)(?:[\\/]|$)/i.test(candidate);

if (configured && temporaryBuildPath) {
  console.warn("[site-media] SITE_UPLOAD_DIR aponta para uma pasta temporária de implantação; usando HOME/rodrinox-site-media.");
}

export const SITE_MEDIA_DIR = temporaryBuildPath ? fallback : candidate;
