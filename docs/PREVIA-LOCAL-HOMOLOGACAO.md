# Prévia visual local — sem Hostinger e sem banco de produção

A prévia local é um arquivo HTML independente, para abrir diretamente no navegador. Ela contém dados demonstrativos claramente identificados, não autentica colaboradores, não consulta o MySQL e não grava nenhum cadastro. O layout serve para validar visualmente a navegação antes de configurar hospedagem.

**Atenção:** aprovação visual não substitui testes posteriores de autenticação, autorização, proteção de leitura e deploy.

Os arquivos da aplicação real continuam em `portal/public/homologacao/`. Nenhum arquivo foi mesclado na branch `main`.

## Requisitos antes da produção
- Proteger a rota de homologação no servidor e manter dados reais restritos por perfil.
- Testar CSS, JavaScript, imagens, dispositivos móveis, autenticação e permissões.
- Criar procedimento de rollback e obter autorização expressa.
