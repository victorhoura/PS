/**
 * Os 311 textos do PS.py são a base embutida no bundle — sempre presentes,
 * sempre offline. O que você cria ou edita fica por cima, numa camada
 * guardada no navegador, e é isso que este arquivo administra.
 *
 * A base nunca é alterada: editar um texto original grava um override, e
 * "restaurar" é apagar esse override. Apagar um original grava uma lápide,
 * não remove nada — por isso dá para voltar atrás em qualquer momento.
 *
 * A camada é espelhada na nuvem: o localStorage passa a ser cache de leitura
 * rápida e de funcionamento offline, e o Supabase é onde o dado realmente
 * mora. Abrir o app em outro computador traz tudo junto.
 */

import { CATEGORIAS, SNIPPETS } from "@/data/snippets";
import { comEspera, gravarNaNuvem, lerDaNuvem } from "./nuvem";
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

const empurrar = comEspera<Camada>("textos");

function gravarCamada(c: Camada): boolean {
  camadaCache = c;
  listaCache = null;
  resumoCache = null;
  // A nuvem recebe a camada inteira; é pequena e evita lógica de diferença.
  empurrar(() => c);
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

/**
 * Categorias que a lista desenha em ordem alfabética.
 *
 * São as grandes, onde o que importa é achar o nome: em 110 fármacos a ordem
 * em que os textos foram escritos no PS.py não ajuda ninguém. As outras
 * quatro ficam como estão porque ali a ordem quer dizer alguma coisa —
 * condutas, reavaliação e encaminhamento seguem a sequência do atendimento.
 */
const ALFABETICAS = new Set<CategoriaSlug>([
  "anamnese",
  "cid",
  "receitas",
  "farmacos",
  "notas",
]);

/**
 * Colação pt-BR, não comparação de bytes: assim "ÓRQUITE" cai junto do O e
 * não no fim da lista, e "CEFALEIA" vem antes de "CERVICALGIA".
 */
const COLACAO = new Intl.Collator("pt-BR", { numeric: true });

export function daCategoria(slug: CategoriaSlug, lista = todos()): Snippet[] {
  // filter já devolve um array novo, então ordenar aqui não mexe no cache.
  const itens = lista.filter((s) => s.categoria === slug);
  if (!ALFABETICAS.has(slug)) return itens;
  // O que você criou entra na ordem junto com o resto: meia lista alfabética
  // não é alfabética, e o ponto colorido ao lado do nome já diz o que é seu.
  return itens.sort((a, b) => COLACAO.compare(a.nome, b.nome));
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

// ------------------------------------------------------------ nuvem

let jaSincronizou = false;

/**
 * Puxa a camada da nuvem uma vez por carregamento. A nuvem ganha da cópia
 * local: é o que faz o app "já estar lá" em outro computador. Se a nuvem
 * estiver vazia e existir algo local, sobe o local — assim a primeira vez
 * depois de ligar a sincronização não perde nada.
 */
export async function sincronizarTextos(): Promise<void> {
  if (jaSincronizou) return;
  jaSincronizou = true;

  const resposta = await lerDaNuvem<Camada>("textos");
  if (!resposta) return;

  if (resposta.conteudo) {
    const vinda = resposta.conteudo;
    camadaCache = {
      versao: 1,
      editados: vinda.editados ?? {},
      removidos: Array.isArray(vinda.removidos) ? vinda.removidos : [],
      novos: Array.isArray(vinda.novos) ? vinda.novos : [],
    };
    listaCache = null;
    resumoCache = null;
    try {
      localStorage.setItem(CHAVE, JSON.stringify(camadaCache));
    } catch {
      // cache local indisponível: a nuvem segue sendo a fonte
    }
    avisar();
    return;
  }

  const local = lerCamada();
  if (local.novos.length || local.removidos.length || Object.keys(local.editados).length) {
    void gravarNaNuvem("textos", local);
  }
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
