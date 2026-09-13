/**
 * Cliente da sincronização. Conversa com /api/nuvem/[chave], que por sua vez
 * fala com o Supabase — o navegador nunca vê chave de banco.
 *
 * Regras de convivência com o modo offline:
 *
 *  - toda função falha em silêncio e devolve null/false. Sem rede, com a nuvem
 *    ainda não configurada ou com o Supabase fora, o app segue funcionando
 *    exatamente como antes, usando o armazenamento local;
 *  - na carga, a nuvem ganha: é ela que faz o app "já estar lá" em outro
 *    computador, que é o ponto de ter nuvem;
 *  - toda escrita grava local primeiro (instantâneo, funciona offline) e
 *    empurra para a nuvem depois.
 *
 * Resolução de conflito é o último que escreve vence. Para um app de um
 * usuário só isso basta; editar offline em duas máquinas ao mesmo tempo e
 * sincronizar depois faz a última perder a outra.
 */

export type ChaveNuvem = "cofre" | "textos";

export interface RespostaNuvem<T> {
  conteudo: T | null;
  atualizadoEm: string | null;
}

/** Vira false no primeiro 503, para não repetir chamada inútil a cada escrita. */
let nuvemIndisponivel = false;

export function nuvemDesligada(): boolean {
  return nuvemIndisponivel;
}

export async function lerDaNuvem<T>(chave: ChaveNuvem): Promise<RespostaNuvem<T> | null> {
  if (nuvemIndisponivel) return null;

  try {
    const r = await fetch(`/api/nuvem/${chave}`, { cache: "no-store" });
    if (r.status === 503) {
      nuvemIndisponivel = true;
      return null;
    }
    if (!r.ok) return null;
    return (await r.json()) as RespostaNuvem<T>;
  } catch {
    // Offline, DNS fora, Supabase fora: segue com o cache local.
    return null;
  }
}

export async function gravarNaNuvem(chave: ChaveNuvem, conteudo: unknown): Promise<boolean> {
  if (nuvemIndisponivel) return false;

  try {
    const r = await fetch(`/api/nuvem/${chave}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conteudo }),
    });
    if (r.status === 503) {
      nuvemIndisponivel = true;
      return false;
    }
    return r.ok;
  } catch {
    return false;
  }
}

/**
 * Agrupa escritas seguidas numa só. Digitar num campo dispara uma gravação por
 * tecla; sem isto seria uma requisição por tecla.
 */
export function comEspera<T>(
  chave: ChaveNuvem,
  ms = 1200,
): (obter: () => T) => void {
  let timer: ReturnType<typeof setTimeout> | undefined;

  return (obter) => {
    clearTimeout(timer);
    timer = setTimeout(() => void gravarNaNuvem(chave, obter()), ms);
  };
}
