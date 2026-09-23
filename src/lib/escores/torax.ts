/**
 * Tórax e sepse: pneumonia, risco na infecção suspeita, tromboembolismo.
 */

import type { Calculadora } from "./tipos";
import { cx, n1 } from "./tipos";
import type { Resposta, Valores } from "./tipos";

// ============================ CURB-65 ============================

/*
 * Lim et al., Thorax 2003: ureia > 7 mmol/L e PA sistólica < 90 OU
 * diastólica ≤ 60. Em mg/dL de ureia, 7 mmol/L são 42 (× 6,006). O PS.py
 * usava "> 50", arredondamento que circula em textos brasileiros e que deixa
 * de pontuar quem está entre 43 e 50.
 */

export const CURB65: Calculadora = {
  slug: "curb-65",
  nome: "CURB-65",
  subtitulo: "Gravidade da pneumonia adquirida na comunidade",
  grupos: [{
    titulo: "CRITÉRIOS",
    criterios: [
      { id: "c", label: "CONFUSÃO MENTAL NOVA", pontos: 1 },
      { id: "u", label: "UREIA > 42 mg/dL (> 7 mmol/L; BUN > 19 mg/dL)", pontos: 1 },
      { id: "r", label: "FREQUÊNCIA RESPIRATÓRIA ≥ 30 irpm", pontos: 1 },
      { id: "b", label: "PAS < 90 mmHg OU PAD ≤ 60 mmHg", pontos: 1 },
      { id: "idade", label: "IDADE ≥ 65 ANOS", pontos: 1 },
    ],
  }],
  resumo: (p) => `${p}/5 · ${p <= 1 ? "BAIXO RISCO" : p === 2 ? "RISCO INTERMEDIÁRIO" : "ALTO RISCO"}`,
  laudo: (p) => {
    const conduta = p <= 1
      ? ["CLASSIFICAÇÃO: BAIXO RISCO", "CONDUTA:", "- TRATAMENTO AMBULATORIAL.", "- CONSIDERAR ATB VO CONFORME PERFIL CLÍNICO.", "- ORIENTAR RETORNO SE PIORA."]
      : p === 2
        ? ["CLASSIFICAÇÃO: RISCO INTERMEDIÁRIO", "CONDUTA:", "- CONSIDERAR INTERNAÇÃO CURTA OU TRATAMENTO AMBULATORIAL SUPERVISIONADO.", "- ANTIBIOTICOTERAPIA CONFORME GRAVIDADE CLÍNICA.", "- MONITORIZAÇÃO CLÍNICA."]
        : ["CLASSIFICAÇÃO: ALTO RISCO (PNEUMONIA GRAVE)", "CONDUTA:", "- INTERNAR; AVALIAR UTI, SOBRETUDO COM 4 OU 5 PONTOS.", "- ANTIBIOTICOTERAPIA EV IMEDIATA.", "- MONITORIZAÇÃO INTENSIVA."];
    return cx([
      "CURB-65 – AVALIAÇÃO DE GRAVIDADE DA PNEUMONIA",
      `PONTUAÇÃO FINAL: ${p}/5`,
      "",
      ...conduta,
      "",
      "OBS: O ESCORE NÃO SUBSTITUI O JULGAMENTO CLÍNICO — HIPOXEMIA, COMORBIDADE DESCOMPENSADA E",
      "CONDIÇÃO SOCIAL TAMBÉM DECIDEM A INTERNAÇÃO.",
      "",
      "REFERÊNCIA: LIM WS ET AL. THORAX 2003;58:377-82.",
    ]);
  },
};

// ============================ qSOFA ============================

