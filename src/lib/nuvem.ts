/**
 * Cliente da nuvem. Conversa com /api/nuvem/[chave], que por sua vez fala com
 * o Supabase — o navegador nunca vê chave de banco.
 *
 * O app não grava nada na máquina. Isso é deliberado: ele roda também em
 * computador de uso compartilhado, e ali qualquer coisa deixada no disco é
 * rastro para quem sentar depois. O preço é que o Supabase deixou de ser
 * espelho e virou a única cópia — então falha de rede não pode mais ser
 * silenciosa. Por isso este módulo tem estado observável: quem escreve fica
 * sabendo se a escrita chegou, e a tela avisa quando não chegou.
 *
 * Resolução de conflito é o último que escreve vence. Para um usuário só isso
 * basta.
 */

export type ChaveNuvem = "cofre" | "textos" | "preferencias";

export interface RespostaNuvem<T> {
  conteudo: T | null;
  atualizadoEm: string | null;
}

export type EstadoNuvem =
  | { tipo: "ocioso" }
  | { tipo: "salvando" }
  /** A gravação não chegou ao banco; o que está na tela só existe na memória. */
  | { tipo: "erro"; motivo: string };

let estado: EstadoNuvem = { tipo: "ocioso" };
const ouvintes = new Set<() => void>();

function definir(novo: EstadoNuvem) {
  estado = novo;
  for (const fn of ouvintes) fn();
}

export function estadoNuvem(): EstadoNuvem {
  return estado;
}

/** Snapshot do servidor: no HTML não existe escrita pendente. */
export const ESTADO_INICIAL: EstadoNuvem = { tipo: "ocioso" };
export function estadoNoServidor(): EstadoNuvem {
  return ESTADO_INICIAL;
}

export function inscreverNuvem(fn: () => void): () => void {
  ouvintes.add(fn);
  return () => ouvintes.delete(fn);
}

function motivoDoStatus(status: number): string {
  if (status === 503) return "A nuvem não está configurada no servidor.";
  if (status === 401) return "A sessão expirou. Entre de novo.";
  if (status === 413) return "O conteúdo ficou grande demais para o banco.";
  return `O banco respondeu ${status}.`;
}

export async function lerDaNuvem<T>(chave: ChaveNuvem): Promise<RespostaNuvem<T>> {
  const r = await fetch(`/api/nuvem/${chave}`, { cache: "no-store" });
  if (!r.ok) throw new Error(motivoDoStatus(r.status));
  return (await r.json()) as RespostaNuvem<T>;
}

/**
 * Grava e devolve se chegou. Diferente da versão anterior, que engolia o erro
 * e deixava o cache local segurar: sem cache local, engolir o erro é perder
 * a edição sem avisar.
 */
export async function gravarNaNuvem(chave: ChaveNuvem, conteudo: unknown): Promise<boolean> {
  definir({ tipo: "salvando" });
  try {
    const r = await fetch(`/api/nuvem/${chave}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conteudo }),
    });
    if (!r.ok) {
      definir({ tipo: "erro", motivo: motivoDoStatus(r.status) });
      return false;
    }
    definir({ tipo: "ocioso" });
    return true;
  } catch {
    definir({ tipo: "erro", motivo: "Sem conexão com a nuvem." });
    return false;
  }
}

/**
 * Agrupa escritas seguidas numa só — digitar num campo dispararia uma
 * gravação por tecla. O estado vira "salvando" assim que há algo pendente,
 * não só quando a requisição sai, senão a tela diz "salvo" enquanto ainda há
 * texto esperando na fila.
 */
export function comEspera<T>(chave: ChaveNuvem, ms = 1200): (obter: () => T) => void {
  let timer: ReturnType<typeof setTimeout> | undefined;

  return (obter) => {
    clearTimeout(timer);
    definir({ tipo: "salvando" });
    timer = setTimeout(() => void gravarNaNuvem(chave, obter()), ms);
  };
}
