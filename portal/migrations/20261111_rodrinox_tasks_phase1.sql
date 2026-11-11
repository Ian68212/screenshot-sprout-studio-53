-- Rodrinox Tasks — Fase 1. Executar manualmente em banco de homologação primeiro.
-- Não altera tabelas existentes; usa os IDs atuais de usuarios.
CREATE TABLE IF NOT EXISTS rt_projetos (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 nome VARCHAR(160) NOT NULL,
 descricao TEXT NULL,
 setor_id INT NULL,
 criado_por INT NOT NULL,
 ativo TINYINT(1) NOT NULL DEFAULT 1,
 criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 INDEX idx_rt_projetos_setor (setor_id),
 CONSTRAINT fk_rt_projetos_criador FOREIGN KEY (criado_por) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS rt_projeto_membros (
 projeto_id BIGINT UNSIGNED NOT NULL,
 usuario_id INT NOT NULL,
 papel ENUM('gestor','membro') NOT NULL DEFAULT 'membro',
 PRIMARY KEY (projeto_id,usuario_id),
 FOREIGN KEY (projeto_id) REFERENCES rt_projetos(id) ON DELETE CASCADE,
 FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS rt_tarefas (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 projeto_id BIGINT UNSIGNED NOT NULL,
 titulo VARCHAR(220) NOT NULL,
 descricao TEXT NULL,
 status ENUM('a_fazer','andamento','revisao','concluida') NOT NULL DEFAULT 'a_fazer',
 prioridade ENUM('baixa','normal','alta','urgente') NOT NULL DEFAULT 'normal',
 prazo_em DATETIME NULL,
 criado_por INT NOT NULL,
 atualizado_por INT NULL,
 criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 INDEX idx_rt_tarefas_projeto_status (projeto_id,status),
 FOREIGN KEY (projeto_id) REFERENCES rt_projetos(id) ON DELETE CASCADE,
 FOREIGN KEY (criado_por) REFERENCES usuarios(id),
 FOREIGN KEY (atualizado_por) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS rt_tarefa_responsaveis (
 tarefa_id BIGINT UNSIGNED NOT NULL,
 usuario_id INT NOT NULL,
 PRIMARY KEY(tarefa_id,usuario_id),
 FOREIGN KEY(tarefa_id) REFERENCES rt_tarefas(id) ON DELETE CASCADE,
 FOREIGN KEY(usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS rt_comentarios (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 tarefa_id BIGINT UNSIGNED NOT NULL,
 usuario_id INT NOT NULL,
 texto TEXT NOT NULL,
 criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(tarefa_id) REFERENCES rt_tarefas(id) ON DELETE CASCADE,
 FOREIGN KEY(usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS rt_historico (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 tarefa_id BIGINT UNSIGNED NOT NULL,
 usuario_id INT NOT NULL,
 evento VARCHAR(60) NOT NULL,
 detalhes JSON NULL,
 criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 INDEX idx_rt_historico_tarefa (tarefa_id,criado_em),
 FOREIGN KEY(tarefa_id) REFERENCES rt_tarefas(id) ON DELETE CASCADE,
 FOREIGN KEY(usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
