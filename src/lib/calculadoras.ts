/**
 * Escores clínicos como DADOS, não como telas.
 *
 * No PS.py cada escore era uma classe Toplevel de ~150 linhas com o mesmo
 * esqueleto repetido. Aqui cada um é um objeto: critérios, pontuação e o
 * texto de conduta. Um componente só desenha todos, e acrescentar um escore
 * novo é acrescentar um objeto.
 */

export type Resposta = Record<string, number>;

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

export interface Calculadora {
  slug: string;
  nome: string;
  subtitulo: string;
  grupos: Grupo[];
  /** Texto final que vai para a área de transferência. */
  laudo: (pontos: number, r: Resposta) => string;
  /** Resumo curto mostrado ao vivo no topo. */
  resumo: (pontos: number, r: Resposta) => string;
}

const cx = (linhas: string[]) => linhas.join("\n").toUpperCase();

// ============================ GLASGOW ============================

const GLASGOW: Calculadora = {
  slug: "glasgow",
  nome: "ESCALA DE GLASGOW",
  subtitulo: "GCS e GCS-P (com reatividade pupilar)",
  grupos: [
    {
      titulo: "ABERTURA OCULAR (E)",
      criterios: [{
        id: "e", label: "Abertura ocular", padrao: 4,
        opcoes: [
          { label: "E4 - ESPONTÂNEA", pontos: 4 },
          { label: "E3 - AO CHAMADO", pontos: 3 },
          { label: "E2 - À DOR", pontos: 2 },
          { label: "E1 - NENHUMA", pontos: 1 },
        ],
      }],
    },
    {
      titulo: "RESPOSTA VERBAL (V)",
      criterios: [{
        id: "v", label: "Resposta verbal", padrao: 5,
        opcoes: [
          { label: "V5 - ORIENTADO", pontos: 5 },
          { label: "V4 - CONFUSO", pontos: 4 },
          { label: "V3 - PALAVRAS INAPROPRIADAS", pontos: 3 },
          { label: "V2 - SONS INCOMPREENSÍVEIS", pontos: 2 },
          { label: "V1 - NENHUMA", pontos: 1 },
        ],
      }],
    },
    {
      titulo: "RESPOSTA MOTORA (M)",
      criterios: [{
        id: "m", label: "Resposta motora", padrao: 6,
        opcoes: [
          { label: "M6 - OBEDECE COMANDOS", pontos: 6 },
          { label: "M5 - LOCALIZA DOR", pontos: 5 },
          { label: "M4 - RETIRA À DOR", pontos: 4 },
          { label: "M3 - FLEXÃO ANORMAL (DECORTICAÇÃO)", pontos: 3 },
          { label: "M2 - EXTENSÃO ANORMAL (DECEREBRAÇÃO)", pontos: 2 },
          { label: "M1 - NENHUMA", pontos: 1 },
        ],
      }],
    },
    {
      titulo: "PUPILAS (FOTORREAGENTES?)",
      criterios: [{
        id: "prs", label: "Reatividade pupilar", padrao: 0,
        opcoes: [
          { label: "PRS 0 - 2 PUPILAS FOTORREAGENTES", pontos: 0 },
          { label: "PRS 1 - 1 PUPILA NÃO FOTORREAGENTE", pontos: 1 },
          { label: "PRS 2 - 2 PUPILAS NÃO FOTORREAGENTES", pontos: 2 },
        ],
      }],
    },
  ],
  resumo: (_p, r) => {
    const gcs = (r.e ?? 4) + (r.v ?? 5) + (r.m ?? 6);
    return `GCS ${gcs} · GCS-P ${Math.max(1, gcs - (r.prs ?? 0))} · ${classeGCS(gcs)}`;
  },
  laudo: (_p, r) => {
    const gcs = (r.e ?? 4) + (r.v ?? 5) + (r.m ?? 6);
    const prs = r.prs ?? 0;
    const prsTxt = ["PRS: 0 (2 PUPILAS FOTORREAGENTES)", "PRS: 1 (1 PUPILA NÃO FOTORREAGENTE)", "PRS: 2 (2 PUPILAS NÃO FOTORREAGENTES)"][prs];
    return cx([
      `GLASGOW (GCS): ${gcs} | E${r.e ?? 4} V${r.v ?? 5} M${r.m ?? 6} | ${classeGCS(gcs)} | ${prsTxt} | GCS-P: ${Math.max(1, gcs - prs)}`,
    ]);
  },
};

