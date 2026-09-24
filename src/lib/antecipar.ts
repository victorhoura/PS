/**
 * Busca dos seus textos começando já no <head>, antes do JavaScript do app.
 *
 * Os textos moram só na nuvem, então toda abertura do app precisa ir buscá-los.
 * Antes a busca só saía depois de o React montar a página — o HTML chegava,
 * o JavaScript baixava, a tela hidratava e só então o pedido partia. Com este
 * script o pedido sai enquanto o navegador ainda lê o HTML, em paralelo com o
 * download do JavaScript, e quando o app monta a resposta costuma já estar lá.
 *
 * A resposta fica só em memória, numa promessa na janela, e é consumida uma
 * vez: nada é gravado na máquina.
 */

const CHAVE = "__psTextos";

/**
 * Na tela de entrada não há sessão, e o pedido só voltaria 401. O `catch`
 * vazio é para uma falha de rede não aparecer como erro sem dono no console;
 * quem consome a promessa depois ainda recebe a falha.
 */
export const SCRIPT_TEXTOS = `(function(){try{if(location.pathname==="/entrar")return;var p=fetch("/api/nuvem/textos",{cache:"no-store"});p.catch(function(){});window.${CHAVE}=p}catch(e){}})();`;

/** A resposta que o <head> já foi buscar — uma vez só: um corpo se lê uma vez. */
export function respostaAntecipada(): Promise<Response> | null {
  if (typeof window === "undefined") return null;
  const janela = window as unknown as Record<string, Promise<Response> | undefined>;
  const promessa = janela[CHAVE];
  if (!promessa) return null;
  delete janela[CHAVE];
  return promessa;
}
