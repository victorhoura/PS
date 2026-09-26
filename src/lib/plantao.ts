/**
 * Divisão de plantão: o tempo que resta até o fim do plantão noturno,
 * repartido em turnos iguais entre os plantonistas.
 *
 * A conta é em minutos desde a meia-noite. Quando o fim vem antes do início
 * no relógio (abriu às 21:40, termina às 07:00), o fim é do dia seguinte:
 * soma-se um dia inteiro.
 *
 * Os turnos são contíguos e o último termina exatamente no fim. Cada divisa
 * é arredondada para o minuto, então turnos podem diferir em 1 minuto quando
 * a conta não é exata — melhor que um último turno que "sobra" ou "falta".
 */

import { normalizar } from "./clipboard";

export const FIM_PADRAO = "07:00";
export const MIN_PLANTONISTAS = 2;
export const MAX_PLANTONISTAS = 8;
/** Os colegas de plantão, não uma lista telefônica. */
export const MAX_CADASTRADOS = 60;
/** Cabe na linha da lista e na imagem sem virar só reticências. */
export const MAX_NOME = 40;

const DIA = 24 * 60;

export interface Turno {
  /** 1, 2, 3… — a ordem em que cada um fica de plantão. */
  ordem: number;
  nome: string;
  inicio: string;
  fim: string;
  minutos: number;
}

export interface Divisao {
  inicio: string;
  fim: string;
  /** Tempo total dividido, em minutos. */
  total: number;
  turnos: Turno[];
}

/** "21:40" → 1300. Devolve null para o que não for hora válida. */
export function paraMinutos(hora: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hora.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** 1300 → "21:40"; passa da meia-noite sem reclamar (1500 → "01:00"). */
export function paraHora(minutos: number): string {
  const m = ((minutos % DIA) + DIA) % DIA;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** 188 → "3h08"; 45 → "45min"; 120 → "2h". */
export function duracao(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (!h) return `${m}min`;
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

/** Hora de agora, "HH:MM". */
export function horaAtual(agora = new Date()): string {
  return paraHora(agora.getHours() * 60 + agora.getMinutes());
}

/** Nome vazio vira "PLANTONISTA 2"; o resto, em maiúsculas como no app. */
export function nomeDoPlantonista(nome: string, indice: number): string {
  return nome.trim().toUpperCase() || `PLANTONISTA ${indice + 1}`;
}

/**
 * Divide de `inicio` até `fim` entre os nomes dados, na ordem da lista.
 * Devolve null quando a hora é inválida, quando início e fim coincidem ou
 * quando não há ao menos um plantonista.
 */
export function dividirPlantao(inicio: string, fim: string, nomes: string[]): Divisao | null {
  const a = paraMinutos(inicio);
  let b = paraMinutos(fim);
  if (a === null || b === null || !nomes.length) return null;
  // Fim antes do início no relógio = dia seguinte. Iguais não é um plantão
  // de 24h, é engano de digitação: não divide.
  if (b < a) b += DIA;
  const total = b - a;
  if (total === 0) return null;

  const n = nomes.length;
  const divisas = Array.from({ length: n + 1 }, (_, i) => a + Math.round((i * total) / n));
  const turnos = nomes.map((nome, i) => ({
    ordem: i + 1,
    nome: nomeDoPlantonista(nome, i),
    inicio: paraHora(divisas[i]),
    fim: paraHora(divisas[i + 1]),
    minutos: divisas[i + 1] - divisas[i],
  }));
  return { inicio: paraHora(a), fim: paraHora(b), total, turnos };
}

// ------------------------------------------------------------ cadastrados

/*
 * Plantonistas cadastrados: os colegas de sempre, para escolher pelo + de
 * cada nome em vez de digitar toda noite. Moram nas preferências, na nuvem.
 *
 * Sempre em maiúsculas, sem espaço sobrando, sem repetição e em ordem
 * alfabética — a ordem em que se procura um nome numa lista. "João" e
 * "JOAO" são a mesma pessoa: acento e caixa não fazem outro cadastro.
 */

/** "  maria   eduarda " → "MARIA EDUARDA". */
export function nomeLimpo(nome: string): string {
  return nome.replace(/\s+/g, " ").trim().toUpperCase();
}

/** Mesma pessoa, com ou sem acento, em qualquer caixa. */
export function mesmoNome(a: string, b: string): boolean {
  return normalizar(nomeLimpo(a)) === normalizar(nomeLimpo(b));
}

function arrumar(nomes: string[]): string[] {
  const unicos: string[] = [];
  for (const nome of nomes) {
    const n = nomeLimpo(nome).slice(0, MAX_NOME).trim();
    if (n && !unicos.some((u) => mesmoNome(u, n))) unicos.push(n);
  }
  return unicos.sort((a, b) => a.localeCompare(b, "pt-BR")).slice(0, MAX_CADASTRADOS);
}

/** O que veio da nuvem, conferido: só nomes, limpos, sem repetição, em ordem. */
export function lerCadastrados(valor: unknown): string[] {
  if (!Array.isArray(valor)) return [];
  return arrumar(valor.filter((v): v is string => typeof v === "string"));
}

/** Cadastra um nome: devolve a lista nova, ou por que ele não entrou. */
export function cadastrar(lista: string[], nome: string): { lista: string[] } | { erro: string } {
  const n = nomeLimpo(nome);
  if (!n) return { erro: "Escreva o nome do plantonista." };
  const igual = lista.find((x) => mesmoNome(x, n));
  if (igual) return { erro: `${igual} já está cadastrado.` };
  if (lista.length >= MAX_CADASTRADOS) return { erro: `O cadastro vai até ${MAX_CADASTRADOS} nomes.` };
  return { lista: arrumar([...lista, n]) };
}

export function descadastrar(lista: string[], nome: string): string[] {
  return lista.filter((x) => !mesmoNome(x, nome));
}

/** Os nomes digitados na divisão que ainda não estão cadastrados. */
export function foraDoCadastro(nomes: string[], lista: string[]): string[] {
  const fora: string[] = [];
  for (const nome of nomes) {
    const n = nomeLimpo(nome).slice(0, MAX_NOME).trim();
    if (n && !lista.some((x) => mesmoNome(x, n)) && !fora.some((x) => mesmoNome(x, n))) fora.push(n);
  }
  return fora;
}

/** O texto que vai para a área de transferência — pronto para o grupo. */
export function textoDaDivisao(d: Divisao): string {
  return [
    `DIVISÃO DE PLANTÃO — ${d.inicio} ÀS ${d.fim} (${duracao(d.total)})`,
    ...d.turnos.map((t) => `${t.ordem}. ${t.nome} — ${t.inicio} ÀS ${t.fim} (${duracao(t.minutos)})`),
  ].join("\n");
}
