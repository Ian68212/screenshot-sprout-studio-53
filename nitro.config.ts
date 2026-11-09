import { defineConfig } from "nitro";

export default defineConfig({
  // Hostinger executa o servidor Node.js persistente.
  preset: "node_server",
  serverDir: "./server",

  // O Portal do Colaborador é um handler Node/Express, não um handler H3.
  // Registrar explicitamente como format "node" preserva req/res originais
  // e evita respostas 200 vazias na conversão entre H3 e Express.
  routes: {
    "/colaborador": {
      handler: "./portal/src/server.js",
      format: "node",
    },
    "/colaborador/**": {
      handler: "./portal/src/server.js",
      format: "node",
    },
  },
});