function classeGCS(gcs: number): string {
  if (gcs >= 13) return "LEVE (13–15)";
  if (gcs >= 9) return "MODERADO (9–12)";
  return "GRAVE (3–8)";
}

// ============================ CURB-65 ============================

const CURB65: Calculadora = {
  slug: "curb-65",
  nome: "CURB-65",
  subtitulo: "Gravidade da pneumonia adquirida na comunidade",
  grupos: [{
    titulo: "CRITÉRIOS",
    criterios: [
      { id: "c", label: "CONFUSÃO MENTAL NOVA", pontos: 1 },
      { id: "u", label: "UREIA > 50 mg/dL", pontos: 1 },
      { id: "r", label: "FREQUÊNCIA RESPIRATÓRIA ≥ 30 irpm", pontos: 1 },
      { id: "b", label: "PRESSÃO ARTERIAL < 90 x 60 mmHg", pontos: 1 },
      { id: "idade", label: "IDADE ≥ 65 ANOS", pontos: 1 },
    ],
  }],
  resumo: (p) => `${p}/5 · ${p <= 1 ? "BAIXO RISCO" : p === 2 ? "RISCO INTERMEDIÁRIO" : "ALTO RISCO"}`,
  laudo: (p) => {
    const conduta = p <= 1
      ? ["CLASSIFICAÇÃO: BAIXO RISCO", "CONDUTA:", "- TRATAMENTO AMBULATORIAL.", "- CONSIDERAR ATB VO CONFORME PERFIL CLÍNICO.", "- ORIENTAR RETORNO SE PIORA."]
      : p === 2
        ? ["CLASSIFICAÇÃO: RISCO INTERMEDIÁRIO", "CONDUTA:", "- INTERNAR EM ENFERMARIA.", "- ANTIBIOTICOTERAPIA EV INICIAL.", "- MONITORIZAÇÃO CLÍNICA."]
        : ["CLASSIFICAÇÃO: ALTO RISCO", "CONDUTA:", "- INTERNAR (CONSIDERAR UTI).", "- ANTIBIOTICOTERAPIA EV IMEDIATA.", "- MONITORIZAÇÃO INTENSIVA."];
    return cx([
      "CURB-65 – AVALIAÇÃO DE GRAVIDADE DA PNEUMONIA",
      `PONTUAÇÃO FINAL: ${p}/5`,
      "",
      ...conduta,
      "",
      "REFERÊNCIAS:",
      "- WHITEBOOK – PNEUMONIA ADQUIRIDA NA COMUNIDADE.",
      "- UPTODATE – CURB-65 AND SEVERITY ASSESSMENT.",
    ]);
  },
};

// ============================ qSOFA ============================

const QSOFA: Calculadora = {
  slug: "qsofa",
  nome: "qSOFA",
  subtitulo: "Triagem de sepse",
  grupos: [{
    titulo: "CRITÉRIOS",
    criterios: [
      { id: "fr", label: "FREQUÊNCIA RESPIRATÓRIA ≥ 22 irpm", pontos: 1 },
      { id: "pas", label: "PRESSÃO ARTERIAL SISTÓLICA ≤ 100 mmHg", pontos: 1 },
      { id: "neuro", label: "ALTERAÇÃO DO NÍVEL DE CONSCIÊNCIA (GCS < 15)", pontos: 1 },
    ],
  }],
  resumo: (p) => `${p}/3 · ${p >= 2 ? "ALTO RISCO" : "BAIXO RISCO NO MOMENTO"}`,
  laudo: (p) => {
    const conduta = p >= 2
      ? ["INTERPRETAÇÃO: ALTO RISCO", "CONDUTA:", "- SUSPEITAR SEPSE.", "- MONITORIZAÇÃO CLÍNICA E HEMODINÂMICA.", "- COLETAR LACTATO E EXAMES LABORATORIAIS.", "- AVALIAR SOFA COMPLETO.", "- CONSIDERAR INTERNAÇÃO / UTI CONFORME CONTEXTO."]
      : ["INTERPRETAÇÃO: BAIXO RISCO NO MOMENTO", "CONDUTA:", "- MANTER OBSERVAÇÃO CLÍNICA.", "- REAVALIAR PERIODICAMENTE.", "- qSOFA NÃO EXCLUI SEPSE."];
    return cx([
      "qSOFA – TRIAGEM DE SEPSE",
      `PONTUAÇÃO FINAL: ${p}/3`,
      "",
      ...conduta,
      "",
      "OBS:",
      "- qSOFA É FERRAMENTA DE TRIAGEM.",
      "- NÃO SUBSTITUI JULGAMENTO CLÍNICO.",
      "",
      "REFERÊNCIAS:",
      "- WHITEBOOK – SEPSE.",
      "- UPTODATE – qSOFA SCORE.",
    ]);
  },
};

