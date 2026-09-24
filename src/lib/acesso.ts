/**
 * A senha do app e o segundo fator que autoriza trocá-la. SÓ do servidor.
 *
 * Antes a senha era só a variável `PS_SENHA` da Vercel, e trocá-la queria
 * dizer entrar no painel e refazer o deploy. Agora ela tem um registro no
 * banco e pode ser trocada pela tela — mas o que fica guardado lá é o HASH,
 * nunca a senha. Quem ler o banco não consegue entrar no app.
 *
 * `PS_SENHA` não sumiu: ela continua valendo enquanto não houver senha
 * própria gravada, o que mantém o app funcionando exatamente como hoje até
 * você trocar pela primeira vez. É também a saída de emergência — apagar o
 * registro `acesso` no Supabase devolve o acesso pela senha da Vercel, que é
 * o caminho se você perder o celular do autenticador.
 *
 * ── O código também na entrada ──
 *
 * Com o autenticador configurado, entrar (e desbloquear, que é a mesma tela)
 * pede a senha E o código. Cada código só entra uma vez: o passo de 30
 * segundos aceito fica gravado, e um código daquele passo ou de antes é
 * recusado. Numa máquina pública, quem capturar o que você digitou não
 * consegue repetir a entrada nem dentro do mesmo minuto.
 *
 * ── Por que trocar a senha derruba todas as sessões ──
 *
 * O cookie de sessão é assinado com uma chave derivada da senha em vigor
 * (veja `sessao.ts`). Trocar a senha troca a chave, e toda assinatura antiga
 * deixa de conferir — em qualquer computador, sem precisar avisar ninguém.
 * É de graça e é o que se espera de uma troca de senha.
 */

import { lerRegistro, gravarRegistro, nuvemConfigurada } from "./supabase";
import { passoDoCodigo } from "./totp";

const CHAVE = "acesso";

/** OWASP, 2023, para PBKDF2-HMAC-SHA256. Custa uma vez a cada 12 horas. */
const ITERACOES = 600_000;

export interface Acesso {
  /** Sobe a cada troca. Só serve para saber que mudou. */
  versao: number;
  /** PBKDF2 da senha, em base64url. */
  hash: string;
  sal: string;
  /** Segredo do autenticador, em base32. Null enquanto não configurado. */
  totp: string | null;
  /** Último passo de 30 s cujo código foi aceito. Código de antes não entra. */
  ultimoPasso: number;
}

function base64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function novoSal(): string {
  return base64url(crypto.getRandomValues(new Uint8Array(16)));
}

export async function derivar(senha: string, sal: string): Promise<string> {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(senha).slice().buffer as ArrayBuffer,
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: new TextEncoder().encode(sal).slice().buffer as ArrayBuffer,
      iterations: ITERACOES,
      hash: "SHA-256",
    },
    material,
    256,
  );
  return base64url(new Uint8Array(bits));
}

function comoAcesso(bruto: unknown): Acesso | null {
  if (!bruto || typeof bruto !== "object") return null;
  const a = bruto as Partial<Acesso>;
  if (typeof a.hash !== "string" || typeof a.sal !== "string") return null;
  return {
    versao: typeof a.versao === "number" ? a.versao : 1,
    hash: a.hash,
    sal: a.sal,
    totp: typeof a.totp === "string" ? a.totp : null,
    ultimoPasso: typeof a.ultimoPasso === "number" ? a.ultimoPasso : 0,
  };
}

export async function lerAcesso(): Promise<Acesso | null> {
  if (!nuvemConfigurada()) return null;
  const registro = await lerRegistro(CHAVE);
  return comoAcesso(registro?.conteudo);
}

/**
 * "Não existe senha própria" e "não consegui perguntar" são coisas
 * diferentes, e confundi-las abre um buraco: se uma falha do banco valesse
 * como "não existe", bastaria esperar o Supabase piscar para a senha ANTIGA
 * da Vercel voltar a valer — depois de você tê-la trocado justamente por
 * achar que ela não servia mais.
 */
