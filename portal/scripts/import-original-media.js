import "dotenv/config";
import { randomUUID } from "node:crypto";
import { copyFile, mkdir, readdir, readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { fileTypeFromBuffer } from "file-type";
import { pool, q } from "../src/db.js";

const source = path.resolve(process.env.ORIGINAL_MEDIA_DIR || path.join(process.env.HOME || "", "backup-rodrinox-original"));
const target = path.resolve(process.env.SITE_UPLOAD_DIR || "");
if (!process.env.SITE_UPLOAD_DIR) {
  throw new Error("Defina SITE_UPLOAD_DIR com o caminho permanente da biblioteca antes de importar.");
}
const extensions = new Map([["image/jpeg","jpg"],["image/png","png"],["image/webp","webp"]]);
let imported = 0, skipped = 0;
try {
  await mkdir(target, { recursive: true, mode: 0o700 });
  const files = (await readdir(source)).filter(name => /\.(jpe?g|png|webp)$/i.test(name)).sort();
  for (const original of files) {
    const existing = await q("SELECT id FROM site_midias WHERE nome_original=? LIMIT 1", [original]);
    if (existing.length) {
      console.log("Já cadastrada, ignorada: " + original);
      skipped++;
      continue;
    }
    const buffer = await readFile(path.join(source, original));
    const detected = await fileTypeFromBuffer(buffer);
    if (!detected || !extensions.has(detected.mime) || extensions.get(detected.mime) !== path.extname(original).slice(1).toLowerCase().replace("jpeg","jpg")) {
      console.log("Formato inválido, ignorado: " + original);
      skipped++;
      continue;
    }
    const filename = randomUUID() + "." + extensions.get(detected.mime);
    const destination = path.join(target, filename);
    await copyFile(path.join(source, original), destination);
    try {
      await q("INSERT INTO site_midias (caminho,nome_original,mime,tamanho,descricao,criado_por) VALUES (?,?,?,?,?,NULL)",
        [filename, original, detected.mime, buffer.length, "Importada do site institucional original"]);
      console.log("Importada: " + original);
      imported++;
    } catch (error) {
      await unlink(destination).catch(() => {});
      throw error;
    }
  }
  console.log(`Concluído. Importadas: ${imported}; ignoradas: ${skipped}.`);
} finally {
  await pool.end();
}
