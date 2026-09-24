/**
 * Os 311 textos do PS.py são a base embutida no bundle — sempre presentes,
 * sempre offline. O que você cria ou edita fica por cima, numa camada
 * guardada no navegador, e é isso que este arquivo administra.
 *
 * A base nunca é alterada: editar um texto original grava um override, e
 * "restaurar" é apagar esse override. Apagar um original grava uma lápide,
 * não remove nada — por isso dá para voltar atrás em qualquer momento.
 *
 * A camada mora SÓ no Supabase. Nada é gravado nesta máquina: o app roda
 * também em computador de uso compartilhado, e ali qualquer coisa deixada no
 * disco é rastro para quem sentar depois. Em memória existe um cache de
 * leitura que vive enquanto a aba estiver aberta e morre com ela.
 *
 * Consequência que o resto do código precisa respeitar: a camada começa
 * VAZIA e só existe depois que `sincronizarTextos` responde. Enquanto isso o
 * estado é "carregando", não "você não tem nada" — a diferença entre as duas
 * coisas é a diferença entre esperar e achar que seus textos sumiram.
 */

import { CATEGORIAS, SNIPPETS } from "@/data/snippets";
import { comEspera, gravarNaNuvem, lerDaNuvem } from "./nuvem";
import type { CategoriaSlug, Snippet } from "./types";

interface Camada {
  versao: 1;
  /** id do texto original -> conteúdo que o substitui */
  editados: Record<string, { nome: string; texto: string; em: string }>;
  /** ids de textos originais apagados — lápides, porque a base não muda */
  removidos: string[];
  /** textos criados por você */
  novos: Snippet[];
}

const VAZIA: Camada = { versao: 1, editados: {}, removidos: [], novos: [] };

// ---------------------------------------------------------------- leitura

let camadaCache: Camada | null = null;
let listaCache: Snippet[] | null = null;
let resumoCache: Resumo | null = null;

/** Só memória: enquanto a nuvem não respondeu, a camada é a vazia. */
function lerCamada(): Camada {
  return camadaCache ?? VAZIA;
}

/** Normaliza o que veio do banco — o conteúdo é dado, não contrato. */
function comoCamada(bruto: Partial<Camada> | null | undefined): Camada {
  if (!bruto) return VAZIA;
  return {
    versao: 1,
    editados: bruto.editados ?? {},
    removidos: Array.isArray(bruto.removidos) ? bruto.removidos : [],
    novos: Array.isArray(bruto.novos) ? bruto.novos : [],
  };
}

const empurrar = comEspera<Camada>("textos");

/**
 * Aplica na memória e empurra para a nuvem.
 *
 * Devolve true porque a edição já vale na tela; se a gravação no banco não
 * chegar, quem avisa é o indicador de nuvem na moldura — aqui não dá para
 * saber ainda, a escrita é agrupada e sai depois.
 */
function gravarCamada(c: Camada): boolean {
  camadaCache = c;
  listaCache = null;
  resumoCache = null;
  // A nuvem recebe a camada inteira; é pequena e evita lógica de diferença.
  empurrar(() => c);
  avisar();
  return true;
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
 *
 * Prescrições entram com as receitas: começam vazias e crescem com o que
 * você escreve, e numa lista que só cresce o gesto é procurar pelo nome.
 */
const ALFABETICAS = new Set<CategoriaSlug>([
  "anamnese",
  "cid",
  "receitas",
  "prescricoes",
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
  // não é alfabética. Procurar por nome é o gesto, e para isso o texto ser
  // seu ou ter vindo do PS.py não muda nada.
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

  // Original: vira lápide e descarta o override, para que voltar ao original
  // depois devolva o texto do PS.py, não a última edição.
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

/** Como está a carga da camada vinda do banco. */
export type EstadoTextos = "carregando" | "pronto" | "erro";

let estadoTextos: EstadoTextos = "carregando";
let motivoErro = "";

export function estadoDosTextos(): EstadoTextos {
  return estadoTextos;
}
export function estadoNoServidor(): EstadoTextos {
  return "carregando";
}
export function motivoDoErro(): string {
  return motivoErro;
}

let jaSincronizou = false;

/**
 * Traz a camada do banco. É a única fonte: não há cópia nesta máquina para
 * cair de volta, então falhar aqui é um estado de erro visível, não um
 * silêncio que passa por "você não tem textos seus".
 */
export async function sincronizarTextos(): Promise<void> {
  if (jaSincronizou) return;
  jaSincronizou = true;

  try {
    const resposta = await lerDaNuvem<Partial<Camada>>("textos");
    camadaCache = comoCamada(resposta.conteudo);
    listaCache = null;
    resumoCache = null;
    estadoTextos = "pronto";
  } catch (e) {
    estadoTextos = "erro";
    motivoErro = e instanceof Error ? e.message : "Não foi possível falar com a nuvem.";
  }
  avisar();
}

/** Tenta de novo depois de um erro — o botão da faixa de aviso chama isto. */
export async function recarregarTextos(): Promise<void> {
  jaSincronizou = false;
  estadoTextos = "carregando";
  avisar();
  await sincronizarTextos();
}

// ------------------------------------------------------- notificação

const ouvintes = new Set<() => void>();

function avisar() {
  for (const fn of ouvintes) fn();
}

/**
 * O evento "storage", que antes avisava as outras abas, morreu junto com o
 * localStorage. Cada aba agora tem a sua própria cópia em memória e as duas
 * falam com o banco; a última escrita vence, como já era a regra.
 */
export function inscrever(fn: () => void): () => void {
  ouvintes.add(fn);
  return () => {
    ouvintes.delete(fn);
  };
}
