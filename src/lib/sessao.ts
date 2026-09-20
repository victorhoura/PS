/**
 * Porta de entrada do app: uma senha só, igual ao PASSWORD do PS.py — mas
 * a senha mora numa variável de ambiente da Vercel, não no código, e o que
 * vai para o navegador é um cookie assinado, não a senha.
 *
 * Não é autenticação de usuário: é uma tranca. Autenticação de verdade
 * (uma conta sua, sessão revogável) entra junto com o Supabase na v2.
 */

const COOKIE = "ps_sessao";

/**
 * Duração da sessão.
 *
 * Eram 180 dias, pensando no plantão em que você não quer digitar senha toda
 * hora. Passou para 12 horas porque o app também roda em computador de uso
 * compartilhado: ali uma sessão de meio ano é uma porta aberta para quem
 * sentar depois. 12h cobre um plantão inteiro e morre antes do próximo.
 */
const HORAS = 12;

function bytes(s: string): Uint8Array<ArrayBuffer> {
  // encode() devolve Uint8Array<ArrayBufferLike>; o Web Crypto exige o
  // ArrayBuffer concreto, então o buffer é criado explicitamente.
  const texto = new TextEncoder().encode(s);
  const buf = new Uint8Array(new ArrayBuffer(texto.byteLength));
  buf.set(texto);
  return buf;
}

function paraBase64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Chave de assinatura derivada da senha: trocar a senha invalida as sessões. */
async function chave(senha: string): Promise<CryptoKey> {
  const material = await crypto.subtle.digest("SHA-256", bytes(`ps-japa:v1:${senha}`));
  return crypto.subtle.importKey("raw", material, { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
}

async function assinar(payload: string, senha: string): Promise<string> {
  const mac = await crypto.subtle.sign("HMAC", await chave(senha), bytes(payload));
  return paraBase64url(mac);
}

/** Comparação em tempo constante — não vaza o tamanho do prefixo correto. */
export function iguais(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let dif = 0;
  for (let i = 0; i < a.length; i++) dif |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return dif === 0;
}

export async function criarCookie(senha: string): Promise<{ nome: string; valor: string; maxAge: number }> {
  const segundos = HORAS * 60 * 60;
  const expira = Date.now() + segundos * 1000;
  const payload = String(expira);
  return {
    nome: COOKIE,
    valor: `${payload}.${await assinar(payload, senha)}`,
    maxAge: segundos,
  };
}

export async function cookieValido(valor: string | undefined, senha: string): Promise<boolean> {
  if (!valor) return false;
  const corte = valor.lastIndexOf(".");
  if (corte < 1) return false;

  const payload = valor.slice(0, corte);
  const mac = valor.slice(corte + 1);

  if (!iguais(mac, await assinar(payload, senha))) return false;

  const expira = Number(payload);
  return Number.isFinite(expira) && expira > Date.now();
}

export const NOME_COOKIE = COOKIE;
