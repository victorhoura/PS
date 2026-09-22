/**
 * Os links dos sistemas — agora seus, e não mais uma constante no código.
 *
 * Eram cinco endereços fixos, que só mudavam com um deploy. Um sistema novo
 * no hospital, um endereço que muda de host, um que sai do ar: nada disso
 * pode depender de alguém recompilar o app.
 *
 * A lista inteira mora na nuvem, numa chave só. Aqui não vale a camada de
 * edições sobre uma base, como nos textos: lá são 311 itens do PS.py que
 * você pode querer restaurar; aqui são poucos endereços e todos são seus
 * desde o primeiro dia. Guardar a lista toda é mais simples e não perde
 * nada — a lista embutida serve só enquanto a nuvem estiver vazia.
 */

import { comEspera, gravarNaNuvem, lerDaNuvem } from "./nuvem";

export interface Link {
  id: string;
  nome: string;
  url: string;
  /** Título da seção. Texto livre: dá para criar grupos novos ao digitar. */
  grupo: string;
}

/** O que vale até a nuvem responder, e numa conta que nunca editou nada. */
export const LINKS_BASE: Link[] = [
  {
    id: "l-siss",
    nome: "SISS — HOSPITAL GUARULHOS",
    url: "https://hospitalarguarulhos.sissonline.com.br/Abertura/Login.aspx",
    grupo: "Sistemas do hospital",
  },
  {
    id: "l-shift",
    nome: "SHIFT / AFIP — LABORATÓRIO",
    url: "https://shiftlis.afip.com.br/shift/lis/afip/elis/s01.iu.web.Login.cls?config=UNICO",
    grupo: "Sistemas do hospital",
  },
  {
    id: "l-onelaudos",
    nome: "ONE LAUDOS — MOBILEMED",
    url: "https://onelaudos.mobilemed.com.br/exames",
    grupo: "Sistemas do hospital",
  },
  {
    id: "l-sinconecta",
    nome: "SINCONECTA",
    url: "https://app.sinconecta.com/ords/f?p=1500:LOGIN_DESKTOP",
    grupo: "Sistemas do hospital",
  },
  {
    id: "l-whitebook",
    nome: "WHITEBOOK",
    url: "https://whitebook.pebmed.com.br/login/",
    grupo: "Consulta",
  },
];

interface Guardado {
  versao: 1;
  itens: Link[];
}

let cache: Link[] = LINKS_BASE;
let carregou = false;
let emVoo: Promise<void> | null = null;

const ouvintes = new Set<() => void>();
const empurrar = comEspera<Guardado>("links");

function avisar() {
  for (const fn of ouvintes) fn();
}

export function inscreverLinks(fn: () => void): () => void {
  ouvintes.add(fn);
  return () => ouvintes.delete(fn);
}

export function linksAtuais(): Link[] {
  return cache;
}

/** Snapshot do servidor: o HTML nasce com a lista embutida. */
export function linksNoServidor(): Link[] {
  return LINKS_BASE;
}

function comoLink(bruto: unknown): Link | null {
  if (!bruto || typeof bruto !== "object") return null;
  const l = bruto as Partial<Link>;
  if (typeof l.id !== "string" || typeof l.nome !== "string" || typeof l.url !== "string") {
    return null;
  }
  return { id: l.id, nome: l.nome, url: l.url, grupo: typeof l.grupo === "string" ? l.grupo : "" };
}

export function carregarLinks(): Promise<void> {
  if (carregou) return Promise.resolve();
  if (emVoo) return emVoo;

  emVoo = (async () => {
    try {
      const r = await lerDaNuvem<Guardado>("links");
      const itens = r.conteudo?.itens;
      // Lista vazia é uma escolha — você pode ter apagado todos —, então ela
      // não pode cair de volta na lista embutida.
      if (Array.isArray(itens)) {
        cache = itens.map(comoLink).filter((l): l is Link => l !== null);
      }
      carregou = true;
    } catch {
      // Sem nuvem valem os embutidos; a faixa de erro da tela já avisa.
    } finally {
      emVoo = null;
      avisar();
    }
  })();

  return emVoo;
}

function gravar(novos: Link[]) {
  cache = novos;
  // A primeira gravação também é a que tira a lista do código e a traz para
  // a nuvem: o que sobe é sempre a lista inteira.
  empurrar(() => ({ versao: 1, itens: cache }));
  avisar();
}

export function novoLink(): Link {
  return {
    id: `l${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    nome: "",
    url: "",
    grupo: "",
  };
}

/**
 * Completa o endereço quando você digita só o domínio.
 *
 * Digitar "whitebook.pebmed.com.br" é o normal; sem isto o link viraria um
 * caminho relativo e levaria para dentro do próprio app.
 */
export function normalizarUrl(bruto: string): string {
  const limpo = bruto.trim();
  if (!limpo) return "";
  return /^https?:\/\//i.test(limpo) ? limpo : `https://${limpo}`;
}

export function urlValida(bruto: string): boolean {
  try {
    const u = new URL(normalizarUrl(bruto));
    return (u.protocol === "http:" || u.protocol === "https:") && u.hostname.includes(".");
  } catch {
    return false;
  }
}

/** O endereço como ele aparece embaixo do nome. */
export function hostDe(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export function salvarLink(link: Link): void {
  const limpo: Link = {
    ...link,
    nome: link.nome.trim(),
    url: normalizarUrl(link.url),
    grupo: link.grupo.trim() || "Links",
  };
  const existe = cache.some((l) => l.id === limpo.id);
  gravar(existe ? cache.map((l) => (l.id === limpo.id ? limpo : l)) : [...cache, limpo]);
}

export function removerLink(id: string): void {
  gravar(cache.filter((l) => l.id !== id));
}

/** Volta à lista que vem com o app. */
export function restaurarLinks(): void {
  gravar(LINKS_BASE);
}

/**
 * Agrupados na ordem em que os grupos aparecem, e não em ordem alfabética:
 * "Sistemas do hospital" tem de continuar em cima, que é o que você abre no
 * começo do plantão.
 */
export function porGrupo(itens: Link[]): [string, Link[]][] {
  const grupos = new Map<string, Link[]>();
  for (const l of itens) {
    const chave = l.grupo || "Links";
    const lista = grupos.get(chave);
    if (lista) lista.push(l);
    else grupos.set(chave, [l]);
  }
  return [...grupos];
}

/** Grava agora, sem esperar o agrupamento. */
export async function gravarLinksAgora(): Promise<boolean> {
  return gravarNaNuvem("links", { versao: 1, itens: cache });
}
