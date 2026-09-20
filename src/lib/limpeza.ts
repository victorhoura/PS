/**
 * A virada do app de "grava na máquina" para "só nuvem".
 *
 * O app é usado também em computador de uso compartilhado, onde tudo que fica
 * no disco é rastro para quem sentar depois. Então nada mais é gravado
 * localmente — mas as máquinas onde ele já rodou têm dados lá, e esses dados
 * podem ser a única cópia se a nuvem ainda estava vazia.
 *
 * Por isso a limpeza é feita nesta ordem e só nesta ordem:
 *   1. o que existe local e não existe na nuvem SOBE;
 *   2. só depois de confirmado é que o local é apagado.
 *
 * Se a nuvem estiver fora, nada é apagado. Perder a edição de um plantão por
 * causa de um Wi-Fi ruim seria um estrago maior do que o rastro.
 */

import { gravarNaNuvem, lerDaNuvem, type ChaveNuvem } from "./nuvem";

const PREFIXO = "ps-japa:";

const TEXTOS = "ps-japa:textos:v1";
const COFRE = "ps-japa:cofre:v1";
const TEMA = "ps-japa:tema";
const CONTADOR = "ps-japa:contador";
const MEDICO = "ps-japa:apac:medico";
const PADROES_SADT = "ps-japa:sadt:padroes";

function ler(chave: string): string | null {
  try {
    return localStorage.getItem(chave);
  } catch {
    return null;
  }
}

/** Sobe o valor local se — e só se — a nuvem ainda não tiver nada naquela chave. */
async function subirSeNuvemVazia(chave: ChaveNuvem, conteudo: unknown): Promise<boolean> {
  const atual = await lerDaNuvem<unknown>(chave);
  if (atual.conteudo !== null && atual.conteudo !== undefined) return true;
  return gravarNaNuvem(chave, conteudo);
}

function comoJson<T>(bruto: string | null): T | null {
  if (!bruto) return null;
  try {
    return JSON.parse(bruto) as T;
  } catch {
    return null;
  }
}

/** Apaga tudo que o app já gravou nesta máquina, inclusive chaves antigas. */
export function apagarTudoDaMaquina(): void {
  try {
    const alvos: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(PREFIXO)) alvos.push(k);
    }
    for (const k of alvos) localStorage.removeItem(k);
  } catch {
    // Armazenamento bloqueado: não havia o que apagar.
  }

  try {
    sessionStorage.clear();
  } catch {
    // idem
  }

  // Os caches do service worker antigo guardavam as páginas já autenticadas.
  void caches?.keys().then((nomes) => Promise.all(nomes.map((n) => caches.delete(n)))).catch(() => {});
}

/**
 * Roda uma vez por carregamento, antes de a tela pedir dado à nuvem.
 * Devolve o que foi migrado, para a tela poder avisar.
 */
export async function migrarEApagarLocal(): Promise<{ migrou: string[]; falhou: string[] }> {
  const migrou: string[] = [];
  const falhou: string[] = [];

  const pendentes: [ChaveNuvem, unknown, string][] = [];

  const textos = comoJson<{ novos?: unknown[]; removidos?: unknown[]; editados?: object }>(ler(TEXTOS));
  const temTextos =
    textos &&
    ((textos.novos?.length ?? 0) > 0 ||
      (textos.removidos?.length ?? 0) > 0 ||
      Object.keys(textos.editados ?? {}).length > 0);
  if (temTextos) pendentes.push(["textos", textos, "textos"]);

  // O cofre é uma string (o blob cifrado), não JSON.
  const cofre = ler(COFRE);
  if (cofre) pendentes.push(["cofre", cofre, "cofre"]);

  const contador = ler(CONTADOR);
  if (contador && Number(contador) > 0) pendentes.push(["contador", Number(contador), "contador"]);

  const prefs = {
    tema: ler(TEMA) ?? undefined,
    medico: ler(MEDICO) ?? undefined,
    sadt: comoJson<object>(ler(PADROES_SADT)) ?? undefined,
  };
  if (prefs.tema || prefs.medico || prefs.sadt) pendentes.push(["preferencias", prefs, "preferências"]);

  for (const [chave, conteudo, nome] of pendentes) {
    try {
      if (await subirSeNuvemVazia(chave, conteudo)) migrou.push(nome);
      else falhou.push(nome);
    } catch {
      falhou.push(nome);
    }
  }

  // A regra: só apaga quando não sobrou nada por subir.
  if (!falhou.length) apagarTudoDaMaquina();

  return { migrou, falhou };
}
