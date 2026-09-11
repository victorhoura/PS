/**
 * Os 311 textos do PS.py são a base embutida no bundle — sempre presentes,
 * sempre offline. O que você cria ou edita fica por cima, numa camada
 * guardada no navegador, e é isso que este arquivo administra.
 *
 * A base nunca é alterada: editar um texto original grava um override, e
 * "restaurar" é apagar esse override. Apagar um original grava uma lápide,
 * não remove nada — por isso dá para voltar atrás em qualquer momento.
 *
 * LIMITE CONHECIDO: a camada mora no localStorage deste navegador. Não
 * atravessa computadores nem sobrevive a uma limpeza de dados do navegador.
 * Por isso existe exportar()/importar(), e por isso o Supabase entra na v2.
 */

import { CATEGORIAS, SNIPPETS } from "@/data/snippets";
import type { CategoriaSlug, Snippet } from "./types";

const CHAVE = "ps-japa:textos:v1";

interface Camada {
  versao: 1;
  /** id do texto original -> conteúdo que o substitui */
  editados: Record<string, { nome: string; texto: string; em: string }>;
  /** ids de textos originais escondidos */
  removidos: string[];
  /** textos criados por você */
  novos: Snippet[];
}

const VAZIA: Camada = { versao: 1, editados: {}, removidos: [], novos: [] };

// ---------------------------------------------------------------- leitura

let camadaCache: Camada | null = null;
let listaCache: Snippet[] | null = null;
let resumoCache: Resumo | null = null;

function lerCamada(): Camada {
  if (camadaCache) return camadaCache;
  if (typeof window === "undefined") return VAZIA;

  try {
    const bruto = localStorage.getItem(CHAVE);
    if (!bruto) return (camadaCache = VAZIA);

    const lido = JSON.parse(bruto) as Partial<Camada>;
    camadaCache = {
      versao: 1,
      editados: lido.editados ?? {},
      removidos: Array.isArray(lido.removidos) ? lido.removidos : [],
      novos: Array.isArray(lido.novos) ? lido.novos : [],
    };
  } catch {
    // JSON corrompido ou localStorage bloqueado: segue com a base limpa em
    // vez de derrubar o app. Nada se perde — o arquivo continua lá.
    camadaCache = VAZIA;
  }
  return camadaCache;
}

function gravarCamada(c: Camada): boolean {
  camadaCache = c;
  listaCache = null;
  resumoCache = null;
  try {
    localStorage.setItem(CHAVE, JSON.stringify(c));
    avisar();
    return true;
  } catch {
    // Cota estourada ou modo restrito: a edição vale nesta sessão, mas não
    // sobrevive ao recarregar. Quem chamou avisa na tela.
    avisar();
    return false;
  }
}

/** Base + camada, já na ordem em que a lista desenha. */
export function todos(): Snippet[] {
  if (listaCache) return listaCache;

  const c = lerCamada();
  const removidos = new Set(c.removidos);

  const base = SNIPPETS.filter((s) => !removidos.has(s.id)).map((s) => {
    const ed = c.editados[s.id];
    return ed ? { ...s, nome: ed.nome, texto: ed.texto, atualizadoEm: ed.em } : s;
  });

  // Seus textos primeiro: numa categoria com 110 fármacos, o que você
  // acrescentou tem que estar no topo, não perdido no meio da lista.
  return (listaCache = [...c.novos, ...base]);
}

/** Snapshot do servidor: só a base, sem camada — evita erro de hidratação. */
export function todosNoServidor(): Snippet[] {
  return SNIPPETS;
}

export function daCategoria(slug: CategoriaSlug, lista = todos()): Snippet[] {
  return lista.filter((s) => s.categoria === slug);
}

export function ehNovo(id: string): boolean {
  return id.startsWith("novo:");
}

export function foiEditado(id: string): boolean {
  return !ehNovo(id) && id in lerCamada().editados;
}

/** Contagem por categoria já refletindo criações e remoções. */
export function contagens(lista = todos()): Record<string, number> {
  const n: Record<string, number> = {};
  for (const c of CATEGORIAS) n[c.slug] = 0;
  for (const s of lista) n[s.categoria] = (n[s.categoria] ?? 0) + 1;
  return n;
}

// ---------------------------------------------------------------- escrita

function agora(): string {
  return new Date().toISOString();
}

