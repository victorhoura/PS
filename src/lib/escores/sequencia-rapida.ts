/**
 * Sequência rápida de intubação: dose de cada droga pelo peso.
 *
 * Funciona como a calculadora do Whitebook que serviu de modelo: escolhe-se
 * adulto ou criança, digita-se o peso, e sai cada droga em mg e em mL da
 * apresentação usual, com as alternativas de cada etapa lado a lado — quem
 * escolhe entre etomidato e cetamina é você, à beira do leito, e não a
 * calculadora.
 *
 * O que muda em relação ao modelo, e por quê:
 * - Sem alfentanil e remifentanil: são drogas de centro cirúrgico, e o
 *   modelo dava o alfentanil a "55,4 mcg/mL", concentração que não bate com
 *   a ampola vendida aqui (0,544 mg/mL do cloridrato = 0,5 mg/mL de
 *   alfentanil) — o volume calculado sairia de nove a dez vezes maior.
 * - Rocurônio sem o "somente se houver sugamadex": ter sugamadex à mão é
 *   desejável, mas o rocurônio é bloqueador de primeira linha com ou sem ele.
 * - Lidocaína como opcional, também na criança: o modelo mandava usá-la
 *   "sempre" na criança, e o benefício clínico não foi demonstrado.
 * - Pré-oxigenação com VNI (PREOXI, NEJM 2024) e ventilação com bolsa entre a
 *   indução e a laringoscopia (PreVent, NEJM 2019), em vez de só "O2 100%
 *   10–12 L/min".
 * - Choque troca as doses de indução do adulto pelas reduzidas da tabela do
 *   RSI trial (protocolo em CHEST Crit Care 2025; resultado no NEJM 2025):
 *   etomidato 0,2 e cetamina 1 mg/kg. O estudo deixava a dose ao médico; a
 *   tabela dava plena, intermediária e reduzida.
 * - Atropina da criança sem dose mínima (AHA 2015): o piso antigo de 0,1 mg
 *   caiu quando as séries de casos mostraram 0,02 mg/kg eficaz sem ele.
 * - Contraindicações da succinilcolina, reversão com sugamadex, peso de dose
 *   no obeso e sedoanalgesia depois do rocurônio — o que falta num plantão.
 */

import type { Calculadora, Resposta, Valores } from "./tipos";
import { cx } from "./tipos";

// ------------------------------------------------------------ formato

/** Menos casas quanto maior o número: 0,36 · 5,4 · 21 · 1.120. */
function numero(x: number, casasAbaixoDe1 = 2): string {
  const casas = x < 1 ? casasAbaixoDe1 : x < 100 ? 1 : 0;
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: casas }).format(x);
}

/** Volume: duas casas abaixo de 1 mL, uma acima. */
function mililitros(x: number): string {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: x < 1 ? 2 : 1 }).format(x);
}

const faixa = (a: string, b: string) => (a === b ? a : `${a}–${b}`);

// ------------------------------------------------------------ drogas

interface Droga {
  nome: string;
  /** Como a ampola é escrita no laudo: "2 MG/ML". */
  apresentacao: string;
  /** Concentração na mesma unidade da dose (mg/mL ou mcg/mL). */
  conc: number;
  unidade: "MG" | "MCG";
  /** Dose por kg; `ate` quando é faixa. */
  porKg: number;
  ate?: number;
  /** Dose absoluta máxima, na mesma unidade. */
  teto?: number;
  /** Segunda apresentação comum, para dar o volume nas duas. */
  outra?: { apresentacao: string; conc: number };
  via: string;
  nota?: string;
}

function linha(d: Droga, peso: number): string {
  const limitar = (x: number) => (d.teto !== undefined ? Math.min(x, d.teto) : x);
  const de = limitar(d.porKg * peso);
  const ate = limitar((d.ate ?? d.porKg) * peso);

  const dose = faixa(numero(de), numero(ate));
  const volume = (conc: number) => faixa(mililitros(de / conc), mililitros(ate / conc));
  const porKg = faixa(numero(d.porKg), numero(d.ate ?? d.porKg));
  const teto = d.teto !== undefined ? `; MÁX. ${numero(d.teto)} ${d.unidade}` : "";
  const outra = d.outra ? ` | ${d.outra.apresentacao}: ${volume(d.outra.conc)} ML` : "";

  return (
    `- ${d.nome} ${d.apresentacao}: ${dose} ${d.unidade} = ${volume(d.conc)} ML${outra} ` +
    `(${porKg} ${d.unidade}/KG${teto}) ${d.via}.` +
    (d.nota ? ` ${d.nota}` : "")
  );
}

