/**
 * Cofre de credenciais — cifrado no navegador, nunca no servidor.
 *
 * O que entra aqui (login do SISS, senha, cartão de chave dinâmica) é o que dá
 * acesso a prontuário de paciente. Por isso o desenho é deliberado:
 *
 *  - a senha-mestra NUNCA é gravada, em lugar nenhum;
 *  - dela se deriva uma chave por PBKDF2-SHA256 com 250 mil iterações, o que
 *    torna cada tentativa de adivinhação cara;
 *  - o conteúdo é cifrado com AES-GCM, que além de esconder também detecta
 *    adulteração — mexer no blob faz a decifragem falhar, não devolver lixo;
 *  - o blob cifrado vai para o Supabase e fica na memória enquanto a aba
 *    estiver aberta; nada é gravado nesta máquina. O servidor recebe o blob
 *    já cifrado e não tem como lê-lo — a senha-mestra não sai do navegador.
 *
 * A senha do app (PS_SENHA) NÃO abre o cofre. São segredos separados de
 * propósito: quem passar da porta do app ainda não chega nas credenciais.
 */

const ITERACOES = 250_000;

export interface Credencial {
  id: string;
  rotulo: string;
  usuario: string;
  senha: string;
  nota: string;
}

/** O cartão físico de chave dinâmica, transcrito como grade. */
export interface Grade {
  colunas: string[];
  linhas: string[];
  valores: string[][];
}

export interface ConteudoCofre {
  versao: 1;
  credenciais: Credencial[];
  grade: Grade | null;
}

export const COFRE_VAZIO: ConteudoCofre = { versao: 1, credenciais: [], grade: null };

interface Blob {
  v: 1;
  sal: string;
  iv: string;
  ct: string;
  it: number;
}

// ------------------------------------------------------------ base64

function paraB64(b: ArrayBuffer): string {
  const bytes = new Uint8Array(b);
  let s = "";
  for (const x of bytes) s += String.fromCharCode(x);
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

// ------------------------------------------------------------ cripto

async function derivar(senhaMestra: string, sal: Uint8Array<ArrayBuffer>, iteracoes: number) {
  const base = await crypto.subtle.importKey("raw", texto(senhaMestra), "PBKDF2", false, [
    "deriveKey",
  ]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: sal, iterations: iteracoes, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function cifrar(conteudo: ConteudoCofre, senhaMestra: string): Promise<string> {
  const sal = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(16)));
  const iv = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(12)));
  const chave = await derivar(senhaMestra, sal, ITERACOES);
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    chave,
    texto(JSON.stringify(conteudo)),
  );
  const blob: Blob = {
    v: 1,
    sal: paraB64(sal.buffer),
    iv: paraB64(iv.buffer),
    ct: paraB64(ct),
    it: ITERACOES,
  };
  return JSON.stringify(blob);
}

/** Devolve null quando a senha está errada ou o blob foi adulterado. */
export async function decifrar(
  blobJson: string,
  senhaMestra: string,
): Promise<ConteudoCofre | null> {
  try {
    const blob = JSON.parse(blobJson) as Blob;
    if (blob.v !== 1) return null;

    const chave = await derivar(senhaMestra, deB64(blob.sal), blob.it || ITERACOES);
    const claro = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: deB64(blob.iv) },
      chave,
      deB64(blob.ct),
    );
    const lido = JSON.parse(new TextDecoder().decode(claro)) as ConteudoCofre;

    return {
      versao: 1,
      credenciais: Array.isArray(lido.credenciais) ? lido.credenciais : [],
      grade: lido.grade ?? null,
    };
  } catch {
    // Senha errada, blob corrompido ou adulterado: o AES-GCM falha a
    // verificação de integridade e cai aqui. Não distinguimos os casos.
    return null;
  }
}

// ------------------------------------------------------------ armazenamento

/**
 * O blob cifrado vive só na memória desta aba e no Supabase. Nada vai para o
 * disco desta máquina — em computador de uso compartilhado, um cofre cifrado
 * esquecido no localStorage ainda é um alvo parado para atacar offline, com
 * todo o tempo do mundo para tentar a senha-mestra.
 */
let blobEmMemoria: string | null = null;

export function lerBlob(): string | null {
  return blobEmMemoria;
}

export function guardarBlobEmMemoria(blob: string | null): void {
  blobEmMemoria = blob;
}

export function existeCofre(): boolean {
  return blobEmMemoria !== null;
}

// ------------------------------------------------------------ chave dinâmica

export const GRADE_PADRAO: Grade = {
  colunas: ["A", "B", "C", "D"],
  linhas: ["1", "2", "3", "4"],
  valores: [
    ["", "", "", ""],
    ["", "", "", ""],
    ["", "", "", ""],
    ["", "", "", ""],
  ],
};

/**
 * Resolve uma combinação do cartão: "3A", "a3", "3 A" — tudo vale.
 * É o `buscar_chave` do PS.py, sem a tabela dentro do código-fonte.
 */
export function buscarNaGrade(grade: Grade | null, entrada: string): string | null {
  if (!grade) return null;

  const limpo = entrada.replace(/\s+/g, "").toUpperCase();
  if (limpo.length !== 2) return null;

  const [a, b] = limpo;
  // Aceita nas duas ordens: linha-coluna ou coluna-linha.
  const tentativas: [string, string][] = [
    [a, b],
    [b, a],
  ];

  for (const [l, c] of tentativas) {
    const i = grade.linhas.indexOf(l);
    const j = grade.colunas.indexOf(c);
    if (i >= 0 && j >= 0) {
      const v = grade.valores[i]?.[j] ?? "";
      return v || null;
    }
  }
  return null;
}

export function novaCredencial(): Credencial {
  return {
    id: `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    rotulo: "",
    usuario: "",
    senha: "",
    nota: "",
  };
}
