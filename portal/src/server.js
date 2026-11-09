
import "dotenv/config";
import path from "node:path";
import crypto, { randomUUID } from "node:crypto";
import { mkdir, writeFile, readFile, unlink } from "node:fs/promises";
import multer from "multer";
import { fileTypeFromBuffer } from "file-type";
import { fileURLToPath } from "node:url";
import express from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";

import { q, auditar } from "./db.js";
import {
  COOKIE,
  login,
  logout,
  carregarUsuario,
  exigir,
  gerarHash
} from "./auth.js";

import { PERFIS, podeVerFerramenta } from "./permissions.js";
import { siteRouter } from "./site-cms.js";
import { mediaRouter } from "./site-media.js";
import { publicSiteRouter } from "./public-site.js";

// =====================================================
// CONFIGURAÇÕES
// =====================================================

const BASE = process.env.BASE_PATH || "/colaborador";
const dir = path.dirname(fileURLToPath(import.meta.url));

const app = express();

app.set("trust proxy", 1);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        "script-src": ["'self'"]
      }
    }
  })
);

app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

const r = express.Router();

const wrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

r.use(wrap(carregarUsuario));

// =====================================================
// PROTEÇÃO CSRF
// =====================================================

r.use((req, res, next) => {
  // O formulário público de candidaturas não exige sessão.
  // As demais operações de escrita exigem o cabeçalho próprio.

  if (
    req.method !== "GET" &&
    req.method !== "OPTIONS" &&
    req.path !== "/api/candidaturas" &&
    req.get("X-Portal") !== "1"
  ) {
    return res.status(403).json({
      erro: "Requisição inválida"
    });
  }

  next();
});

// =====================================================
// LIMITES E ARQUIVOS
// =====================================================

const limiteCandidatura = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false
});

const limiteLogin = rateLimit({
  windowMs: 15 * 60000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false
});

const uploadCurriculo = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1
  }
});

const DIR_CANDIDATURAS = path.resolve(
  process.env.CANDIDATE_UPLOAD_DIR ||
  path.join(process.env.HOME || "/tmp", "rodrinox-candidaturas")
);

// =====================================================
// LOGIN E SESSÕES
// =====================================================

r.post("/api/login", limiteLogin, wrap(async (req, res) => {
  const { email, senha } = req.body || {};

  if (!email || !senha) {
    return res.status(400).json({
      erro: "Informe e-mail e senha"
    });
  }

  const s = await login(email, senha, req.ip);

  if (s?.bloqueado) {
    return res.status(423).json({
      erro: "Acesso bloqueado temporariamente. Tente mais tarde."
    });
  }

  if (s?.indisponivel) {
    return res.status(503).json({
      erro: "Não foi possível validar o e-mail agora. Tente novamente em alguns minutos."
    });
  }

  if (!s) {
    return res.status(401).json({
      erro: "E-mail ou senha incorretos"
    });
  }

  res.cookie(COOKIE, s.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: BASE,
    maxAge: s.maxAge
  });

  res.json({ ok: true });
}));

r.post("/api/logout", wrap(async (req, res) => {
  await logout(req.cookies?.[COOKIE]);

  res.clearCookie(COOKIE, {
    path: BASE
  });

  res.json({ ok: true });
}));

r.get("/api/eu", exigir("painel"), (req, res) => {
  res.json(req.usuario);
});

// =====================================================
// TRABALHE CONOSCO - RECEBIMENTO DE CANDIDATURAS
// =====================================================