type Consulta = { ok: true; acesso: Acesso | null } | { ok: false };

async function consultar(): Promise<Consulta> {
  try {
    return { ok: true, acesso: await lerAcesso() };
  } catch {
    return { ok: false };
  }
}

export async function gravarAcesso(acesso: Acesso): Promise<void> {
  await gravarRegistro(CHAVE, acesso);
}

/** Comparação em tempo constante — não vaza pelo tempo de resposta. */
export function iguais(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let dif = 0;
  for (let i = 0; i < a.length; i++) dif |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return dif === 0;
}

/**
 * A chave que assina o cookie de sessão.
 *
 * É o hash da senha em vigor, e não a senha: assim o proxy confere a
 * assinatura sem nunca ter a senha em mãos, e trocá-la invalida tudo que
 * havia sido assinado antes.
 */
export async function segredoDeAssinatura(): Promise<string | null> {
  const r = await consultar();
  if (r.ok && r.acesso) return `v${r.acesso.versao}:${r.acesso.hash}`;

  // Com o banco fora, devolver a senha da Vercel deixa o proxy recusar todo
  // cookie assinado com a chave nova — ou seja, o app tranca enquanto a nuvem
  // não volta. É o certo: sem banco não há textos nem cofre para mostrar, e
  // trancar é melhor do que deixar entrar com uma senha que você aposentou.
  return process.env.PS_SENHA ?? null;
}

/** Confere a senha digitada na entrada. */
export async function conferirSenha(enviada: string): Promise<boolean> {
  const r = await consultar();
  if (!r.ok) return false;

  if (r.acesso) return iguais(await derivar(enviada, r.acesso.sal), r.acesso.hash);

  const daVercel = process.env.PS_SENHA;
  return Boolean(daVercel) && iguais(enviada, daVercel!);
}

/**
 * A tela de entrada pergunta o código?
 *
 * Sim quando há autenticador — e também quando o banco não respondeu: sem
 * banco ninguém entra mesmo, e esconder o campo só faria a tela mentir sobre
 * o que vai ser pedido quando ele voltar.
 */
export async function pedeCodigoNaEntrada(): Promise<boolean> {
  const r = await consultar();
  return !r.ok || Boolean(r.acesso?.totp);
}

/**
 * Confere e GASTA um código do autenticador.
 *
 * Devolve o passo aceito, ou null se o código não confere ou já foi usado
 * (passo igual ou anterior ao último aceito). Quem chama grava o passo junto
 * com o que mais for gravar.
 */
export async function gastarCodigo(
  segredo: string,
  codigo: string,
  ultimoPasso: number,
): Promise<number | null> {
  const passo = await passoDoCodigo(segredo, codigo);
  return passo !== null && passo > ultimoPasso ? passo : null;
}

/**
 * Confere a entrada: senha e, havendo autenticador, o código.
 *
 * Senha e código são conferidos sempre os dois, e a resposta é uma só para
 * qualquer falha — dizer "a senha está certa, falta o código" ensinaria a
 * quem tenta adivinhar que ele já acertou metade.
 */
export async function conferirEntrada(senha: string, codigo: string): Promise<boolean> {
  const r = await consultar();
  if (!r.ok) return false;

  const acesso = r.acesso;
  if (!acesso) {
    const daVercel = process.env.PS_SENHA;
    return Boolean(daVercel) && iguais(senha, daVercel!);
  }

  const senhaCerta = iguais(await derivar(senha, acesso.sal), acesso.hash);
  if (!acesso.totp) return senhaCerta;

  const passo = await gastarCodigo(acesso.totp, codigo, acesso.ultimoPasso);
  if (!senhaCerta || passo === null) return false;

  // Sem conseguir gravar que o código foi usado, ele poderia ser usado de
  // novo: melhor recusar a entrada do que abrir essa porta.
  try {
    await gravarAcesso({ ...acesso, ultimoPasso: passo });
  } catch {
    return false;
  }
  return true;
}
