-- Gerenciador de conteúdo do site institucional (somente ambiente de testes).
-- Execute separadamente, após backup. Não modifica as tabelas existentes.
CREATE TABLE IF NOT EXISTS site_conteudos (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 chave VARCHAR(160) NOT NULL UNIQUE,
 titulo VARCHAR(255) NOT NULL DEFAULT '',
 corpo TEXT NULL,
 status ENUM('rascunho','publicado') NOT NULL DEFAULT 'rascunho',
 atualizado_por INT NULL,
 atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 FOREIGN KEY (atualizado_por) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS site_midias (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 caminho VARCHAR(500) NOT NULL,
 nome_original VARCHAR(255) NOT NULL,
 mime VARCHAR(100) NOT NULL,
 tamanho BIGINT UNSIGNED NOT NULL,
 descricao VARCHAR(255) DEFAULT '',
 criado_por INT NULL,
 criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (criado_por) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS site_itens (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 tipo ENUM('banner','servico','projeto','galeria') NOT NULL,
 slug VARCHAR(160) NOT NULL,
 titulo VARCHAR(255) NOT NULL,
 resumo TEXT NULL,
 descricao MEDIUMTEXT NULL,
 imagem_id BIGINT UNSIGNED NULL,
 ordem INT NOT NULL DEFAULT 0,
 status ENUM('rascunho','publicado') NOT NULL DEFAULT 'rascunho',
 atualizado_por INT NULL,
 criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 UNIQUE KEY uq_tipo_slug (tipo,slug),
 INDEX idx_publico (tipo,status,ordem),
 FOREIGN KEY (imagem_id) REFERENCES site_midias(id) ON DELETE SET NULL,
 FOREIGN KEY (atualizado_por) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- Candidaturas da página pública Trabalhe Conosco.
CREATE TABLE IF NOT EXISTS candidaturas (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 nome VARCHAR(160) NOT NULL,
 email VARCHAR(190) NOT NULL,
 telefone VARCHAR(40) NOT NULL,
 area VARCHAR(120) NOT NULL,
 mensagem TEXT NULL,
 arquivo_nome VARCHAR(255) NOT NULL,
 arquivo_caminho VARCHAR(80) NOT NULL,
 arquivo_mime VARCHAR(100) NOT NULL DEFAULT 'application/pdf',
 arquivo_tamanho INT UNSIGNED NOT NULL,
 status ENUM('recebido','em_analise','aprovado','reprovado') NOT NULL DEFAULT 'recebido',
 criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 INDEX idx_candidaturas_status_data (status,criado_em)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
