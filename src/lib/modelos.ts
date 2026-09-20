/**
 * Modelos prontos da APAC e da SADT, editáveis.
 *
 * Mesmo desenho dos 311 textos: uma base que vem dentro do app e uma camada
 * por cima com o que você criou, editou ou escondeu. A base nunca é alterada,
 * então "restaurar" devolve o texto original do APAC.py a qualquer momento.
 *
 * A camada mora no Supabase, como todo o resto — nada é gravado na máquina.
 *
 * A APAC começa com os 10 modelos do programa em Python. A SADT começa vazia:
 * o programa original não tinha modelos de requisição, e inventar conteúdo
 * clínico não é papel deste arquivo.
 */

import { MODELOS_APAC, type ModeloApac } from "@/data/apac-modelos";
import { comEspera, lerDaNuvem } from "./nuvem";

/** Campos de um modelo de SADT: só o que se repete entre pacientes. */
export interface ModeloSadt {
  nome: string;
  hd: string;
  cid: string;
  historia: string;
  procedimentos: string[];
}

/** Um modelo na lista, já com de onde ele veio. */
export type ComId<T> = T & { id: string; daBase: boolean };

export type Tipo = "apac" | "sadt";

interface Camada<T> {
  /** id do modelo da base -> o que o substitui */
  editados: Record<string, T>;
  /** ids de modelos da base escondidos */
  removidos: string[];
  /** modelos criados por você */
  novos: ComId<T>[];
}

interface Guardado {
  versao: 1;
  apac: Camada<ModeloApac>;
  sadt: Camada<ModeloSadt>;
}

const vazia = <T,>(): Camada<T> => ({ editados: {}, removidos: [], novos: [] });
const VAZIO: Guardado = { versao: 1, apac: vazia(), sadt: vazia() };

/**
 * O id de um modelo da base vem do nome, que é fixo — o arquivo é gerado do
 * APAC.py e não muda. Assim editar um modelo da base continua apontando para
 * ele mesmo depois de você renomeá-lo.
 */
export function idDaBase(nome: string): string {
  return `base:${nome}`;
}

export function ehNovo(id: string): boolean {
  return id.startsWith("novo:");
}

