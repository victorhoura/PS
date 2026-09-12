/**
 * Tema claro/escuro. O valor mora no atributo `data-tema` do <html>, que é o
 * que o CSS lê, e é espelhado no localStorage para sobreviver ao recarregar.
 *
 * O padrão é escuro: é o tema do PS.py e o que serve em plantão noturno.
 */

export type Tema = "escuro" | "claro";

export const CHAVE_TEMA = "ps-japa:tema";

/**
 * Roda antes da primeira pintura, embutido no HTML. Sem isto a página nasce
 * escura e pisca para clara no primeiro render — desagradável em qualquer
 * app, pior num que se abre dezenas de vezes por plantão.
 */
export const SCRIPT_ANTI_PISCA = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  CHAVE_TEMA,
)});document.documentElement.setAttribute("data-tema",t==="claro"?"claro":"escuro")}catch(e){document.documentElement.setAttribute("data-tema","escuro")}})()`;

export function lerTema(): Tema {
  if (typeof document === "undefined") return "escuro";
  return document.documentElement.getAttribute("data-tema") === "claro" ? "claro" : "escuro";
}

export function aplicarTema(tema: Tema) {
  document.documentElement.setAttribute("data-tema", tema);
  try {
    localStorage.setItem(CHAVE_TEMA, tema);
  } catch {
    // Armazenamento bloqueado: o tema vale nesta sessão e não persiste.
  }
}