export function criar(categoria: CategoriaSlug, nome: string, texto: string): boolean {
  const c = lerCamada();
  const novo: Snippet = {
    id: `novo:${categoria}:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
    categoria,
    nome: nome.trim(),
    texto: texto.trim(),
    ordem: 0,
    atualizadoEm: agora(),
  };
  return gravarCamada({ ...c, novos: [novo, ...c.novos] });
}

export function editar(id: string, nome: string, texto: string): boolean {
  const c = lerCamada();

  if (ehNovo(id)) {
    return gravarCamada({
      ...c,
      novos: c.novos.map((s) =>
        s.id === id ? { ...s, nome: nome.trim(), texto: texto.trim(), atualizadoEm: agora() } : s,
      ),
    });
  }

  return gravarCamada({
    ...c,
    editados: { ...c.editados, [id]: { nome: nome.trim(), texto: texto.trim(), em: agora() } },
  });
}

export function remover(id: string): boolean {
  const c = lerCamada();

  if (ehNovo(id)) {
    return gravarCamada({ ...c, novos: c.novos.filter((s) => s.id !== id) });
  }

  // Original: esconde e descarta o override, para que restaurar depois
  // devolva o texto do PS.py, não a última edição.
  const editados = { ...c.editados };
  delete editados[id];
  return gravarCamada({
    ...c,
    editados,
    removidos: c.removidos.includes(id) ? c.removidos : [...c.removidos, id],
  });
}

/** Desfaz a edição de um texto original, devolvendo o conteúdo do PS.py. */
export function restaurar(id: string): boolean {
  const c = lerCamada();
  const editados = { ...c.editados };
  delete editados[id];
  return gravarCamada({
    ...c,
    editados,
    removidos: c.removidos.filter((r) => r !== id),
  });
}

// ------------------------------------------------------------ backup

export function exportar(): string {
  return JSON.stringify({ app: "ps-japa", exportadoEm: agora(), ...lerCamada() }, null, 2);
}

export interface ResultadoImportacao {
  ok: boolean;
  mensagem: string;
}

export function importar(json: string): ResultadoImportacao {
  let lido: Partial<Camada> & { app?: string };
  try {
    lido = JSON.parse(json);
  } catch {
    return { ok: false, mensagem: "Arquivo não é um JSON válido." };
  }

  if (lido.app !== "ps-japa") {
    return { ok: false, mensagem: "Este arquivo não é um backup do PS JAPA." };
  }

  const novos = Array.isArray(lido.novos) ? lido.novos.filter(ehSnippet) : [];
  const gravou = gravarCamada({
    versao: 1,
    editados: typeof lido.editados === "object" && lido.editados ? lido.editados : {},
    removidos: Array.isArray(lido.removidos) ? lido.removidos.filter((r) => typeof r === "string") : [],
    novos,
  });

  return gravou
    ? { ok: true, mensagem: `Backup restaurado: ${novos.length} texto(s) seu(s).` }
    : { ok: false, mensagem: "Não foi possível gravar neste navegador." };
}

function ehSnippet(v: unknown): v is Snippet {
  const s = v as Snippet;
  return (
    !!s &&
    typeof s.id === "string" &&
    typeof s.nome === "string" &&
    typeof s.texto === "string" &&
    typeof s.categoria === "string"
  );
}

export interface Resumo {
  novos: number;
  editados: number;
  removidos: number;
}

/** Só a base, sem camada: é o que o HTML do servidor mostra. */
const RESUMO_VAZIO: Resumo = Object.freeze({ novos: 0, editados: 0, removidos: 0 });

/**
 * Quanto da camada existe. Memoizado porque alimenta um useSyncExternalStore,
 * que compara por identidade — um objeto novo a cada chamada faria o React
 * redesenhar para sempre.
 */
export function resumoCamada(): Resumo {
  if (resumoCache) return resumoCache;
  const c = lerCamada();
  return (resumoCache = {
    novos: c.novos.length,
    editados: Object.keys(c.editados).length,
    removidos: c.removidos.length,
  });
}

export function resumoNoServidor(): Resumo {
  return RESUMO_VAZIO;
}

export function limparTudo(): boolean {
  return gravarCamada(VAZIA);
}

// ------------------------------------------------------- notificação

const ouvintes = new Set<() => void>();

function avisar() {
  for (const fn of ouvintes) fn();
}

export function inscrever(fn: () => void): () => void {
  ouvintes.add(fn);

  // Outra aba do mesmo app editou: invalida o cache e redesenha.
  const onStorage = (e: StorageEvent) => {
    if (e.key === CHAVE) {
      camadaCache = null;
      listaCache = null;
      resumoCache = null;
      fn();
    }
  };
  window.addEventListener("storage", onStorage);

  return () => {
    ouvintes.delete(fn);
    window.removeEventListener("storage", onStorage);
  };
}