function novoId(): string {
  return `novo:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

// ---------------------------------------------------------------- leitura

let cache: Guardado = VAZIO;

/**
 * As listas prontas ficam guardadas porque `useSyncExternalStore` compara o
 * snapshot por identidade: devolver um array novo a cada chamada faz o React
 * entrar em laço infinito e a tela nem renderiza. São invalidadas junto com
 * qualquer escrita.
 */
let listaApac: ComId<ModeloApac>[] | null = null;
let listaSadt: ComId<ModeloSadt>[] | null = null;

const ouvintes = new Set<() => void>();
const empurrar = comEspera<Guardado>("modelos");

function avisar() {
  listaApac = null;
  listaSadt = null;
  for (const fn of ouvintes) fn();
}

export function inscreverModelos(fn: () => void): () => void {
  ouvintes.add(fn);
  return () => ouvintes.delete(fn);
}

/** Normaliza o que veio do banco: é dado, não contrato. */
function comoCamada<T>(bruto: Partial<Camada<T>> | undefined): Camada<T> {
  return {
    editados: bruto?.editados ?? {},
    removidos: Array.isArray(bruto?.removidos) ? bruto.removidos : [],
    novos: Array.isArray(bruto?.novos) ? bruto.novos : [],
  };
}

export function modelosApac(): ComId<ModeloApac>[] {
  if (listaApac) return listaApac;
  const c = cache.apac;
  const escondidos = new Set(c.removidos);

  const base = MODELOS_APAC.filter((m) => !escondidos.has(idDaBase(m.nome))).map((m) => {
    const id = idDaBase(m.nome);
    const ed = c.editados[id];
    return { ...(ed ?? m), id, daBase: true };
  });

  return (listaApac = [...c.novos, ...base]);
}

export function modelosSadt(): ComId<ModeloSadt>[] {
  // Sem base: tudo aqui é seu.
  return (listaSadt ??= cache.sadt.novos);
}

/**
 * Snapshot do servidor: só a base, para a hidratação não divergir. Também
 * precisa ser o MESMO objeto sempre, pelo mesmo motivo das listas acima.
 */
const APAC_SERVIDOR: ComId<ModeloApac>[] = MODELOS_APAC.map((m) => ({
  ...m,
  id: idDaBase(m.nome),
  daBase: true,
}));
const SADT_SERVIDOR: ComId<ModeloSadt>[] = [];

export function apacNoServidor(): ComId<ModeloApac>[] {
  return APAC_SERVIDOR;
}
export function sadtNoServidor(): ComId<ModeloSadt>[] {
  return SADT_SERVIDOR;
}

/** Um modelo da base foi editado por você? */
export function foiEditado(tipo: Tipo, id: string): boolean {
  return !ehNovo(id) && id in cache[tipo].editados;
}

/** Quantos modelos da base você escondeu — o botão de restaurar usa isto. */
export function escondidos(tipo: Tipo): number {
  return cache[tipo].removidos.length;
}

// ---------------------------------------------------------------- escrita

function gravar(novo: Guardado) {
  cache = novo;
  empurrar(() => cache);
  avisar();
}

export function criarApac(m: ModeloApac): void {
  gravar({
    ...cache,
    apac: { ...cache.apac, novos: [{ ...m, id: novoId(), daBase: false }, ...cache.apac.novos] },
  });
}

export function criarSadt(m: ModeloSadt): void {
  gravar({
    ...cache,
    sadt: { ...cache.sadt, novos: [{ ...m, id: novoId(), daBase: false }, ...cache.sadt.novos] },
  });
}

export function editarApac(id: string, m: ModeloApac): void {
  const c = cache.apac;
  if (ehNovo(id)) {
    gravar({
      ...cache,
      apac: { ...c, novos: c.novos.map((x) => (x.id === id ? { ...m, id, daBase: false } : x)) },
    });
    return;
  }
  gravar({ ...cache, apac: { ...c, editados: { ...c.editados, [id]: m } } });
}

export function editarSadt(id: string, m: ModeloSadt): void {
  const c = cache.sadt;
  gravar({
    ...cache,
    sadt: { ...c, novos: c.novos.map((x) => (x.id === id ? { ...m, id, daBase: false } : x)) },
  });
}

export function remover(tipo: Tipo, id: string): void {
  const c = cache[tipo];

  if (ehNovo(id)) {
    gravar({ ...cache, [tipo]: { ...c, novos: c.novos.filter((x) => x.id !== id) } });
    return;
  }

  // Da base: esconde e descarta a edição, para restaurar devolver o original
  // do APAC.py e não a sua última versão.
  const editados = { ...c.editados };
  delete editados[id];
  gravar({
    ...cache,
    [tipo]: {
      ...c,
      editados,
      removidos: c.removidos.includes(id) ? c.removidos : [...c.removidos, id],
    },
  });
}

/** Devolve todos os modelos da base que foram escondidos ou editados. */
export function restaurarBase(tipo: Tipo): void {
  gravar({ ...cache, [tipo]: { ...cache[tipo], editados: {}, removidos: [] } });
}

// ---------------------------------------------------------------- nuvem

export type EstadoModelos = "carregando" | "pronto" | "erro";

let estado: EstadoModelos = "carregando";
let jaSincronizou = false;

export function estadoDosModelos(): EstadoModelos {
  return estado;
}
export function estadoNoServidor(): EstadoModelos {
  return "carregando";
}

export async function sincronizarModelos(): Promise<void> {
  if (jaSincronizou) return;
  jaSincronizou = true;

  try {
    const r = await lerDaNuvem<Partial<Guardado>>("modelos");
    cache = {
      versao: 1,
      apac: comoCamada<ModeloApac>(r.conteudo?.apac),
      sadt: comoCamada<ModeloSadt>(r.conteudo?.sadt),
    };
    estado = "pronto";
    listaApac = null;
    listaSadt = null;
  } catch {
    // A base continua servindo; o que não aparece é a sua camada.
    estado = "erro";
  }
  avisar();
}
