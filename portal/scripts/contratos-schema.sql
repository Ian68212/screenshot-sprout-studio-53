CREATE TABLE IF NOT EXISTS contratos_categorias (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 nome VARCHAR(150) NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS contratos (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 categoria_id BIGINT UNSIGNED NOT NULL,
 titulo VARCHAR(200) NOT NULL,
 numero VARCHAR(80),
 contraparte VARCHAR(200),
 documento VARCHAR(30),
 colaborador_id BIGINT,
 objeto TEXT,
 valor DECIMAL(15,2),
 inicio DATE,
 vencimento DATE,
 autor_id BIGINT NOT NULL,
 criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 arquivado_em DATETIME,
 FOREIGN KEY (categoria_id) REFERENCES contratos_categorias(id)
);
CREATE TABLE IF NOT EXISTS contratos_versoes (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 contrato_id BIGINT UNSIGNED NOT NULL,
 versao INT UNSIGNED NOT NULL,
 arquivo_nome VARCHAR(255) NOT NULL,
 drive_id VARCHAR(255) NOT NULL,
 sha256 CHAR(64) NOT NULL,
 motivo TEXT,
 autor_id BIGINT NOT NULL,
 criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY (contrato_id,versao),
 FOREIGN KEY (contrato_id) REFERENCES contratos(id)
);
CREATE TABLE IF NOT EXISTS contratos_modelos (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 titulo VARCHAR(200) NOT NULL,
 corpo MEDIUMTEXT NOT NULL,
 autor_id BIGINT NOT NULL,
 criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS contratos_permissoes (
 usuario_id BIGINT NOT NULL PRIMARY KEY,
 visualizar BOOLEAN NOT NULL DEFAULT FALSE,
 editar BOOLEAN NOT NULL DEFAULT FALSE
);
INSERT IGNORE INTO contratos_categorias(nome) VALUES ('Contratos Empresariais'),('Segurança do Trabalho'),('Colaboradores'),('Fornecedores'),('Clientes'),('Prestadores de Serviços'),('Locações');