r.post(
  "/api/candidaturas",
  limiteCandidatura,
  uploadCurriculo.single("curriculo"),
  wrap(async (req, res) => {

    const nome = String(req.body?.nome || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const telefone = String(req.body?.telefone || "").trim();
    const area = String(req.body?.area || "").trim();

    const mensagem = String(
      req.body?.mensagem || ""
    ).trim().slice(0, 3000);

    const cargo = String(
      req.body?.cargo_pretendido || ""
    ).trim().slice(0, 120);

    // Validação dos campos conforme o banco MySQL.

    if (
      !nome ||
      nome.length > 150 ||
      !/^\S+@\S+\.\S+$/.test(email) ||
      email.length > 180 ||
      !telefone ||
      telefone.length > 30 ||
      !area ||
      area.length > 100
    ) {
      return res.status(400).json({
        erro: "Confira nome, e-mail, telefone e área pretendida."
      });
    }

    // Currículo obrigatório.

    if (!req.file) {
      return res.status(400).json({
        erro: "Anexe seu currículo em PDF."
      });
    }

    // Validação real do arquivo.

    const tipo = await fileTypeFromBuffer(req.file.buffer);

    if (!tipo || tipo.mime !== "application/pdf") {
      return res.status(415).json({
        erro: "O currículo precisa ser um arquivo PDF válido."
      });
    }

    // Nome interno seguro.

    const arquivo = randomUUID() + ".pdf";

    await mkdir(DIR_CANDIDATURAS, {
      recursive: true,
      mode: 0o700
    });

    const caminho = path.join(DIR_CANDIDATURAS, arquivo);

    await writeFile(caminho, req.file.buffer, {
      flag: "wx",
      mode: 0o600
    });

    try {

      // Estrutura compatível com a tabela candidaturas
      // existente no banco portal_teste.

      await q(
        `INSERT INTO candidaturas
        (
          nome,
          email,
          telefone,
          area,
          mensagem,
          cargo_pretendido,
          arquivo_nome,
          arquivo_path,
          consent_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          nome,
          email,
          telefone,
          area,
          mensagem,
          cargo || null,
          String(req.file.originalname || "curriculo.pdf").slice(0, 255),
          arquivo
        ]
      );

    } catch (error) {

      await unlink(caminho).catch(() => {});

      throw error;
    }

    res.status(201).json({
      ok: true,
      mensagem: "Candidatura recebida com sucesso. Obrigado pelo interesse na Rodrinox Pro!"
    });

  })
);

// =====================================================
// ADMINISTRAÇÃO DE CANDIDATURAS
// =====================================================

// Listar candidatos.

r.get(
  "/api/admin/candidaturas",
  exigir("admin.usuarios"),
  wrap(async (_req, res) => {

    const candidatos = await q(
      `SELECT
        id,
        nome,
        email,
        telefone,
        area,
        mensagem,
        cargo_pretendido,
        arquivo_nome,
        status,
        criado_em,
        atualizado_em
      FROM candidaturas
      ORDER BY criado_em DESC
      LIMIT 500`
    );

    res.json(candidatos);
  })
);

// Atualizar status do candidato.

r.patch(
  "/api/admin/candidaturas/:id",
  exigir("admin.usuarios"),
  wrap(async (req, res) => {

    const id = Number(req.params.id);
    const status = String(req.body?.status || "");

    const statusPermitidos = [
      "recebido",
      "em_analise",
      "entrevista",
      "aprovado",
      "reprovado"
    ];

    if (
      !Number.isSafeInteger(id) ||
      id < 1 ||
      !statusPermitidos.includes(status)
    ) {
      return res.status(400).json({
        erro: "Dados inválidos."
      });
    }

    const result = await q(
      "UPDATE candidaturas SET status=? WHERE id=?",
      [status, id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        erro: "Candidatura não encontrada."
      });
    }

    await auditar(
      req.usuario.id,
      "atualizou_candidatura",
      String(id) + ":" + status,
      req.ip
    );

    res.json({ ok: true });
  })
);

// Download protegido do currículo.

r.get(
  "/api/admin/candidaturas/:id/curriculo",
  exigir("admin.usuarios"),
  wrap(async (req, res) => {

    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id < 1) {
      return res.status(400).json({
        erro: "Identificador inválido."
      });
    }

    const [item] = await q(
      "SELECT arquivo_nome, arquivo_path FROM candidaturas WHERE id=?",
      [id]
    );

    if (
      !item ||
      !/^[a-f0-9-]{36}\.pdf$/.test(item.arquivo_path)
    ) {
      return res.status(404).json({
        erro: "Currículo não encontrado."
      });
    }

    let buffer;

    try {
      buffer = await readFile(
        path.join(DIR_CANDIDATURAS, item.arquivo_path)
      );
    } catch (error) {
      if (error.code === "ENOENT") {
        return res.status(404).json({
          erro: "Arquivo do currículo não encontrado."
        });
      }

      throw error;
    }

    res.set("Content-Type", "application/pdf");
    res.set(
      "Content-Disposition",
      'attachment; filename="curriculo.pdf"'
    );
    res.set("Cache-Control", "private, no-store");
    res.set("X-Content-Type-Options", "nosniff");

    res.send(buffer);
  })
);

// =====================================================
// FERRAMENTAS DOS COLABORADORES
// =====================================================

r.get(
  "/api/ferramentas",
  exigir("painel"),
  wrap(async (req, res) => {

    const ferramentas = await q(
      "SELECT id, nome, descricao, url, categoria FROM ferramentas WHERE ativo = 1 ORDER BY nome"
    );

    const regras = await q(
      "SELECT * FROM ferramenta_acessos"
    );

    res.json(
      ferramentas.filter((f) =>
        podeVerFerramenta(
          req.usuario,
          regras.filter((x) => x.ferramenta_id === f.id)
        )
      )
    );
  })
);

// =====================================================
// ADMINISTRAÇÃO - ESTRUTURA
// =====================================================

r.get(
  "/api/admin/estrutura",
  exigir("admin.estrutura"),
  wrap(async (_req, res) => {

    res.json({
      setores: await q("SELECT * FROM setores ORDER BY nome"),
      cargos: await q("SELECT * FROM cargos ORDER BY nome"),
      perfis: PERFIS
    });
  })
);

for (const tabela of ["setores", "cargos"]) {

  r.post(
    `/api/admin/${tabela}`,
    exigir("admin.estrutura"),
    wrap(async (req, res) => {

      const nome = String(req.body?.nome || "").trim();

      if (!nome) {
        return res.status(400).json({
          erro: "Informe o nome"
        });
      }

      await q(
        `INSERT INTO ${tabela} (nome) VALUES (?)`,
        [nome]
      );

      await auditar(
        req.usuario.id,
        `criou_${tabela}`,
        nome,
        req.ip
      );

      res.json({ ok: true });
    })
  );
}

// =====================================================
// ADMINISTRAÇÃO - USUÁRIOS
// =====================================================

r.get(
  "/api/admin/usuarios",
  exigir("admin.usuarios"),
  wrap(async (_req, res) => {

    res.json(
      await q(
        `SELECT
          u.id,
          u.nome,
          u.email,
          u.perfil,
          u.ativo,
          u.setor_id,
          u.cargo_id,
          s.nome setor,
          c.nome cargo
        FROM usuarios u
        LEFT JOIN setores s ON s.id=u.setor_id
        LEFT JOIN cargos c ON c.id=u.cargo_id
        ORDER BY u.nome`
      )
    );
  })
);

r.post(
  "/api/admin/usuarios",
  exigir("admin.usuarios"),
  wrap(async (req, res) => {

    const {
      nome,
      email,
      perfil = "colaborador",
      setor_id = null,
      cargo_id = null
    } = req.body || {};

    if (
      !nome ||
      !email ||
      !PERFIS.includes(perfil)
    ) {
      return res.status(400).json({
        erro: "Dados inválidos"
      });
    }

    const senhaLegadaInutilizada = crypto
      .randomBytes(32)
      .toString("hex");

    await q(
      `INSERT INTO usuarios
      (nome, email, senha_hash, perfil, setor_id, cargo_id)
      VALUES (?, ?, ?, ?, ?, ?)`,
      [
        nome.trim(),
        email.trim().toLowerCase(),
        await gerarHash(senhaLegadaInutilizada),
        perfil,
        setor_id || null,
        cargo_id || null
      ]
    );

    await auditar(
      req.usuario.id,
      "criou_usuario",
      email,
      req.ip
    );

    res.json({ ok: true });
  })
);

r.patch(
  "/api/admin/usuarios/:id",
  exigir("admin.usuarios"),
  wrap(async (req, res) => {

    const id = Number(req.params.id);

    const {
      perfil,
      setor_id,
      cargo_id,
      ativo
    } = req.body || {};

    if (
      id === req.usuario.id &&
      (ativo === false || (perfil && perfil !== "admin"))
    ) {
      return res.status(400).json({
        erro: "Você não pode remover seu próprio acesso de administrador"
      });
    }

    if (perfil && !PERFIS.includes(perfil)) {
      return res.status(400).json({
        erro: "Perfil inválido"
      });
    }

    if (perfil) {
      await q(
        "UPDATE usuarios SET perfil=? WHERE id=?",
        [perfil, id]
      );
    }

    if (setor_id !== undefined) {
      await q(
        "UPDATE usuarios SET setor_id=? WHERE id=?",
        [setor_id || null, id]
      );
    }

    if (cargo_id !== undefined) {
      await q(
        "UPDATE usuarios SET cargo_id=? WHERE id=?",
        [cargo_id || null, id]
      );
    }

    if (ativo !== undefined) {

      await q(
        "UPDATE usuarios SET ativo=? WHERE id=?",
        [ativo ? 1 : 0, id]
      );

      if (!ativo) {
        await q(
          "DELETE FROM sessoes WHERE usuario_id=?",
          [id]
        );
      }
    }

    await auditar(
      req.usuario.id,
      "alterou_usuario",
      String(id),
      req.ip
    );

    res.json({ ok: true });
  })
);

// =====================================================
// ADMINISTRAÇÃO - FERRAMENTAS
// =====================================================

r.get(
  "/api/admin/ferramentas",
  exigir("admin.ferramentas"),
  wrap(async (_req, res) => {

    res.json({
      ferramentas: await q(
        "SELECT * FROM ferramentas ORDER BY nome"
      ),
      regras: await q(
        "SELECT * FROM ferramenta_acessos"
      )
    });
  })
);

r.post(
  "/api/admin/ferramentas",
  exigir("admin.ferramentas"),
  wrap(async (req, res) => {

    const {
      nome,
      descricao = null,
      url,
      categoria = "ferramentas",
      regras = []
    } = req.body || {};

    if (
      !nome ||
      !url ||
      !/^(https:\/\/|\/)/.test(url)
    ) {
      return res.status(400).json({
        erro: "Informe nome e um link https:// ou /"
      });
    }

    const out = await q(
      `INSERT INTO ferramentas
      (nome, descricao, url, categoria)
      VALUES (?, ?, ?, ?)`,
      [nome, descricao, url, categoria]
    );

    for (const g of regras) {

      await q(
        `INSERT INTO ferramenta_acessos
        (ferramenta_id, setor_id, cargo_id, perfil)
        VALUES (?, ?, ?, ?)`,
        [
          out.insertId,
          g.setor_id || null,
          g.cargo_id || null,
          PERFIS.includes(g.perfil) ? g.perfil : null
        ]
      );
    }

    await auditar(
      req.usuario.id,
      "criou_ferramenta",
      nome,
      req.ip
    );

    res.json({ ok: true });
  })
);

// =====================================================
// AUDITORIA
// =====================================================

r.get(
  "/api/admin/auditoria",
  exigir("admin.auditoria"),
  wrap(async (_req, res) => {

    res.json(
      await q(
        `SELECT
          a.acao,
          a.detalhe,
          a.ip,
          a.criado_em,
          u.email
        FROM auditoria a
        LEFT JOIN usuarios u ON u.id=a.usuario_id
        ORDER BY a.id DESC
        LIMIT 200`
      )
    );
  })
);

// =====================================================
// CMS - SITE INSTITUCIONAL
// =====================================================

r.use("/api/public/site", publicSiteRouter);
r.use("/api/site", siteRouter);
r.use("/api/site/midias", mediaRouter);

// =====================================================
// ARQUIVOS PÚBLICOS DO PORTAL
// =====================================================

r.use(
  express.static(
    path.join(dir, "..", "public"),
    { index: "index.html" }
  )
);

// =====================================================
// TRATAMENTO DE ERROS
// =====================================================

r.use((err, _req, res, _next) => {

  if (err?.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({
      erro: "Currículo excede o limite de 5 MB."
    });
  }

  if (err?.code === "LIMIT_UNEXPECTED_FILE") {
    return res.status(400).json({
      erro: "Envie apenas um currículo."
    });
  }

  if (err?.code === "ER_DUP_ENTRY") {
    return res.status(409).json({
      erro: "Registro já existe."
    });
  }

  console.error(err);

  res.status(500).json({
    erro: "Erro interno. Tente novamente mais tarde."
  });
});

// =====================================================
// INICIALIZAÇÃO DO SERVIDOR
// =====================================================

// A raiz do subdomínio deve abrir o login do portal, não responder "Cannot GET /".
app.get("/", (_req, res) => {
  res.redirect(302, `${BASE}/`);
});

app.use(BASE, r);

const port = Number(process.env.PORT || 3000);

app.listen(port, () => {
  console.log(
    `Portal em http://localhost:${port}${BASE}`
  );
});
