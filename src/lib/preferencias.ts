/**
 * Preferências e o contador do plantão — tema, médico solicitante, unidade
 * requisitante, município, quantos atendimentos.
 *
 * Não é dado clínico, mas mora na nuvem como todo o resto: o app roda em
 * computador de uso compartilhado e nada é gravado na máquina. De brinde,
 * abrir o app em outro computador já vem com as suas preferências.
 *
 * Tudo numa chave só: são poucos campos, mudam pouco e assim é uma leitura e
 * uma escrita agrupada, não seis.
 */

import { comEspera, gravarNaNuvem, lerDaNuvem } from "./nuvem";

export interface Preferencias {
  tema?: "escuro" | "claro";
  /** Médico solicitante da APAC. */
  medico?: string;
  /** Padrões da SADT. */
  sadt?: { requisitante?: string; municipio?: string };
  /** Atendimentos contados no plantão. */
  contador?: number;
}

const VAZIAS: Preferencias = {};

let cache: Preferencias = VAZIAS;
let carregou = false;
let emVoo: Promise<void> | null = null;

/**
 * Campos que você mexeu enquanto a leitura da nuvem ainda estava a caminho.
 *
 * Sem isto a resposta entrava por cima: trocar o tema (ou digitar o nome do
 * médico, ou contar um atendimento) nos primeiros instantes da tela era
 * perder a alteração quando a nuvem respondesse — e ainda ficar com a tela
 * dizendo uma coisa e o banco outra.
 */
const mexidas = new Set<keyof Preferencias>();

const ouvintes = new Set<() => void>();
const empurrar = comEspera<Preferencias>("preferencias");

function avisar() {
  for (const fn of ouvintes) fn();
}

export function inscreverPreferencias(fn: () => void): () => void {
  ouvintes.add(fn);
  return () => ouvintes.delete(fn);
}

/** O que está em memória agora. Vazio até a nuvem responder. */
export function preferenciasAtuais(): Preferencias {
  return cache;
}

/** Snapshot do servidor: o HTML não conhece preferência nenhuma. */
export function preferenciasNoServidor(): Preferencias {
  return VAZIAS;
}

/** Traz da nuvem uma vez por carregamento. Falhar aqui só mantém o padrão. */
export function carregarPreferencias(): Promise<void> {
  if (carregou) return Promise.resolve();
  if (emVoo) return emVoo;

  emVoo = (async () => {
    try {
      const r = await lerDaNuvem<Preferencias>("preferencias");
      if (r.conteudo && typeof r.conteudo === "object") {
        // O que veio da nuvem é mais velho do que o que você acabou de
        // mexer: o pedido saiu antes do seu clique.
        const meu = cache;
        const vindo: Preferencias = { ...r.conteudo };
        for (const chave of mexidas) {
          (vindo as Record<string, unknown>)[chave] = meu[chave];
        }
        cache = vindo;
      }
      carregou = true;
    } catch {
      // Sem preferência valem os padrões; não é motivo para travar o app.
    } finally {
      mexidas.clear();
      emVoo = null;
      avisar();
    }
  })();

  return emVoo;
}

/**
 * Altera um campo. A escrita é agrupada: clicar dez vezes no contador vira
 * uma requisição, não dez.
 */
export function definirPreferencia<K extends keyof Preferencias>(
  chave: K,
  valor: Preferencias[K],
): void {
  cache = { ...cache, [chave]: valor };
  if (emVoo) mexidas.add(chave);
  empurrar(() => cache);
  avisar();
}

/** Grava agora, sem esperar o agrupamento — para o que não pode ficar na fila. */
export async function gravarPreferenciasAgora(): Promise<boolean> {
  return gravarNaNuvem("preferencias", cache);
}