// ============================ WELLS (TVP) ============================

const WELLS_TVP: Calculadora = {
  slug: "wells-tvp",
  nome: "WELLS (TVP)",
  subtitulo: "Probabilidade pré-teste de trombose venosa profunda",
  grupos: [{
    titulo: "CRITÉRIOS",
    criterios: [
      { id: "cancer", label: "CÂNCER ATIVO (TRATAMENTO EM CURSO, <6 MESES OU PALIATIVO)", pontos: 1 },
      { id: "paralisia", label: "PARALISIA/PARESIA OU IMOBILIZAÇÃO RECENTE DE MEMBRO INFERIOR", pontos: 1 },
      { id: "acamado", label: "ACAMADO >3 DIAS OU CIRURGIA DE GRANDE PORTE NAS ÚLTIMAS 4 SEMANAS", pontos: 1 },
      { id: "dor", label: "DOR À PALPAÇÃO NO TRAJETO DO SISTEMA VENOSO PROFUNDO", pontos: 1 },
      { id: "edema_todo", label: "EDEMA DE TODO O MEMBRO INFERIOR", pontos: 1 },
      { id: "panturrilha", label: "DIFERENÇA DE CIRCUNFERÊNCIA DA PANTURRILHA ≥ 3 CM", pontos: 1 },
      { id: "cacifo", label: "EDEMA DEPRESSÍVEL (MAIS NO MEMBRO SINTOMÁTICO)", pontos: 1 },
      { id: "colaterais", label: "VEIAS COLATERAIS SUPERFICIAIS (NÃO VARIZES)", pontos: 1 },
      { id: "alternativo", label: "DIAGNÓSTICO ALTERNATIVO TÃO PROVÁVEL QUANTO TVP", pontos: -2 },
    ],
  }],
  resumo: (p) => `${p} pts · ${nivel3TVP(p)} · ${p <= 1 ? "TVP IMPROVÁVEL" : "TVP PROVÁVEL"}`,
  laudo: (p) => {
    const improvavel = p <= 1;
    const conduta = improvavel
      ? ["CONDUTA (TVP IMPROVÁVEL):",
         "- SOLICITAR D-DÍMERO (SE DISPONÍVEL E SEM OUTRA HIPÓTESE MAIS PROVÁVEL).",
         "- SE D-DÍMERO NEGATIVO: TVP MUITO IMPROVÁVEL -> EM GERAL NÃO PRECISA USG.",
         "- SE D-DÍMERO POSITIVO: REALIZAR USG DOPPLER VENOSO DE MMII."]
      : ["CONDUTA (TVP PROVÁVEL):",
         "- REALIZAR USG DOPPLER VENOSO DE MMII O QUANTO ANTES.",
         "- SE USG POSITIVO: CONFIRMA TVP -> TRATAR (ANTICOAGULAÇÃO CONFORME PERFIL/CONTRAINDICAÇÕES).",
         "- SE USG NEGATIVO MAS SUSPEITA PERSISTE: REPETIR USG EM 5–7 DIAS OU ESTRATÉGIA DO SERVIÇO."];
    return cx([
      "WELLS (TVP) - RESULTADO",
      `PONTUAÇÃO: ${p}`,
      `CLASSIFICAÇÃO: ${nivel3TVP(p)} (3 NÍVEIS) | ${improvavel ? "TVP IMPROVÁVEL" : "TVP PROVÁVEL"} (2 NÍVEIS)`,
      "",
      ...conduta,
      "",
      "OBS: ADAPTAR AO PROTOCOLO LOCAL, RISCO DE SANGRAMENTO, GESTAÇÃO, CÂNCER, FUNÇÃO RENAL, ETC.",
    ]);
  },
};

function nivel3TVP(p: number): string {
  if (p < 1) return "BAIXA";
  if (p <= 2) return "INTERMEDIÁRIA";
  return "ALTA";
}

// ============================ ALVARADO ============================

