/**
 * Tema claro/escuro. O valor mora no atributo `data-tema` do <html>, que é o
 * que o CSS lê, e é espelhado nas preferências da nuvem.
 *
 * O padrão é escuro: é o tema do PS.py e o que serve em plantão noturno.
 *
 * Não há mais script anti-pisca lendo o localStorage antes da primeira
 * pintura — nada é gravado nesta máquina. A página nasce escura; quem usa o
 * tema claro vê a troca quando as preferências chegam.
 */

import { definirPreferencia } from "./preferencias";

export type Tema = "escuro" | "claro";

export function lerTema(): Tema {
  if (typeof document === "undefined") return "escuro";
  return document.documentElement.getAttribute("data-tema") === "claro" ? "claro" : "escuro";
}

/** Aplica sem gravar — usado quando o tema chega da nuvem. */
export function pintarTema(tema: Tema) {
  document.documentElement.setAttribute("data-tema", tema);
}

export function aplicarTema(tema: Tema) {
  pintarTema(tema);
  definirPreferencia("tema", tema);
}