const SUCCINILCOLINA_CI =
  "CONTRAINDICADA EM HIPERCALEMIA, HISTÓRIA PESSOAL OU FAMILIAR DE HIPERTERMIA MALIGNA, " +
  "DOENÇA NEUROMUSCULAR, E EM QUEIMADURA, ESMAGAMENTO, DENERVAÇÃO OU IMOBILIZAÇÃO " +
  "PROLONGADA PASSADAS AS PRIMEIRAS 24–72 H.";

const SUCCINILCOLINA_PREPARO = "(100 MG EM 10 ML = 10 MG/ML)";

// ------------------------------------------------------------ faixas

const LIMITES = {
  adulto: { min: 20, max: 300, nome: "ADULTO" },
  crianca: { min: 3, max: 100, nome: "CRIANÇA/ADOLESCENTE" },
} as const;

type Publico = keyof typeof LIMITES;

const publicoDe = (r: Resposta): Publico => (r.publico === 1 ? "crianca" : "adulto");

function pesoDe(v: Valores): number | null {
  const x = v.peso;
  return x === null || x === undefined || Number.isNaN(x) ? null : x;
}

function foraDaFaixa(publico: Publico, peso: number): boolean {
  const l = LIMITES[publico];
  return peso < l.min || peso > l.max;
}

// ------------------------------------------------------------ adulto

function laudoAdulto(peso: number, choque: boolean): string[] {
  const fentanil: Droga = {
    nome: "FENTANIL", apresentacao: "50 MCG/ML", conc: 50, unidade: "MCG",
    porKg: 1, ate: 2, via: "EV LENTO",
    nota: choque ? "NO CHOQUE, AVALIAR OMITIR: É SIMPATICOLÍTICO." : undefined,
  };
  const lidocaina: Droga = {
    nome: "LIDOCAÍNA", apresentacao: "2% (20 MG/ML)", conc: 20, unidade: "MG",
    porKg: 1.5, via: "EV", nota: "OPCIONAL: SEM BENEFÍCIO CLÍNICO DEMONSTRADO.",
  };

  const inducao: Droga[] = [
    {
      nome: "ETOMIDATO", apresentacao: "2 MG/ML", conc: 2, unidade: "MG",
      porKg: choque ? 0.2 : 0.3, via: "EV EM BÓLUS",
      nota: choque ? "DOSE REDUZIDA PELO CHOQUE (PLENA: 0,3 MG/KG)." : undefined,
    },
    {
      nome: "CETAMINA", apresentacao: "50 MG/ML", conc: 50, unidade: "MG",
      porKg: 1, ate: choque ? undefined : 2, via: "EV EM BÓLUS",
      nota: choque ? "DOSE REDUZIDA PELO CHOQUE (PLENA: 2 MG/KG)." : undefined,
    },
    {
      nome: "PROPOFOL", apresentacao: "10 MG/ML", conc: 10, unidade: "MG",
      porKg: 1, ate: 2, via: "EV EM BÓLUS",
      nota: choque ? "EVITAR NO CHOQUE: HIPOTENSÃO." : "CAUSA HIPOTENSÃO.",
    },
    {
      nome: "MIDAZOLAM", apresentacao: "5 MG/ML", conc: 5, unidade: "MG",
      porKg: 0.2, via: "EV EM BÓLUS",
      nota: choque ? "EVITAR NO CHOQUE: HIPOTENSÃO." : "INÍCIO MAIS LENTO; CAUSA HIPOTENSÃO.",
    },
  ];

  const rocuronio: Droga = {
    nome: "ROCURÔNIO", apresentacao: "10 MG/ML", conc: 10, unidade: "MG",
    porKg: 1.2, via: "EV EM BÓLUS", nota: "AGE EM ~60 S E DURA CERCA DE 1 H.",
  };
  const succinilcolina: Droga = {
    nome: "SUCCINILCOLINA", apresentacao: SUCCINILCOLINA_PREPARO, conc: 10, unidade: "MG",
    porKg: 1, ate: 1.5, via: "EV EM BÓLUS", nota: `DURA 5–10 MIN. ${SUCCINILCOLINA_CI}`,
  };
  const sugamadex: Droga = {
    nome: "SUGAMADEX", apresentacao: "100 MG/ML", conc: 100, unidade: "MG",
    porKg: 16, via: "EV",
    nota: "REVERTE O ROCURÔNIO; NÃO AGE NA SUCCINILCOLINA. TER À MÃO É DESEJÁVEL, NÃO OBRIGATÓRIO.",
  };

  return [
    "1) PRÉ-OXIGENAÇÃO (3 MIN)",
    "- VNI COM FIO2 100% (MENOS HIPOXEMIA QUE A MÁSCARA: PREOXI, NEJM 2024) OU MÁSCARA COM " +
      "RESERVATÓRIO NO FLUXO MÁXIMO.",
    "- VENTILAR COM BOLSA-VÁLVULA-MÁSCARA ENTRE A INDUÇÃO E A LARINGOSCOPIA (PREVENT, NEJM 2019).",
    "",
    "2) PRÉ-TRATAMENTO (OPCIONAL, 3 MIN ANTES DA INDUÇÃO)",
    linha(fentanil, peso),
    linha(lidocaina, peso),
    "",
    "3) INDUÇÃO - ESCOLHER UM",
    ...inducao.map((d) => linha(d, peso)),
    "CETAMINA X ETOMIDATO (RSI TRIAL, NEJM 2025): MORTALIDADE EM 28 DIAS 28% X 29%, SEM " +
      "DIFERENÇA; COLAPSO CARDIOVASCULAR NA INTUBAÇÃO 22% X 17%, MAIS COM CETAMINA.",
    "",
    "4) BLOQUEIO NEUROMUSCULAR - ESCOLHER UM, LOGO APÓS O INDUTOR",
    linha(rocuronio, peso),
    linha(succinilcolina, peso),
    `REVERSÃO: ${linha(sugamadex, peso).slice(2)}`,
    "",
    "5) DEPOIS",
    "- CONFIRMAR O TUBO COM CAPNOGRAFIA EM CURVA.",
    "- SEDOANALGESIA LOGO EM SEGUIDA: COM ROCURÔNIO O PACIENTE FICA PARALISADO POR ~1 H, E PODE " +
      "ESTAR ACORDADO.",
    "",
    "OBESO: SUCCINILCOLINA PELO PESO TOTAL; INDUTORES E OPIOIDES PELO PESO MAGRO; ROCURÔNIO PELO " +
      "PESO IDEAL (INGRANDE & LEMMENS, BJA 2010).",
    "",
    "REF: RSI TRIAL (CASEY, NEJM 2025) · PREOXI (GIBBS, NEJM 2024) · PREVENT (CASEY, NEJM 2019) · " +
      "SUGAMADEX 16 MG/KG (LEE, ANESTHESIOLOGY 2009).",
  ];
}

