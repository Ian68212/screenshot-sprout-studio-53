import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
const root=path.resolve("public/homologacao");
const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
const js=fs.readFileSync(path.join(root,"homologacao.js"),"utf8");
const css=fs.readFileSync(path.join(root,"homologacao.css"),"utf8");
test("A página de homologação usa seus próprios arquivos de estilo e script",()=>{
 assert.match(html,/href="\.\/homologacao\.css"/);
 assert.match(html,/src="\.\/homologacao\.js"/);
 assert.ok(css.includes(".features") && css.includes(".side"));
});
test("Homologação só utiliza GET para consultar APIs",()=>{
 assert.match(js,/method:"GET"/);
 assert.doesNotMatch(js,/method:\s*["'](?:POST|PUT|PATCH|DELETE)["']/i);
 assert.doesNotMatch(js,/\b(?:fetch|read)\(["']\/colaborador\/api\/admin/);
});
test("Dados reais são carregados com sessão e não embutidos na página",()=>{
 assert.match(js,/credentials:"same-origin"/);
 assert.match(js,/read\("eu"\)/);
 assert.match(js,/read\("ferramentas"\)/);
 assert.doesNotMatch(html,/teste@rodrinoxpro\.com\.br/);
});
test("A interface mantém os acessos administrativos de acordo com o perfil",()=>{
 assert.match(html,/id="adminLink"/);
 assert.match(html,/id="siteLink"/);
 assert.match(js,/me\.perfil/);
});
test("Homologação tem navegação e adaptação a celular",()=>{
 for(const tab of ["documentos","comunicados","treinamentos","ferramentas","aplicativos"])assert.ok(html.includes('data-tab="'+tab+'"'));
 assert.match(css,/@media\(max-width:780px\)/);
});
test("Menu do colaborador inclui os cinco setores na ordem aprovada",()=>{
 const ordem=["documentos","pcp","almoxarifado","qualidade","rh","seguranca","comunicados"];
 const posicoes=ordem.map(tab=>html.indexOf('data-tab="'+tab+'"'));
 assert.ok(posicoes.every(p=>p>=0),"Uma ou mais guias não foram encontradas");
 assert.ok(posicoes.every((p,i)=>i===0||p>posicoes[i-1]),"Ordem das guias diverge da prévia aprovada");
 for(const tab of ["pcp","almoxarifado","qualidade","rh","seguranca"])assert.match(js,new RegExp(tab+':'));
});
test("Identidade do colaborador vem da sessão e não de conteúdo demonstrativo",()=>{
 assert.match(js,/read\("eu"\)/);
 assert.match(js,/firstName/);
 assert.doesNotMatch(html,/Olá,\s*Frank/i);
 assert.doesNotMatch(html,/Olá,\s*Arraian/i);
});
test("Administração permanece em rota separada",()=>{
 assert.match(html,/href="\/colaborador\/admin\.html"/);
 assert.match(html,/href="\/colaborador\/site-admin\.html"/);
 assert.match(js,/siteLink"\)\.hidden=me\.perfil!=="admin"/);
});
