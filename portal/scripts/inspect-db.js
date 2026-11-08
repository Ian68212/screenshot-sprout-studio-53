import "dotenv/config";
import { pool } from "../src/db.js";

// Diagnóstico somente de leitura: não cria, altera ou apaga tabelas/dados.
const esperadas = {
  setores: ["id", "nome"],
  cargos: ["id", "nome"],
  usuarios: ["id", "nome", "email", "senha_hash", "perfil", "ativo", "setor_id", "cargo_id", "tentativas_falhas", "bloqueado_ate"],
  sessoes: ["token_hash", "usuario_id", "expira_em"],
  ferramentas: ["id", "nome", "descricao", "url", "categoria", "ativo"],
  ferramenta_acessos: ["id", "ferramenta_id", "setor_id", "cargo_id", "perfil"],
  auditoria: ["id", "usuario_id", "acao", "detalhe", "ip", "criado_em"],
  site_conteudos: ["id", "chave", "titulo", "corpo", "status", "atualizado_por", "atualizado_em"],
  site_midias: ["id", "caminho", "nome_original", "mime", "tamanho", "descricao", "criado_por", "criado_em"],
  site_itens: ["id", "tipo", "slug", "titulo", "resumo", "descricao", "imagem_id", "ordem", "status", "atualizado_por"],
  candidaturas: ["id", "nome", "email", "telefone", "area", "mensagem", "arquivo_nome", "status", "criado_em"]
};

try {
  const [dbRows] = await pool.query("SELECT DATABASE() AS banco");
  const banco = dbRows[0]?.banco;
  if (!banco) throw new Error("DB_NAME não selecionado. Confira as variáveis DB_*.");

  const [rows] = await pool.execute(
    `SELECT TABLE_NAME AS tabela, COLUMN_NAME AS coluna, COLUMN_TYPE AS tipo, IS_NULLABLE AS aceita_nulo
       FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ?
      ORDER BY TABLE_NAME, ORDINAL_POSITION`,
    [banco]
  );

  const existentes = new Map();
  for (const row of rows) {
    if (!existentes.has(row.tabela)) existentes.set(row.tabela, []);
    existentes.get(row.tabela).push(row);
  }

  const relatorio = Object.entries(esperadas).map(([tabela, colunas]) => {
    const atuais = existentes.get(tabela) || [];
    const nomes = new Set(atuais.map((c) => c.coluna));
    return {
      tabela,
      existe: atuais.length > 0,
      colunas_faltantes: colunas.filter((c) => !nomes.has(c)),
      colunas_atuais: atuais.map((c) => c.coluna),
      observacao: tabela === "candidaturas"
        ? "Verifique também os nomes alternativos arquivo_path/arquivo_caminho, cargo_pretendido e consent_at."
        : null
    };
  });

  const aliasesCandidaturas = ["arquivo_path", "arquivo_caminho", "cargo_pretendido", "consent_at"];
  const candidaturas = new Set((existentes.get("candidaturas") || []).map((c) => c.coluna));
  const resultado = {
    banco,
    modo: "somente_leitura",
    tabelas_encontradas: [...existentes.keys()],
    diagnostico: relatorio,
    compatibilidade_candidaturas: Object.fromEntries(aliasesCandidaturas.map((c) => [c, candidaturas.has(c)]))
  };

  console.log(JSON.stringify(resultado, null, 2));
  const faltas = relatorio.filter((r) => !r.existe || r.colunas_faltantes.length);
  if (faltas.length) process.exitCode = 2;
} catch (error) {
  console.error("Falha no diagnóstico do banco:", error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