// ------------------------------------------------------------ criança

function laudoCrianca(peso: number, choque: boolean): string[] {
  const atropina: Droga = {
    nome: "ATROPINA", apresentacao: "0,25 MG/ML", conc: 0.25, unidade: "MG",
    porKg: 0.02, teto: 0.5, outra: { apresentacao: "0,5 MG/ML", conc: 0.5 }, via: "EV",
    nota: "NÃO É ROTINA: SÓ SE RISCO MAIOR DE BRADICARDIA (EX.: SUCCINILCOLINA). " +
      "SEM DOSE MÍNIMA (AHA 2015).",
  };
  const fentanil: Droga = {
    nome: "FENTANIL", apresentacao: "50 MCG/ML", conc: 50, unidade: "MCG",
    porKg: 1, ate: 2, via: "EV LENTO",
    nota: choque ? "NO CHOQUE, AVALIAR OMITIR: É SIMPATICOLÍTICO." : undefined,
  };
  const lidocaina: Droga = {
    nome: "LIDOCAÍNA", apresentacao: "2% (20 MG/ML)", conc: 20, unidade: "MG",
    porKg: 1.5, via: "EV", nota: "OPCIONAL: SEM BENEFÍCIO CLÍNICO DEMONSTRADO.",
  };

  const inducao: Droga[] = [
    {
      nome: "CETAMINA", apresentacao: "50 MG/ML", conc: 50, unidade: "MG",
      porKg: 1, ate: 2, via: "EV EM BÓLUS",
      nota: choque
        ? "PERFIL HEMODINÂMICO FAVORÁVEL NO CHOQUE (SSC PEDIÁTRICA 2020)."
        : undefined,
    },
    {
      nome: "ETOMIDATO", apresentacao: "2 MG/ML", conc: 2, unidade: "MG",
      porKg: 0.3, teto: 20, via: "EV EM BÓLUS",
      nota: "EVITAR NO CHOQUE SÉPTICO (SSC PEDIÁTRICA 2020).",
    },
    {
      nome: "MIDAZOLAM", apresentacao: "5 MG/ML", conc: 5, unidade: "MG",
      porKg: 0.1, ate: 0.2, teto: 10, outra: { apresentacao: "1 MG/ML", conc: 1 },
      via: "EV EM BÓLUS",
      nota: choque ? "EVITAR NO CHOQUE: HIPOTENSÃO." : "CAUSA HIPOTENSÃO.",
    },
    {
      nome: "PROPOFOL", apresentacao: "10 MG/ML", conc: 10, unidade: "MG",
      porKg: 1, ate: 2, via: "EV EM BÓLUS",
      nota: choque ? "EVITAR NO CHOQUE: HIPOTENSÃO." : "CAUSA HIPOTENSÃO.",
    },
  ];

  const rocuronio: Droga = {
    nome: "ROCURÔNIO", apresentacao: "10 MG/ML", conc: 10, unidade: "MG",
    porKg: 1, ate: 1.2, via: "EV EM BÓLUS", nota: "DURA CERCA DE 1 H.",
  };
  const succinilcolina: Droga = {
    nome: "SUCCINILCOLINA", apresentacao: SUCCINILCOLINA_PREPARO, conc: 10, unidade: "MG",
    porKg: 1, ate: 2, via: "EV EM BÓLUS",
    nota: `LACTENTE: 2 MG/KG; CRIANÇA MAIOR: 1–1,5 MG/KG. ${SUCCINILCOLINA_CI}`,
  };

  return [
    "1) PRÉ-OXIGENAÇÃO (3 MIN)",
    "- O2 100% POR MÁSCARA COM RESERVATÓRIO; BOLSA-VÁLVULA-MÁSCARA SE A SATURAÇÃO CAIR.",
    "",
    "2) PRÉ-MEDICAÇÃO (OPCIONAL)",
    linha(atropina, peso),
    linha(fentanil, peso),
    linha(lidocaina, peso),
    "",
    "3) INDUÇÃO - ESCOLHER UM",
    ...inducao.map((d) => linha(d, peso)),
    "",
    "4) BLOQUEIO NEUROMUSCULAR - ESCOLHER UM, LOGO APÓS O INDUTOR",
    linha(rocuronio, peso),
    linha(succinilcolina, peso),
    "",
    "5) DEPOIS",
    "- CONFIRMAR O TUBO COM CAPNOGRAFIA EM CURVA.",
    "- SEDOANALGESIA LOGO EM SEGUIDA: COM ROCURÔNIO A CRIANÇA FICA PARALISADA POR ~1 H, E PODE " +
      "ESTAR ACORDADA.",
    "",
    "REF: ATROPINA (AHA PEDIÁTRICA 2015) · ETOMIDATO NO CHOQUE SÉPTICO (SSC PEDIÁTRICA 2020).",
  ];
}

