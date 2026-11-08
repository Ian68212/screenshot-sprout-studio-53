-- Portal do Colaborador Rodrinox Pro — MySQL 8 / MariaDB 10.6+
CREATE TABLE IF NOT EXISTS setores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(120) NOT NULL UNIQUE,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS cargos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(120) NOT NULL UNIQUE,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Perfis: admin, gestor, colaborador (definidos no código em src/permissions.js)
CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(160) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  senha_hash VARCHAR(100) NOT NULL,
  perfil ENUM('admin','gestor','colaborador') NOT NULL DEFAULT 'colaborador',
  setor_id INT NULL,
  cargo_id INT NULL,
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  tentativas_falhas INT NOT NULL DEFAULT 0,
  bloqueado_ate DATETIME NULL,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (setor_id) REFERENCES setores(id) ON DELETE SET NULL,
  FOREIGN KEY (cargo_id) REFERENCES cargos(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sessoes (
  token_hash CHAR(64) PRIMARY KEY,
  usuario_id INT NOT NULL,
  expira_em DATETIME NOT NULL,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ferramentas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(160) NOT NULL,
  descricao VARCHAR(255) NULL,
  url VARCHAR(500) NOT NULL,
  categoria ENUM('documentos','comunicados','treinamentos','ferramentas') NOT NULL DEFAULT 'ferramentas',
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Liberação de acesso: se uma ferramenta não tiver nenhuma regra, só administradores veem.
-- Cada regra pode restringir por setor, cargo e/ou perfil (NULL = qualquer).
CREATE TABLE IF NOT EXISTS ferramenta_acessos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ferramenta_id INT NOT NULL,
  setor_id INT NULL,
  cargo_id INT NULL,
  perfil ENUM('admin','gestor','colaborador') NULL,
  FOREIGN KEY (ferramenta_id) REFERENCES ferramentas(id) ON DELETE CASCADE,
  FOREIGN KEY (setor_id) REFERENCES setores(id) ON DELETE CASCADE,
  FOREIGN KEY (cargo_id) REFERENCES cargos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS auditoria (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NULL,
  acao VARCHAR(80) NOT NULL,
  detalhe VARCHAR(500) NULL,
  ip VARCHAR(64) NULL,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- Candidaturas recebidas pelo formulário público Trabalhe Conosco.
CREATE TABLE IF NOT EXISTS candidaturas (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(150) NOT NULL,
  email VARCHAR(180) NOT NULL,
  telefone VARCHAR(30) NOT NULL,
  area VARCHAR(100) NOT NULL,
  cargo_pretendido VARCHAR(120) NULL,
  arquivo_nome VARCHAR(255) NOT NULL,
  arquivo_path VARCHAR(500) NOT NULL,
  consent_at DATETIME NOT NULL,
  status ENUM('recebido','em_analise','entrevista','aprovado','reprovado') NOT NULL DEFAULT 'recebido',
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_candidaturas_status (status),
  INDEX idx_candidaturas_criado (criado_em)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