export const QSOFA: Calculadora = {
  slug: "qsofa",
  nome: "qSOFA",
  subtitulo: "Risco de desfecho ruim na infecção suspeita, fora da UTI",
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
      ? ["INTERPRETAÇÃO: ALTO RISCO DE MORTE OU UTI PROLONGADA", "CONDUTA:", "- SUSPEITAR SEPSE.", "- MONITORIZAÇÃO CLÍNICA E HEMODINÂMICA.", "- COLETAR LACTATO E EXAMES LABORATORIAIS.", "- AVALIAR SOFA COMPLETO.", "- CONSIDERAR INTERNAÇÃO / UTI CONFORME CONTEXTO."]
      : ["INTERPRETAÇÃO: BAIXO RISCO NO MOMENTO", "CONDUTA:", "- MANTER OBSERVAÇÃO CLÍNICA.", "- REAVALIAR PERIODICAMENTE.", "- qSOFA NÃO EXCLUI SEPSE."];
    return cx([
      "qSOFA – RISCO NA INFECÇÃO SUSPEITA (SEPSIS-3)",
      `PONTUAÇÃO FINAL: ${p}/3`,
      "",
      ...conduta,
      "",
      "OBS:",
      "- qSOFA É PROGNÓSTICO, NÃO DIAGNÓSTICO: SEPSE É INFECÇÃO COM SOFA ≥ 2 (SEPSIS-3).",
      "- NÃO USAR COMO FERRAMENTA ÚNICA DE TRIAGEM DE SEPSE: A SURVIVING SEPSIS CAMPAIGN 2021",
      "  RECOMENDA CONTRA, EM COMPARAÇÃO COM SIRS, NEWS OU MEWS (BAIXA SENSIBILIDADE).",
      "- NÃO SUBSTITUI JULGAMENTO CLÍNICO.",
      "",
      "REFERÊNCIAS: SEYMOUR CW ET AL. JAMA 2016;315:762-74 | EVANS L ET AL. CRIT CARE MED 2021;49:E1063.",
    ]);
  },
};

// ============================ WELLS (TVP) ============================

/*
 * O escore modificado de Wells et al., NEJM 2003 — o que definiu o corte de
 * dois níveis (provável ≥ 2) que o laudo usa. Em relação ao de 1997 ele
 * acrescenta TVP prévia documentada e estende a cirurgia para 12 semanas; o
 * PS.py tinha o de 1997 com o corte de 2003, e sem o item de TVP prévia um
 * paciente com trombose anterior podia cair em "improvável" com 1 ponto a
 * menos do que o devido.
 */
