/**
 * Registro dos escores.
 *
 * As definições moram em `escores/`, um arquivo por tema — eram todas aqui
 * até virarem vinte, e um arquivo de mil e tantas linhas não se navega no
 * meio de um plantão. O que fica aqui é a lista, a busca e as duas contas
 * que o componente usa para desenhar qualquer um deles.
 */

import type { Calculadora, Resposta, Valores } from "./escores/tipos";
import {
  CEFALEIA_ICHD,
  CINCINNATI,
  GLASGOW,
  NIHSS,
  PROTOCOLO_CEFALEIA,
} from "./escores/neurologia";
import { CURB65, QSOFA, WELLS_TVP, WELLS_TEP } from "./escores/torax";
import { ALVARADO, ATLANTA, HINCHEY } from "./escores/abdome";
import { SOFA } from "./escores/sofa";
import { CHARCOT, TOKYO_COLANGITE, TOKYO_COLECISTITE } from "./escores/vias-biliares";
import { HIPERCALEMIA, HIPERNATREMIA, HIPOCALEMIA, HIPONATREMIA } from "./escores/eletrolitos";

export type { Calculadora, Campo, Criterio, Grupo, Resposta, Valores } from "./escores/tipos";

/** Em ordem alfabética: é como a lista é desenhada e como se procura. */
export const CALCULADORAS: Calculadora[] = [
  ALVARADO,
  ATLANTA,
  CEFALEIA_ICHD,
  CHARCOT,
  CINCINNATI,
  CURB65,
  GLASGOW,
  HINCHEY,
  HIPERCALEMIA,
  HIPERNATREMIA,
  HIPOCALEMIA,
  HIPONATREMIA,
  NIHSS,
  PROTOCOLO_CEFALEIA,
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

/** O que a resposta guarda para uma opção de radio (ver `Criterio.opcoes`). */
export const valorDaOpcao = (o: { pontos: number; valor?: number }) => o.valor ?? o.pontos;

/** Soma os pontos de todos os critérios respondidos. */
export function somar(calc: Calculadora, r: Resposta): number {
  let total = 0;
  for (const g of calc.grupos) {
    for (const c of g.criterios) {
      const v = r[c.id];
      if (v === undefined) continue;
      if (c.opcoes) {
        const escolhida = c.opcoes.find((o) => valorDaOpcao(o) === v);
        total += escolhida ? escolhida.pontos : v;
      } else {
        total += v * (c.pontos ?? 0);
      }
    }
  }
  return total;
}

/** Respostas iniciais: radios no padrão, checkboxes desmarcados. */
export function respostaInicial(calc: Calculadora): Resposta {
  const r: Resposta = {};
  for (const g of calc.grupos) {
    for (const c of g.criterios) {
      r[c.id] = c.opcoes ? (c.padrao ?? valorDaOpcao(c.opcoes[0])) : 0;
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
