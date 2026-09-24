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

import { respostaAntecipada } from "./antecipar";

export type ChaveNuvem = "cofre" | "textos" | "preferencias" | "modelos" | "links";

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
  // Os textos já podem estar a caminho desde o <head> (veja antecipar.ts).
  const antecipada = chave === "textos" ? respostaAntecipada() : null;
  const r = await (antecipada ?? fetch(`/api/nuvem/${chave}`, { cache: "no-store" }));
  if (!r.ok) throw new Error(motivoDoStatus(r.status));
  return (await r.json()) as RespostaNuvem<T>;
}

/**
 * Teto de um pedido com keepalive. O navegador aceita até 64 KiB somando
 * todos os que estão no ar; acima disso o fetch nem sai. A folga cobre mais
 * de uma chave pendente ao mesmo tempo.
 */
const TETO_KEEPALIVE = 60_000;

/**
 * Grava e devolve se chegou. Diferente da versão anterior, que engolia o erro
 * e deixava o cache local segurar: sem cache local, engolir o erro é perder
 * a edição sem avisar.
 *
 * `saindo` é para quando a página está indo embora: aí só um pedido com
 * keepalive sobrevive ao descarregamento. Conteúdo grande demais para ele
 * vai do jeito normal — sai, mas pode não chegar.
 */
export async function gravarNaNuvem(
  chave: ChaveNuvem,
  conteudo: unknown,
  saindo = false,
): Promise<boolean> {
  definir({ tipo: "salvando" });
  const corpo = JSON.stringify({ conteudo });
  try {
    const r = await fetch(`/api/nuvem/${chave}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: corpo,
      keepalive: saindo && new TextEncoder().encode(corpo).length <= TETO_KEEPALIVE,
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
 * O que o agrupamento ainda segura, por chave.
 *
 * Existe por causa do intervalo de espera: sem saber o que está pendente, o
 * que você mexeu no último segundo morria com a página. Recarregar, fechar a
 * aba ou BLOQUEAR logo depois de salvar — o gesto de quem termina num
 * computador compartilhado — perdia a última alteração sem aviso nenhum.
 */
const pendentes = new Map<ChaveNuvem, { obter: () => unknown; timer: ReturnType<typeof setTimeout> }>();

function enviarJa(chave: ChaveNuvem, saindo = false): Promise<boolean> {
  const p = pendentes.get(chave);
  if (!p) return Promise.resolve(true);
  clearTimeout(p.timer);
  pendentes.delete(chave);
  return gravarNaNuvem(chave, p.obter(), saindo);
}

/**
 * Agrupa escritas seguidas numa só — digitar num campo dispararia uma
 * gravação por tecla. O estado vira "salvando" assim que há algo pendente,
 * não só quando a requisição sai, senão a tela diz "salvo" enquanto ainda há
 * texto esperando na fila.
 */
export function comEspera<T>(chave: ChaveNuvem, ms = 1200): (obter: () => T) => void {
  return (obter) => {
    clearTimeout(pendentes.get(chave)?.timer);
    definir({ tipo: "salvando" });
    pendentes.set(chave, { obter, timer: setTimeout(() => void enviarJa(chave), ms) });
  };
}

/**
 * Manda agora o que está esperando e diz se tudo chegou. O BLOQUEAR chama
 * antes de derrubar a sessão: depois do /api/sair a nuvem já recusaria.
 */
export async function descarregarPendentes(): Promise<boolean> {
  const envios = [...pendentes.keys()].map((chave) => enviarJa(chave));
  return (await Promise.all(envios)).every(Boolean);
}

/** A página está indo embora: o que estiver esperando sai já, com keepalive. */
export function mandarAntesDeSair(): void {
  for (const chave of [...pendentes.keys()]) void enviarJa(chave, true);
}

// Fechar, recarregar ou sair do endereço dispara o pagehide. Esconder a aba
// também conta: no celular, o sistema pode matar uma aba escondida sem que o
// pagehide chegue a disparar.
if (typeof window !== "undefined") {
  window.addEventListener("pagehide", mandarAntesDeSair);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") mandarAntesDeSair();
  });
}
