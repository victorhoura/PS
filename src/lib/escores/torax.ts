/**
 * Tórax e sepse: pneumonia, triagem de sepse, tromboembolismo.
 */

import type { Calculadora } from "./tipos";
import { cx, n1 } from "./tipos";
import type { Resposta, Valores } from "./tipos";

// ============================ CURB-65 ============================

export const CURB65: Calculadora = {
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

export const QSOFA: Calculadora = {
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

export const WELLS_TVP: Calculadora = {
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

// ============================ WELLS (TEP) ============================

/**
 * Wells para TEP, com a regra PERC acoplada.
 *
 * A PERC reaproveita três critérios do próprio Wells — FC > 100, hemoptise e
 * TVP/TEP prévia — e acrescenta idade, SpO2, edema unilateral, estrogênio e
 * cirurgia/trauma recente. Por isso ela não é um segundo escore: é uma
 * leitura das mesmas marcações mais dois números.
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
    { id: "idade", label: "IDADE", unidade: "anos" },
    { id: "spo2", label: "SPO2 EM AR AMBIENTE", unidade: "%" },
  ],
  grupos: [
    {
      titulo: "CRITÉRIOS DE WELLS",
      criterios: [
        { id: "tvp", label: "SINAIS CLÍNICOS DE TVP", pontos: 3 },
        { id: "provavel", label: "TEP É O DIAGNÓSTICO MAIS PROVÁVEL", pontos: 3 },
        { id: "fc", label: "FC > 100 BPM", pontos: 1.5 },
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
  resumo: (p, r, v) => `${n1(p)} pts · ${nivel3TEP(p)} · ${perc(r, v).texto}`,
  laudo: (p, r, v) => {
    const nivel = nivel3TEP(p);
    const dois = p <= 4 ? "TEP IMPROVÁVEL (≤4)" : "TEP PROVÁVEL (>4)";
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
        "  * CORTE AJUSTADO POR IDADE: IDADE x 10 NG/ML (SE >50).",
        "- SE D-DÍMERO NEGATIVO: TEP IMPROVÁVEL -> EM GERAL ENCERRA INVESTIGAÇÃO.",
        "- SE D-DÍMERO POSITIVO: REALIZAR IMAGEM (ANGIOTC) CONFORME PROTOCOLO/CONTRAINDICAÇÕES.",
      ];
    }

    return cx([
      "WELLS (TEP) - RESULTADO",
      `SCORE: ${n1(p)}`,
      `CLASSIFICAÇÃO (2 NÍVEIS): ${dois}`,
      `CLASSIFICAÇÃO (3 NÍVEIS): ${nivel}`,
      situacao.texto,
      ...(situacao.faltando.length ? [] : [`  ${situacao.detalhe}`]),
      "",
      ...conduta,
      "",
      "OBS: ADAPTAR A GESTAÇÃO, INSUF. RENAL, ALERGIA A CONTRASTE, CÂNCER, ANTICOAGULAÇÃO E PROTOCOLO LOCAL.",
      "REF: ESC/ERS (TEP) + REGRA PERC (KLINE).",
    ]);
  },
};

function nivel3TEP(p: number): string {
  if (p < 2) return "BAIXA PROBABILIDADE (<2)";
  if (p <= 6) return "PROBABILIDADE INTERMEDIÁRIA (2–6)";
  return "ALTA PROBABILIDADE (>6)";
}

/**
 * A PERC só é negativa com os OITO itens negativos. Enquanto faltar idade ou
 * SpO2 ela não é "negativa" nem "positiva": é indeterminada, e dizer
 * "negativa" aí seria liberar o paciente com base num campo em branco.
 */
function perc(r: Resposta, v: Valores): {
  texto: string;
  detalhe: string;
  negativa: boolean | null;
  faltando: string[];
} {
  const faltando: string[] = [];
  if (v.idade === null || v.idade === undefined) faltando.push("IDADE");
  if (v.spo2 === null || v.spo2 === undefined) faltando.push("SPO2");

  if (faltando.length) {
    return {
      texto: `PERC: INDETERMINADO — PREENCHA ${faltando.join(" E ")}`,
      detalhe: "",
      negativa: null,
      faltando,
    };
  }

  const itens: [string, boolean][] = [
    ["IDADE ≥ 50", (v.idade as number) >= 50],
    ["FC > 100", r.fc === 1],
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