const ALVARADO: Calculadora = {
  slug: "alvarado",
  nome: "ALVARADO (MANTRELS)",
  subtitulo: "Probabilidade de apendicite aguda",
  grupos: [{
    titulo: "CRITÉRIOS (MANTRELS)",
    criterios: [
      { id: "migratoria", label: "DOR MIGRATÓRIA PARA FID", pontos: 1 },
      { id: "anorexia", label: "ANOREXIA", pontos: 1 },
      { id: "nv", label: "NÁUSEAS/VÔMITOS", pontos: 1 },
      { id: "dor_fid", label: "DOR/DEFESA À PALPAÇÃO EM FID", pontos: 2 },
      { id: "descomp", label: "DESCOMPRESSÃO BRUSCA DOLOROSA", pontos: 1 },
      { id: "febre", label: "FEBRE (>37,3 °C)", pontos: 1 },
      { id: "leuco", label: "LEUCOCITOSE (>10.000)", pontos: 2 },
      { id: "desvio", label: "DESVIO À ESQUERDA", pontos: 1 },
    ],
  }],
  resumo: (p) => `${p}/10 · ${classeAlvarado(p)}`,
  laudo: (p) => {
    let conduta: string[];
    if (p <= 4) {
      conduta = ["- BAIXA PROBABILIDADE: OBSERVAÇÃO/REAVALIAÇÃO CLÍNICA.", "- CONSIDERAR EXAMES (HEMOGRAMA/URINA) SE NECESSÁRIO.", "- IMAGEM SE DÚVIDA OU PERSISTÊNCIA/PIORA."];
    } else if (p <= 6) {
      conduta = ["- PROBABILIDADE INTERMEDIÁRIA: SOLICITAR IMAGEM (USG ABDOME; TC SE NECESSÁRIO).", "- ANALGESIA/HIDRATAÇÃO E REAVALIAÇÃO SERIADA.", "- AVALIAÇÃO CIRÚRGICA CONFORME DISPONIBILIDADE/SUSPEITA."];
    } else if (p <= 8) {
      conduta = ["- PROVÁVEL: AVALIAÇÃO CIRÚRGICA PRECOCE.", "- IMAGEM PODE SER ÚTIL PARA CONFIRMAÇÃO/COMPLICAÇÕES (USG/TC).", "- JEJUM, HIDRATAÇÃO, ANALGESIA; ANTIBIÓTICO SE INDICADO PELO SERVIÇO."];
    } else {
      conduta = ["- MUITO PROVÁVEL: AVALIAÇÃO CIRÚRGICA IMEDIATA.", "- CONSIDERAR TRATAMENTO ESTRUTURADO DO SERVIÇO (JEJUM, ACESSO, HIDRATAÇÃO, ANALGESIA).", "- IMAGEM SE IMPACTAR CONDUTA (ATÍPICO, DÚVIDA, COMPLICAÇÃO)."];
    }
    return cx([
      "ALVARADO (MANTRELS) - RESULTADO",
      `SCORE: ${p}/10`,
      `CLASSIFICAÇÃO: ${classeAlvarado(p)}`,
      "",
      "CONDUTA (SUGESTÃO PRÁTICA - ADAPTAR AO PROTOCOLO LOCAL):",
      ...conduta,
      "",
      "OBS: ESCORE É APOIO À DECISÃO; CORRELACIONAR COM EXAME FÍSICO, EVOLUÇÃO, GESTAÇÃO, IDADE E DIAGNÓSTICOS DIFERENCIAIS.",
    ]);
  },
};

function classeAlvarado(p: number): string {
  if (p <= 4) return "BAIXA (0–4)";
  if (p <= 6) return "INTERMEDIÁRIA (5–6)";
  if (p <= 8) return "PROVÁVEL (7–8)";
  return "MUITO PROVÁVEL (9–10)";
}

// ============================ REGISTRO ============================

export const CALCULADORAS: Calculadora[] = [ALVARADO, CURB65, GLASGOW, QSOFA, WELLS_TVP];

export function acharCalculadora(slug: string): Calculadora | undefined {
  return CALCULADORAS.find((c) => c.slug === slug);
}

/** Soma os pontos de todos os critérios respondidos. */
export function somar(calc: Calculadora, r: Resposta): number {
  let total = 0;
  for (const g of calc.grupos) {
    for (const c of g.criterios) {
      const v = r[c.id];
      if (v === undefined) continue;
      total += c.opcoes ? v : v * (c.pontos ?? 0);
    }
  }
  return total;
}

/** Respostas iniciais: radios no padrão, checkboxes desmarcados. */
export function respostaInicial(calc: Calculadora): Resposta {
  const r: Resposta = {};
  for (const g of calc.grupos) {
    for (const c of g.criterios) {
      r[c.id] = c.opcoes ? (c.padrao ?? c.opcoes[0].pontos) : 0;
    }
  }
  return r;
}
