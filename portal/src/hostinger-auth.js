import { ImapFlow } from "imapflow";

const HOST = process.env.EMAIL_IMAP_HOST || "imap.hostinger.com";
const PORT = Number(process.env.EMAIL_IMAP_PORT || 993);
const TIMEOUT = Number(process.env.EMAIL_AUTH_TIMEOUT_MS || 12000);

export class EmailAuthUnavailableError extends Error {
  constructor() {
    super("Não foi possível validar o e-mail agora.");
    this.name = "EmailAuthUnavailableError";
  }
}

function isCredentialError(error) {
  const text = [
    error?.code,
    error?.responseText,
    error?.message,
    error?.response,
  ].filter(Boolean).join(" ").toLowerCase();
  return /authenticationfailed|invalid credentials|authentication failed|login failed|auth failed|invalid password|user disabled/.test(text);
}

/**
 * Confere a senha diretamente no IMAP da Hostinger.
 * A senha é usada somente nesta conexão e nunca é persistida nem registrada.
 */
export async function validarSenhaHostinger(email, senha) {
  const client = new ImapFlow({
    host: HOST,
    port: PORT,
    secure: true,
    auth: { user: email, pass: senha },
    logger: false,
    socketTimeout: TIMEOUT,
    greetingTimeout: TIMEOUT,
    connectionTimeout: TIMEOUT,
  });

  let conectado = false;
  try {
    await client.connect();
    conectado = true;
    return true;
  } catch (error) {
    if (isCredentialError(error)) return false;
    console.error("Falha de comunicação com o serviço IMAP da Hostinger:", error?.code || error?.name || "erro de conexão");
    throw new EmailAuthUnavailableError();
  } finally {
    if (conectado) {
      try { await client.logout(); } catch { client.close(); }
    } else {
      try { client.close(); } catch {}
    }
  }
}