export const WELLS_TVP: Calculadora = {
  slug: "wells-tvp",
  nome: "WELLS (TVP)",
  subtitulo: "Probabilidade pré-teste de trombose venosa profunda",
  grupos: [{
    titulo: "CRITÉRIOS",
    criterios: [
      { id: "cancer", label: "CÂNCER ATIVO (TRATAMENTO EM CURSO, <6 MESES OU PALIATIVO)", pontos: 1 },
      { id: "paralisia", label: "PARALISIA/PARESIA OU IMOBILIZAÇÃO GESSADA RECENTE DE MEMBRO INFERIOR", pontos: 1 },
      { id: "acamado", label: "ACAMADO ≥ 3 DIAS OU CIRURGIA DE GRANDE PORTE (ANESTESIA GERAL OU REGIONAL) NAS ÚLTIMAS 12 SEMANAS", pontos: 1 },
      { id: "dor", label: "DOR À PALPAÇÃO NO TRAJETO DO SISTEMA VENOSO PROFUNDO", pontos: 1 },
      { id: "edema_todo", label: "EDEMA DE TODO O MEMBRO INFERIOR", pontos: 1 },
      { id: "panturrilha", label: "PANTURRILHA ≥ 3 CM MAIOR QUE A DO OUTRO LADO (10 CM ABAIXO DA TUBEROSIDADE TIBIAL)", pontos: 1 },
      { id: "cacifo", label: "EDEMA DEPRESSÍVEL RESTRITO AO MEMBRO SINTOMÁTICO", pontos: 1 },
      { id: "colaterais", label: "VEIAS COLATERAIS SUPERFICIAIS (NÃO VARIZES)", pontos: 1 },
      { id: "previa", label: "TVP PRÉVIA DOCUMENTADA", pontos: 1 },
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
         "- SE USG NEGATIVO: D-DÍMERO. NEGATIVO EXCLUI; POSITIVO -> REPETIR USG EM 1 SEMANA (WELLS 2003)."];
    return cx([
      "WELLS (TVP) - RESULTADO",
      `PONTUAÇÃO: ${p}`,
      `CLASSIFICAÇÃO: ${nivel3TVP(p)} (3 NÍVEIS) | ${improvavel ? "TVP IMPROVÁVEL" : "TVP PROVÁVEL"} (2 NÍVEIS)`,
      "",
      ...conduta,
      "",
      "OBS: ADAPTAR AO PROTOCOLO LOCAL, RISCO DE SANGRAMENTO, GESTAÇÃO, CÂNCER, FUNÇÃO RENAL, ETC.",
      "REF: WELLS PS ET AL. NEJM 2003;349:1227-35 (ESCORE MODIFICADO, 2 NÍVEIS) | LANCET 1997;350:1795-8 (3 NÍVEIS).",
    ]);
  },
};

function nivel3TVP(p: number): string {
  if (p < 1) return "BAIXA";
  if (p <= 2) return "INTERMEDIÁRIA";
  return "ALTA";
}

// ============================ WELLS (TEP) ============================

/**
 * Wells para TEP, com a regra PERC acoplada.
 *
 * A PERC reaproveita três dados do próprio Wells — frequência cardíaca,
 * hemoptise e TVP/TEP prévia — e acrescenta idade, SpO2, edema unilateral,
 * estrogênio e cirurgia/trauma recente. Por isso ela não é um segundo
 * escore: é uma leitura das mesmas marcações mais três números.
 *
 * A frequência é número, e não caixa de marcar, porque os dois cortes são
 * diferentes: o Wells pontua FC > 100 (Wells 2000) e a PERC só é negativa
 * com pulso < 100 (Kline 2004). Uma caixa "FC > 100" deixava a FC de
 * exatamente 100 — valor anotado toda hora — passar como PERC negativa.
 *
 * E ela só vale quando a suspeita clínica é baixa. Aplicar PERC num paciente
 * de alta probabilidade é usar uma regra fora da população onde ela foi
 * validada, então o laudo só a invoca no ramo de baixa probabilidade.
 */
export const WELLS_TEP: Calculadora = {
  slug: "wells-tep",
  nome: "WELLS (TEP)",
  subtitulo: "Probabilidade pré-teste de tromboembolismo pulmonar, com PERC",
  campos: [
    { id: "fc", label: "FREQUÊNCIA CARDÍACA", unidade: "bpm" },
    { id: "idade", label: "IDADE", unidade: "anos" },
    { id: "spo2", label: "SPO2 EM AR AMBIENTE", unidade: "%" },
  ],
  grupos: [
    {
      titulo: "CRITÉRIOS DE WELLS (+ FC > 100)",
      criterios: [
        { id: "tvp", label: "SINAIS CLÍNICOS DE TVP", pontos: 3 },
        { id: "provavel", label: "TEP É O DIAGNÓSTICO MAIS PROVÁVEL", pontos: 3 },
        { id: "imob", label: "IMOBILIZAÇÃO ≥ 3 DIAS OU CIRURGIA NAS ÚLTIMAS 4 SEMANAS", pontos: 1.5 },
        { id: "previa", label: "TVP/TEP PRÉVIA", pontos: 1.5 },
        { id: "hemoptise", label: "HEMOPTISE", pontos: 1 },
        { id: "cancer", label: "CÂNCER ATIVO", pontos: 1 },
      ],
    },
    {
      titulo: "PERC (SÓ SE A SUSPEITA CLÍNICA FOR BAIXA)",
      criterios: [
        { id: "edema", label: "EDEMA UNILATERAL DE PERNA", pontos: 0 },
        { id: "estrogenio", label: "USO DE ESTROGÊNIO (ACO/TRH)", pontos: 0 },
        { id: "cirurgia", label: "CIRURGIA/TRAUMA COM INTERNAÇÃO NAS ÚLTIMAS 4 SEMANAS", pontos: 0 },
      ],
    },
  ],
  resumo: (p, r, v) => {
    const total = pontosWells(p, v);
    const semFc = v.fc === null || v.fc === undefined ? " (SEM FC)" : "";
    return `${n1(total)} pts${semFc} · ${nivel3TEP(total)} · ${perc(r, v).texto}`;
  },
  laudo: (p, r, v) => {
    const total = pontosWells(p, v);
    const fc = v.fc ?? null;
    const nivel = nivel3TEP(total);
    const dois = total <= 4 ? "TEP IMPROVÁVEL (≤4)" : "TEP PROVÁVEL (>4)";
    const situacao = perc(r, v);

    let conduta: string[];
    if (nivel.startsWith("ALTA")) {
      conduta = [
        "CONDUTA (ALTA PROBABILIDADE):",
        "- NÃO USAR D-DÍMERO PARA EXCLUIR.",
        "- SOLICITAR IMAGEM IMEDIATA (ANGIOTC DE ARTÉRIAS PULMONARES OU PROTOCOLO DO SERVIÇO).",
        "- SE INSTÁVEL: PROTOCOLO DE TEP DE ALTO RISCO (CHOQUE/HIPOTENSÃO).",
      ];
    } else if (nivel.startsWith("BAIXA") && situacao.negativa === true) {
      conduta = [
        "CONDUTA (BAIXA PROBABILIDADE + PERC NEGATIVO):",
        "- PODE EXCLUIR TEP SEM D-DÍMERO E SEM IMAGEM (APENAS SE SUSPEITA CLÍNICA BAIXA).",
        "- ORIENTAR RETORNO SE PIORA/SINAIS DE ALARME.",
      ];
    } else {
      conduta = [
        "CONDUTA (BAIXA/INTERMEDIÁRIA OU PERC POSITIVO):",
        "- SOLICITAR D-DÍMERO (PREFERIR AJUSTADO POR IDADE SE >50 ANOS).",
        "  * CORTE AJUSTADO POR IDADE: IDADE x 10 NG/ML FEU (SE >50).",
        "- SE D-DÍMERO NEGATIVO: TEP IMPROVÁVEL -> EM GERAL ENCERRA INVESTIGAÇÃO.",
        "- SE D-DÍMERO POSITIVO: REALIZAR IMAGEM (ANGIOTC) CONFORME PROTOCOLO/CONTRAINDICAÇÕES.",
      ];
    }

    return cx([
      "WELLS (TEP) - RESULTADO",
      `SCORE: ${n1(total)}`,
      fc === null
        ? "FC NÃO INFORMADA: O ESCORE FOI SOMADO SEM O ITEM FC > 100 (+1,5)."
        : `FC: ${Math.round(fc)} BPM${fc > 100 ? " (+1,5)" : ""}`,
      `CLASSIFICAÇÃO (2 NÍVEIS): ${dois}`,
      `CLASSIFICAÇÃO (3 NÍVEIS): ${nivel}`,
      situacao.texto,
      ...(situacao.faltando.length ? [] : [`  ${situacao.detalhe}`]),
      "",
      ...conduta,
      "",
      "OBS: ADAPTAR A GESTAÇÃO, INSUF. RENAL, ALERGIA A CONTRASTE, CÂNCER, ANTICOAGULAÇÃO E PROTOCOLO LOCAL.",
      "REF: WELLS 2000 | PERC (KLINE 2004) | D-DÍMERO AJUSTADO (ADJUST-PE 2014) | ESC/ERS 2019.",
    ]);
  },
};

/** A FC entra por número: FC > 100 soma 1,5 ao que as caixas somaram. */
function pontosWells(p: number, v: Valores): number {
  const fc = v.fc ?? null;
  return p + (fc !== null && fc > 100 ? 1.5 : 0);
}

function nivel3TEP(p: number): string {
  if (p < 2) return "BAIXA PROBABILIDADE (<2)";
  if (p <= 6) return "PROBABILIDADE INTERMEDIÁRIA (2–6)";
  return "ALTA PROBABILIDADE (>6)";
}

/**
 * A PERC só é negativa com os OITO itens negativos. Enquanto faltar FC,
 * idade ou SpO2 ela não é "negativa" nem "positiva": é indeterminada, e
 * dizer "negativa" aí seria liberar o paciente com base num campo em branco.
 */
function perc(r: Resposta, v: Valores): {
  texto: string;
  detalhe: string;
  negativa: boolean | null;
  faltando: string[];
} {
  const faltando: string[] = [];
  if (v.fc === null || v.fc === undefined) faltando.push("FC");
  if (v.idade === null || v.idade === undefined) faltando.push("IDADE");
  if (v.spo2 === null || v.spo2 === undefined) faltando.push("SPO2");

  if (faltando.length) {
    return {
      texto: `PERC: INDETERMINADO — PREENCHA ${faltando.join(", ").replace(/, ([^,]*)$/, " E $1")}`,
      detalhe: "",
      negativa: null,
      faltando,
    };
  }

  const itens: [string, boolean][] = [
    ["IDADE ≥ 50", (v.idade as number) >= 50],
    // PERC pede pulso < 100: FC de exatamente 100 já a reprova.
    ["FC ≥ 100", (v.fc as number) >= 100],
    ["SPO2 < 95%", (v.spo2 as number) < 95],
    ["HEMOPTISE", r.hemoptise === 1],
    ["ESTROGÊNIO", r.estrogenio === 1],
    ["CIRURGIA/TRAUMA RECENTE", r.cirurgia === 1],
    ["TVP/TEP PRÉVIA", r.previa === 1],
    ["EDEMA UNILATERAL", r.edema === 1],
  ];
  const positivos = itens.filter(([, sim]) => sim).map(([nome]) => nome);

  return positivos.length === 0
    ? {
        texto: "PERC: NEGATIVO (OS 8 ITENS NEGATIVOS)",
        detalhe: "NENHUM ITEM DA PERC PRESENTE.",
        negativa: true,
        faltando,
      }
    : {
        texto: "PERC: POSITIVO (NÃO EXCLUI SEM TESTAR)",
        detalhe: `ITENS PRESENTES: ${positivos.join(", ")}.`,
        negativa: false,
        faltando,
      };
}
