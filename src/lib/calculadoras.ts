/**
 * Registro dos escores.
 *
 * As definições moram em `escores/`, um arquivo por tema — eram todas aqui
 * até virarem vinte, e um arquivo de mil e tantas linhas não se navega no
 * meio de um plantão. O que fica aqui é a lista, a busca e as duas contas
 * que o componente usa para desenhar qualquer um deles.
 */

import type { Calculadora, Resposta, Valores } from "./escores/tipos";
import { GLASGOW, NIHSS, CINCINNATI } from "./escores/neurologia";
import { CURB65, QSOFA, WELLS_TVP, WELLS_TEP } from "./escores/torax";
import { ALVARADO, ATLANTA, HINCHEY } from "./escores/abdome";
import { SOFA } from "./escores/sofa";
import { CHARCOT, TOKYO_COLANGITE, TOKYO_COLECISTITE } from "./escores/vias-biliares";

export type { Calculadora, Campo, Criterio, Grupo, Resposta, Valores } from "./escores/tipos";

/** Em ordem alfabética: é como a lista é desenhada e como se procura. */
export const CALCULADORAS: Calculadora[] = [
  ALVARADO,
  ATLANTA,
  CHARCOT,
  CINCINNATI,
  CURB65,
  GLASGOW,
  HINCHEY,
  NIHSS,
  QSOFA,
  SOFA,
  TOKYO_COLANGITE,
  TOKYO_COLECISTITE,
  WELLS_TEP,
  WELLS_TVP,
];

export function acharCalculadora(slug: string): Calculadora | undefined {
  return CALCULADORAS.find((c) => c.slug === slug);
}

/** Soma os pontos de todos os critérios respondidos. */
export function somar(calc: Calculadora, r: Resposta): number {
  let total = 0;
  for (const g of calc.grupos) {
    for (const c of g.criterios) {
      const v = r[c.id];
      if (v === undefined) continue;
      total += c.opcoes ? v : v * (c.pontos ?? 0);
    }
  }
  return total;
}

/** Respostas iniciais: radios no padrão, checkboxes desmarcados. */
export function respostaInicial(calc: Calculadora): Resposta {
  const r: Resposta = {};
  for (const g of calc.grupos) {
    for (const c of g.criterios) {
      r[c.id] = c.opcoes ? (c.padrao ?? c.opcoes[0].pontos) : 0;
    }
  }
  return r;
}

/** Campos numéricos começam VAZIOS, não em zero: peso 0 não existe. */
export function valoresIniciais(calc: Calculadora): Valores {
  const v: Valores = {};
  for (const c of calc.campos ?? []) v[c.id] = null;
  return v;
}
