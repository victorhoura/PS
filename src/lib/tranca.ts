/**
 * A tranca do app vista pelo navegador.
 *
 * Quem decide se há sessão é o servidor: o proxy confere o cookie assinado e
 * manda quem não tem para /entrar. Só que o app tem de abrir com o Wi-Fi do
 * hospital fora, e aí não há servidor para consultar. Sem o que está aqui,
 * duas coisas quebravam:
 *
 *  1. bloquear o app e perder a rede deixaria você preso na tela de senha no
 *     meio do plantão — o /api/entrar não responde sem rede;
 *  2. o service worker guarda as páginas já visitadas, e servi-las sem
 *     consultar ninguém faz o botão BLOQUEAR não bloquear nada: bastava ficar
 *     offline para o app inteiro abrir.
 *
 * A solução é um verificador da senha guardado neste navegador. Guarda-se o
 * PBKDF2 da senha, nunca a senha: serve para conferir o que você digita, não
 * para descobrir o que foi digitado antes.
 *
 * Limite conhecido e aceito: trocar PS_SENHA na Vercel invalida os cookies na
 * hora (a chave de assinatura vem da senha), mas o verificador offline deste
 * aparelho só é substituído na próxima entrada com rede.
 */

import { iguais } from "./sessao";

const CHAVE = "ps-japa:verificador:v1";
const ITERACOES = 250_000;

interface Verificador {
  v: 1;
  sal: string;
  hash: string;
  it: number;
}

function paraB64(b: ArrayBuffer): string {
  let s = "";
  for (const x of new Uint8Array(b)) s += String.fromCharCode(x);
  return btoa(s);
}

function deB64(s: string): Uint8Array<ArrayBuffer> {
  const bruto = atob(s);
  const out = new Uint8Array(new ArrayBuffer(bruto.length));
  for (let i = 0; i < bruto.length; i++) out[i] = bruto.charCodeAt(i);
  return out;
}

function texto(s: string): Uint8Array<ArrayBuffer> {
  const t = new TextEncoder().encode(s);
  const b = new Uint8Array(new ArrayBuffer(t.byteLength));
  b.set(t);
  return b;
}

async function derivar(
  senha: string,
  sal: Uint8Array<ArrayBuffer>,
  iteracoes: number,
): Promise<string> {
  const base = await crypto.subtle.importKey("raw", texto(senha), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: sal, iterations: iteracoes, hash: "SHA-256" },
    base,
    256,
  );
  return paraB64(bits);
}

function ler(): Verificador | null {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (!bruto) return null;
    const v = JSON.parse(bruto) as Verificador;
    return v && v.v === 1 && v.sal && v.hash && v.it > 0 ? v : null;
  } catch {
    return null;
  }
}

/** Há uma senha conferível sem rede neste navegador? */
export function temVerificador(): boolean {
  return ler() !== null;
}

/**
 * Chamado depois de uma entrada aceita pelo servidor — é o único momento em
 * que se sabe que a senha digitada é mesmo a senha do app.
 */
export async function guardarVerificador(senha: string): Promise<void> {
  try {
    const sal = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(16)));
    const dados: Verificador = {
      v: 1,
      sal: paraB64(sal.buffer),
      hash: await derivar(senha, sal, ITERACOES),
      it: ITERACOES,
    };
    localStorage.setItem(CHAVE, JSON.stringify(dados));
  } catch {
    // Sem armazenamento o app continua funcionando — só não abre sem rede.
  }
}

export function esquecerVerificador(): void {
  try {
    localStorage.removeItem(CHAVE);
  } catch {
    // Nada a fazer.
  }
}

/** Confere a senha sem rede. Falso também quando não há verificador gravado. */
export async function conferirOffline(senha: string): Promise<boolean> {
  const guardado = ler();
  if (!guardado) return false;
  try {
    const calculado = await derivar(senha, deB64(guardado.sal), guardado.it);
    return iguais(calculado, guardado.hash);
  } catch {
    return false;
  }
}

// ------------------------------------------------- conversa com o service worker

/**
 * O service worker guarda a própria marca de trancado, porque é ele quem
 * responde quando não há rede. Espera-se a confirmação antes de navegar: sem
 * isso a página nova podia ser servida antes de a marca ser gravada.
 */
async function avisarSW(tipo: "trancar" | "destrancar"): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  const sw = navigator.serviceWorker.controller;
  if (!sw) return;

  await new Promise<void>((resolve) => {
    const canal = new MessageChannel();
    const pronto = setTimeout(resolve, 1000); // nunca prender a interface
    canal.port1.onmessage = () => {
      clearTimeout(pronto);
      resolve();
    };
    try {
      sw.postMessage({ tipo }, [canal.port2]);
    } catch {
      clearTimeout(pronto);
      resolve();
    }
  });
}

export const trancarCache = () => avisarSW("trancar");
export const destrancarCache = () => avisarSW("destrancar");
