/**
 * Tema claro/escuro. O valor mora no atributo `data-tema` do <html>, que é o
 * que o CSS lê, e é espelhado nas preferências da nuvem.
 *
 * O padrão é escuro: é o tema do PS.py e o que serve em plantão noturno.
 *
 * ── Por que existe um cookie aqui, num app que não grava nada na máquina ──
 *
 * A preferência mora na nuvem, e a nuvem exige sessão. O BLOQUEAR apaga a
 * sessão: a tela de senha não tem como perguntar qual tema você escolheu e
 * nascia sempre escura, desfazendo a escolha a cada bloqueio.
 *
 * Então uma palavra fica nesta máquina — "claro" ou "escuro", e nada além
 * disso. Não é dado de paciente, não é texto seu, não diz quem sentou aqui:
 * é a mesma informação que qualquer um enxerga olhando para a tela. O que de
 * fato não pode ficar (textos, cofre, contador, nomes) continua sem ficar.
 *
 * De quebra, isto acaba com a piscada de escuro que abria toda página antes
 * de as preferências chegarem da nuvem.
 */

import { definirPreferencia } from "./preferencias";

export type Tema = "escuro" | "claro";

const COOKIE = "ps_tema";
const UM_ANO = 60 * 60 * 24 * 365;

/** Só as duas palavras: o que vier diferente disso não pinta nada. */
const DO_COOKIE = new RegExp(`(?:^|; )${COOKIE}=(claro|escuro)(?:;|$)`);

/**
 * Cor da barra do sistema — a barra de status do iPhone com o app na tela de
 * início, e a barra do navegador no celular. É a cor da barra de topo do app,
 * para as duas parecerem uma só.
 *
 * Segue o tema escolhido NO APP, e não o do celular: com a cor presa ao modo
 * claro/escuro do sistema, um iPhone escuro com o app claro ganhava uma
 * faixa preta em cima da barra branca.
 */
export const COR_DA_BARRA: Record<Tema, string> = { escuro: "#13161a", claro: "#ffffff" };

function pintarBarra(tema: Tema) {
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", COR_DA_BARRA[tema]);
}

/**
 * O que roda no <head> antes da primeira pintura.
 *
 * Precisa ser texto porque vai inteiro para dentro do HTML: ele executa
 * enquanto o navegador ainda está lendo a página — antes do React, antes de
 * qualquer requisição à nuvem, antes de o primeiro pixel aparecer.
 */
export const SCRIPT_TEMA =
  `(function(){try{var m=document.cookie.match(/${DO_COOKIE.source}/);` +
  `if(m)document.documentElement.setAttribute("data-tema",m[1]);` +
  `var b=document.querySelector('meta[name="theme-color"]');` +
  `if(b&&m)b.setAttribute("content",m[1]==="claro"?"${COR_DA_BARRA.claro}":"${COR_DA_BARRA.escuro}")` +
  `}catch(e){}})()`;

export function lerTema(): Tema {
  if (typeof document === "undefined") return "escuro";
  return document.documentElement.getAttribute("data-tema") === "claro" ? "claro" : "escuro";
}

/** A escolha desta máquina, se ela já tiver uma. */
export function temaDoCookie(): Tema | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(DO_COOKIE);
  return m ? (m[1] as Tema) : null;
}

/**
 * Avisa quando o tema muda, venha de onde vier — do botão, da nuvem ou do
 * script do <head>.
 *
 * É o `data-tema` que é observado, e não a preferência, porque ele é o
 * ÚNICO lugar em que o tema de fato existe. Um botão que lê a preferência
 * passa a mentir assim que o tema muda por outro caminho, e um botão que
 * mente pede dois cliques para fazer uma coisa.
 */
export function inscreverTema(aoMudar: () => void): () => void {
  const observador = new MutationObserver(aoMudar);
  observador.observe(document.documentElement, { attributeFilter: ["data-tema"] });
  return () => observador.disconnect();
}

function guardarNoCookie(tema: Tema) {
  try {
    // `secure` só em https: no executável e no `next dev` o app roda em
    // http://localhost, onde um cookie `secure` é descartado sem aviso.
    const seguro = location.protocol === "https:" ? "; secure" : "";
    document.cookie = `${COOKIE}=${tema}; path=/; max-age=${UM_ANO}; samesite=lax${seguro}`;
  } catch {
    // Cookies bloqueados: o tema vale nesta aba e só não sobrevive ao bloqueio.
  }
}

/** Aplica sem gravar na nuvem — usado quando o tema chega dela. */
export function pintarTema(tema: Tema) {
  document.documentElement.setAttribute("data-tema", tema);
  pintarBarra(tema);
  guardarNoCookie(tema);
}

export function aplicarTema(tema: Tema) {
  pintarTema(tema);
  definirPreferencia("tema", tema);
}
