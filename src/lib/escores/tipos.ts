/**
 * Escores clínicos como DADOS, não como telas.
 *
 * No PS.py cada escore era uma classe Toplevel de ~150 linhas com o mesmo
 * esqueleto repetido. Aqui cada um é um objeto: critérios, pontuação e o
 * texto de conduta. Um componente só desenha todos, e acrescentar um escore
 * novo é acrescentar um objeto.
 *
 * Nem tudo aqui é escore somatório. Classificação (Hinchey, Atlanta) é um
 * grupo de opções em que a nota é a própria classe; critério diagnóstico
 * (Tokyo, Charcot) é um conjunto de marcações que `laudo` lê para decidir
 * suspeito/definitivo; e calculadora (sódio, potássio) não tem critério
 * nenhum, só campos numéricos. O que une os quatro é a forma: você preenche
 * de um lado e sai texto pronto do outro.
 */

export type Resposta = Record<string, number>;

/** Campo numérico não preenchido é `null`, que é diferente de zero. */
export type Valores = Record<string, number | null>;

export interface Criterio {
  id: string;
  label: string;
  /** Checkbox: pontos quando marcado. Pode ser negativo. */
  pontos?: number;
  /** Radio: lista de opções mutuamente exclusivas. */
  opcoes?: { label: string; pontos: number }[];
  /** Valor inicial de um radio. */
  padrao?: number;
}

export interface Grupo {
  titulo: string;
  criterios: Criterio[];
}

/**
 * Entrada numérica: peso, sódio, idade.
 *
 * Existe porque há contas que nenhuma marcação resolve — o volume de NaCl 3%
 * depende do peso do paciente, não de uma caixa marcada.
 */
export interface Campo {
  id: string;
  label: string;
  unidade?: string;
  /** Sugestão de passo do teclado numérico; não valida nada. */
  passo?: number;
}

export interface Calculadora {
  slug: string;
  nome: string;
  subtitulo: string;
  /** Vazio numa calculadora que só tem campos numéricos. */
  grupos: Grupo[];
  campos?: Campo[];
  /** Texto final que vai para a área de transferência. */
  laudo: (pontos: number, r: Resposta, v: Valores) => string;
  /** Resumo curto mostrado ao vivo no topo. */
  resumo: (pontos: number, r: Resposta, v: Valores) => string;
}

/** Junta as linhas do laudo e joga tudo para maiúscula, como no PS.py. */
export const cx = (linhas: string[]) => linhas.join("\n").toUpperCase();

/** Arredonda para inteiro na hora de escrever volume e dose. */
export const n0 = (x: number) => Math.round(x).toLocaleString("pt-BR");

/** Uma casa decimal, com vírgula — é assim que o laudo brasileiro escreve. */
export const n1 = (x: number) => x.toFixed(1).replace(".", ",");
