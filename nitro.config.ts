import { defineConfig } from "nitro";

export default defineConfig({
  // Hostinger executa aplicações Node.js persistentes. O preset padrão do
  // projeto Lovable era Cloudflare (fetch handler), que não abre uma porta
  // HTTP e causava o erro "App did not call listen() within 3 seconds".
  preset: "node_server",
  serverDir: "./server",
});