// ------------------------------------------------------------ calculadora

export const SEQUENCIA_RAPIDA: Calculadora = {
  slug: "sequencia-rapida-iot",
  nome: "SEQUÊNCIA RÁPIDA IOT",
  subtitulo: "Doses por peso para intubação em sequência rápida",
  campos: [{ id: "peso", label: "PESO", unidade: "kg" }],
  grupos: [
    {
      titulo: "PÚBLICO-ALVO",
      criterios: [{
        id: "publico", label: "Público-alvo", padrao: 0,
        opcoes: [
          { label: "ADULTO", pontos: 0 },
          { label: "CRIANÇA OU ADOLESCENTE (3 A 100 KG)", pontos: 1 },
        ],
      }],
    },
    {
      titulo: "SITUAÇÃO",
      criterios: [{ id: "choque", label: "INSTABILIDADE HEMODINÂMICA / CHOQUE", pontos: 0 }],
    },
  ],
  resumo: (_p, r, v) => {
    const publico = publicoDe(r);
    const peso = pesoDe(v);
    const l = LIMITES[publico];
    if (peso === null) return "PREENCHA O PESO";
    if (foraDaFaixa(publico, peso)) return `PESO FORA DA FAIXA (${l.nome}: ${l.min} A ${l.max} KG)`;
    const choque = r.choque === 1
      ? publico === "adulto" ? " · CHOQUE: INDUÇÃO REDUZIDA" : " · CHOQUE: VER NOTAS"
      : "";
    return `${l.nome} · ${numero(peso)} KG${choque}`;
  },
  laudo: (_p, r, v) => {
    const publico = publicoDe(r);
    const peso = pesoDe(v);
    const l = LIMITES[publico];
    if (peso === null) return "PREENCHA O PESO.";
    if (foraDaFaixa(publico, peso)) {
      return cx([`PESO FORA DA FAIXA DESTA CALCULADORA (${l.nome}: ${l.min} A ${l.max} KG).`]);
    }
    const choque = r.choque === 1;
    return cx([
      `SEQUÊNCIA RÁPIDA DE INTUBAÇÃO - ${l.nome}, ${numero(peso)} KG${choque ? ", EM CHOQUE" : ""}`,
      "DOSES PELO PESO INFORMADO. CONFERIR A AMPOLA DO SERVIÇO ANTES DE ASPIRAR.",
      "",
      ...(publico === "adulto" ? laudoAdulto(peso, choque) : laudoCrianca(peso, choque)),
    ]);
  },
};
