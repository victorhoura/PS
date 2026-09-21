/**
 * Vias biliares: Tokyo (TG18) para colangite e colecistite, e a
 * tríade/pêntade clássicas.
 *
 * Nenhum dos três é somatório. TG18 tem duas perguntas empilhadas — primeiro
 * SE é (critérios A/B/C), depois QUÃO GRAVE é (I, II ou III) — e as duas
 * andam separadas: dá para ter gravidade marcada sem o diagnóstico fechar, e
 * o laudo tem que dizer as duas coisas em vez de misturá-las num número.
 */

import type { Calculadora, Resposta, Valores } from "./tipos";
import { cx } from "./tipos";

const num = (v: Valores, id: string): number | null => {
  const x = v[id];
  return x === null || x === undefined || Number.isNaN(x) ? null : x;
};

const sn = (b: boolean) => (b ? "SIM" : "NÃO");

// ======================= TOKYO - COLANGITE =======================

/**
 * A = inflamação sistêmica, B = colestase, C = imagem.
 *
 * A + (B ou C) é SUSPEITA; A + B + C é DEFINITIVA. A é obrigatório nos dois:
 * colestase com imagem alterada e sem inflamação nenhuma é obstrução biliar,
 * não colangite.
 */
export const TOKYO_COLANGITE: Calculadora = {
  slug: "tokyo-colangite",
  nome: "TOKYO — COLANGITE",
  subtitulo: "Diagnóstico e gravidade da colangite aguda (TG18)",
  campos: [
    { id: "bilirrubina", label: "BILIRRUBINA TOTAL", unidade: "mg/dL" },
    { id: "leuco", label: "LEUCÓCITOS", unidade: "/mm³" },
    { id: "temp", label: "TEMPERATURA", unidade: "°C" },
    { id: "idade", label: "IDADE", unidade: "anos" },
  ],
  grupos: [
    {
      titulo: "A — INFLAMAÇÃO SISTÊMICA",
      criterios: [
        { id: "a_febre", label: "FEBRE E/OU CALAFRIOS", pontos: 0 },
        { id: "a_lab", label: "INFLAMAÇÃO LABORATORIAL (LEUCOGRAMA/PCR)", pontos: 0 },
      ],
    },
    {
      titulo: "B — COLESTASE",
      criterios: [
        { id: "b_lft", label: "ENZIMAS HEPÁTICAS ALTERADAS (FA/GGT/TGO/TGP)", pontos: 0 },
      ],
    },
    {
      titulo: "C — IMAGEM",
      criterios: [
        { id: "c_dilatacao", label: "DILATAÇÃO DE VIA BILIAR", pontos: 0 },
        { id: "c_etiologia", label: "ETIOLOGIA NA IMAGEM (CÁLCULO/ESTENOSE/STENT)", pontos: 0 },
      ],
    },
    {
      titulo: "GRAU III — DISFUNÇÃO ORGÂNICA (QUALQUER UMA BASTA)",
      criterios: [
        { id: "g3_vaso", label: "CHOQUE / USO DE VASOPRESSOR", pontos: 0 },
        { id: "g3_neuro", label: "ALTERAÇÃO NEUROLÓGICA", pontos: 0 },
        { id: "g3_resp", label: "RESPIRATÓRIO GRAVE (PAO2/FIO2 < 300)", pontos: 0 },
        { id: "g3_renal", label: "RENAL (CREATININA > 2 OU OLIGÚRIA)", pontos: 0 },
        { id: "g3_hep", label: "HEPÁTICO (INR > 1,5)", pontos: 0 },
        { id: "g3_heme", label: "HEMATOLÓGICO (PLAQUETAS < 100 MIL)", pontos: 0 },
      ],
    },
    {
      titulo: "GRAU II — OUTROS CRITÉRIOS",
      criterios: [{ id: "g2_albumina", label: "ALBUMINA BAIXA", pontos: 0 }],
    },
  ],
  resumo: (_p, r, v) => {
    const d = colangite(r, v);
    return `${d.diagnostico} · ${d.gravidade}`;
  },
  laudo: (_p, r, v) => {
    const d = colangite(r, v);
    const drenagem = d.gravidade.startsWith("GRAU I ")
      ? "- GRAU I: PODE RESPONDER A TRATAMENTO CLÍNICO; REAVALIAR NECESSIDADE DE DRENAGEM."
      : "- GRAU II/III: DRENAGEM BILIAR O QUANTO ANTES (CONFORME RECURSO/ENDOSCOPIA).";

    return cx([
      "TOKYO GUIDELINES (TG18) - COLANGITE AGUDA",
      "",
      `DIAGNÓSTICO: ${d.diagnostico}`,
      `GRAVIDADE: ${d.gravidade}`,
      "",
      "CONDUTA (GERAL):",
      "- SUPORTE + ANTIBIÓTICO PRECOCE.",
      "- AVALIAR OBSTRUÇÃO BILIAR E NECESSIDADE DE DRENAGEM.",
      drenagem,
      "",
      "CHECKLIST:",
      `- A (INFLAMAÇÃO SISTÊMICA): ${sn(d.a)}`,
      `- B (COLESTASE): ${sn(d.b)}`,
      `- C (IMAGEM): ${sn(d.c)}`,
      "",
      `CRITÉRIOS DE GRAU II PRESENTES: ${d.criteriosG2.length} DE 5`,
      ...(d.criteriosG2.length ? [`- ${d.criteriosG2.join("\n- ")}`] : []),
      ...(d.disfuncoes.length ? ["", `DISFUNÇÃO ORGÂNICA: ${d.disfuncoes.join(", ")}`] : []),
      "",
      "REFERÊNCIA: TG18 (TOKYO GUIDELINES).",
      d.notaGrau2,
    ]);
  },
};

function colangite(r: Resposta, v: Valores) {
  const a = r.a_febre === 1 || r.a_lab === 1;
  const bili = num(v, "bilirrubina");
  const b = (bili !== null && bili >= 2.0) || r.b_lft === 1;
  const c = r.c_dilatacao === 1 || r.c_etiologia === 1;

  const diagnostico =
    a && b && c
      ? "COLANGITE DEFINITIVA (TG18)"
      : a && (b || c)
        ? "SUSPEITA DE COLANGITE (TG18)"
        : "CRITÉRIOS INSUFICIENTES PARA SUSPEITA (TG18)";

  const disfuncoes: string[] = [];
  if (r.g3_vaso === 1) disfuncoes.push("CARDIOVASCULAR");
  if (r.g3_neuro === 1) disfuncoes.push("NEUROLÓGICA");
  if (r.g3_resp === 1) disfuncoes.push("RESPIRATÓRIA");
  if (r.g3_renal === 1) disfuncoes.push("RENAL");
  if (r.g3_hep === 1) disfuncoes.push("HEPÁTICA");
  if (r.g3_heme === 1) disfuncoes.push("HEMATOLÓGICA");

  const leuco = num(v, "leuco");
  const temp = num(v, "temp");
  const idade = num(v, "idade");

  const criteriosG2: string[] = [];
  if (leuco !== null && (leuco > 12000 || leuco < 4000)) {
    criteriosG2.push(`LEUCÓCITOS ${Math.round(leuco)} (>12.000 OU <4.000)`);
  }
  if (temp !== null && temp >= 39.0) criteriosG2.push(`TEMPERATURA ${temp} °C (≥39)`);
  if (idade !== null && idade >= 75) criteriosG2.push(`IDADE ${Math.round(idade)} ANOS (≥75)`);
  if (bili !== null && bili >= 5.0) criteriosG2.push(`BILIRRUBINA ${bili} MG/DL (≥5)`);
  if (r.g2_albumina === 1) criteriosG2.push("ALBUMINA BAIXA");

  /**
   * O PS.py fecha GRAU II com UM critério; o TG18 publicado pede DOIS de
   * cinco. Mantive o corte do programa de origem — errar para mais aqui
   * antecipa drenagem, e o contrário atrasaria — mas o laudo imprime a
   * contagem e esta nota, para ninguém ler "TG18 grau II" sem saber com
   * quantos critérios ele fechou.
   */
  const gravidade = disfuncoes.length
    ? "GRAU III (GRAVE)"
    : criteriosG2.length >= 1
      ? "GRAU II (MODERADA)"
      : "GRAU I (LEVE)";

  const notaGrau2 =
    criteriosG2.length === 1
      ? "NOTA: ESTE GRAU II FECHOU COM 1 CRITÉRIO. O TG18 PUBLICADO EXIGE 2 DE 5."
      : "";

  return { a, b, c, diagnostico, gravidade, disfuncoes, criteriosG2, notaGrau2 };
}

// ======================= TOKYO - COLECISTITE =======================

/** A = sinal local, B = sinal sistêmico, C = imagem. A + B já é suspeita. */
export const TOKYO_COLECISTITE: Calculadora = {
  slug: "tokyo-colecistite",
  nome: "TOKYO — COLECISTITE",
  subtitulo: "Diagnóstico e gravidade da colecistite aguda (TG18)",
  campos: [{ id: "leuco", label: "LEUCÓCITOS", unidade: "/mm³" }],
  grupos: [
    {
      titulo: "A — SINAIS LOCAIS",
      criterios: [
        { id: "a_murphy", label: "SINAL DE MURPHY", pontos: 0 },
        { id: "a_qsd", label: "DOR/MASSA/SENSIBILIDADE EM QSD", pontos: 0 },
      ],
    },
    {
      titulo: "B — SINAIS SISTÊMICOS",
      criterios: [
        { id: "b_febre", label: "FEBRE", pontos: 0 },
        { id: "b_lab", label: "INFLAMAÇÃO LABORATORIAL (LEUCOGRAMA/PCR)", pontos: 0 },
      ],
    },
    {
      titulo: "C — IMAGEM",
      criterios: [{ id: "c_imagem", label: "IMAGEM COMPATÍVEL (US/TC/RM)", pontos: 0 }],
    },
    {
      titulo: "GRAVIDADE",
      criterios: [
        { id: "g3_orgao", label: "GRAU III: DISFUNÇÃO ORGÂNICA (QUALQUER)", pontos: 0 },
        { id: "g2_72h", label: "DURAÇÃO DOS SINTOMAS > 72H", pontos: 0 },
        { id: "g2_massa", label: "MASSA DOLOROSA PALPÁVEL EM QSD", pontos: 0 },
        { id: "g2_local", label: "INFLAMAÇÃO LOCAL MARCADA (GANGRENA/ABSCESSO/PERITONITE)", pontos: 0 },
      ],
    },
  ],
  resumo: (_p, r, v) => {
    const d = colecistite(r, v);
    return `${d.diagnostico} · ${d.gravidade}`;
  },
  laudo: (_p, r, v) => {
    const d = colecistite(r, v);
    const especifica = d.gravidade.startsWith("GRAU III")
      ? "- GRAU III: MANEJO EM CENTRO AVANÇADO; CONSIDERAR DRENAGEM (COLECISTOSTOMIA) ESTRATÉGICA."
      : d.gravidade.startsWith("GRAU II")
        ? "- GRAU II: INTERNAÇÃO; AVALIAR COLECISTECTOMIA PRECOCE OU DRENAGEM CONFORME RISCO."
        : "- GRAU I: EM GERAL COLECISTECTOMIA PRECOCE SE ELEGÍVEL; INTERNAÇÃO CONFORME QUADRO.";

    return cx([
      "TOKYO GUIDELINES (TG18) - COLECISTITE AGUDA",
      "",
      `DIAGNÓSTICO: ${d.diagnostico}`,
      `GRAVIDADE: ${d.gravidade}`,
      "",
      "CONDUTA (GERAL):",
      "- SUPORTE + ANTIBIÓTICO SE INDICADO + AVALIAR CIRURGIA/INTERVENÇÃO CONFORME GRAVIDADE E RISCO.",
      especifica,
      "",
      "CHECKLIST:",
      `- A (LOCAL): ${sn(d.a)}`,
      `- B (SISTÊMICO): ${sn(d.b)}`,
      `- C (IMAGEM): ${sn(d.c)}`,
      ...(d.motivosG2.length ? ["", `CRITÉRIOS DE GRAU II: ${d.motivosG2.join(", ")}`] : []),
      "",
      "REFERÊNCIA: TG18 (TOKYO GUIDELINES).",
    ]);
  },
};

function colecistite(r: Resposta, v: Valores) {
  const a = r.a_murphy === 1 || r.a_qsd === 1;
  const b = r.b_febre === 1 || r.b_lab === 1;
  const c = r.c_imagem === 1;

  const diagnostico =
    a && b && c
      ? "COLECISTITE DEFINITIVA (TG18)"
      : a && b
        ? "SUSPEITA DE COLECISTITE (TG18)"
        : "CRITÉRIOS INSUFICIENTES PARA SUSPEITA (TG18)";

  const leuco = num(v, "leuco");
  const motivosG2: string[] = [];
  if (leuco !== null && leuco > 18000) motivosG2.push(`LEUCÓCITOS ${Math.round(leuco)} (>18.000)`);
  if (r.g2_72h === 1) motivosG2.push("SINTOMAS > 72H");
  if (r.g2_massa === 1) motivosG2.push("MASSA PALPÁVEL EM QSD");
  if (r.g2_local === 1) motivosG2.push("INFLAMAÇÃO LOCAL MARCADA");

  const gravidade =
    r.g3_orgao === 1
      ? "GRAU III (GRAVE)"
      : motivosG2.length
        ? "GRAU II (MODERADA)"
        : "GRAU I (LEVE)";

  return { a, b, c, diagnostico, gravidade, motivosG2 };
}

// ==================== CHARCOT / REYNOLDS ====================

/**
 * Os clássicos à beira do leito. Tríade completa sugere colangite; pêntade
 * (tríade + hipotensão + alteração do sensório) sugere colangite grave.
 *
 * Tríade incompleta NÃO exclui — a maioria dos pacientes com colangite não
 * fecha as três —, e é por isso que o ramo negativo manda para o TG18 em vez
 * de encerrar o assunto.
 */
export const CHARCOT: Calculadora = {
  slug: "charcot-reynolds",
  nome: "CHARCOT / REYNOLDS",
  subtitulo: "Tríade e pêntade clássicas da colangite",
  grupos: [{
    titulo: "CHECKLIST CLÍNICO",
    criterios: [
      { id: "febre", label: "FEBRE/CALAFRIOS", pontos: 1 },
      { id: "dor", label: "DOR EM QSD", pontos: 1 },
      { id: "ictericia", label: "ICTERÍCIA", pontos: 1 },
      { id: "hipotensao", label: "HIPOTENSÃO/CHOQUE", pontos: 1 },
      { id: "sensorio", label: "ALTERAÇÃO DO SENSÓRIO", pontos: 1 },
    ],
  }],
  resumo: (_p, r) => {
    const { triade, pentade } = contarCharcot(r);
    if (pentade === 5) return "PÊNTADE DE REYNOLDS POSITIVA";
    if (triade === 3) return "TRÍADE DE CHARCOT POSITIVA";
    return `TRÍADE ${triade}/3 · PÊNTADE ${pentade}/5`;
  },
  laudo: (_p, r) => {
    const { triade, pentade } = contarCharcot(r);
    const conduta =
      pentade === 5
        ? ["RESULTADO: PÊNTADE DE REYNOLDS POSITIVA (ALTA SUSPEITA DE COLANGITE GRAVE / SEPSE).",
           "CONDUTA:",
           "- ABC + MONITORIZAÇÃO + ACESSO CALIBROSO.",
           "- PROTOCOLO DE SEPSE CONFORME SERVIÇO (LACTATO, HEMOCULTURAS ANTES DO ATB SE POSSÍVEL, FLUIDOS SE INDICADO).",
           "- ANTIBIÓTICO IMEDIATO.",
           "- AVALIAR URGÊNCIA DE DRENAGEM BILIAR (ENDOSCÓPICA/PERCUTÂNEA) E ACIONAR GASTRO/CIRURGIA.",
           "- CONSIDERAR UTI."]
        : triade === 3
          ? ["RESULTADO: TRÍADE DE CHARCOT POSITIVA (SUGERE COLANGITE).",
             "CONDUTA:",
             "- COLETAR LABS (HEMOGRAMA, PCR, FUNÇÃO HEPÁTICA, BILIRRUBINAS, FUNÇÃO RENAL, LACTATO SE GRAVIDADE).",
             "- HEMOCULTURAS SE FEBRE.",
             "- INICIAR ANTIBIÓTICO.",
             "- IMAGEM (US/TC) CONFORME CONTEXTO.",
             "- AVALIAR OBSTRUÇÃO E NECESSIDADE DE DRENAGEM BILIAR SE NÃO MELHORA OU SE HÁ SINAIS DE GRAVIDADE."]
          : ["RESULTADO: NÃO FECHA A TRÍADE COMPLETA.",
             "OBS:",
             "- A AUSÊNCIA DA TRÍADE NÃO EXCLUI COLANGITE.",
             "- SE HÁ SUSPEITA CLÍNICA, AVALIAR PELOS CRITÉRIOS DE TÓQUIO (TG18) E EXAMES COMPLEMENTARES."];

    return cx([
      "COLANGITE - TRÍADE DE CHARCOT / PÊNTADE DE REYNOLDS",
      "",
      "ITENS MARCADOS:",
      `- FEBRE/CALAFRIOS: ${sn(r.febre === 1)}`,
      `- DOR EM QSD: ${sn(r.dor === 1)}`,
      `- ICTERÍCIA: ${sn(r.ictericia === 1)}`,
      `- HIPOTENSÃO/CHOQUE: ${sn(r.hipotensao === 1)}`,
      `- ALTERAÇÃO DO SENSÓRIO: ${sn(r.sensorio === 1)}`,
      "",
      `TRÍADE DE CHARCOT: ${triade}/3`,
      `PÊNTADE DE REYNOLDS: ${pentade}/5`,
      "",
      ...conduta,
      "",
      "NOTA:",
      "- TRÍADE E PÊNTADE SÃO CLÁSSICOS CLÍNICOS; O TG18 É MAIS SISTEMÁTICO PARA DIAGNÓSTICO E GRAVIDADE.",
    ]);
  },
};

function contarCharcot(r: Resposta) {
  const triade = (r.febre ?? 0) + (r.dor ?? 0) + (r.ictericia ?? 0);
  return { triade, pentade: triade + (r.hipotensao ?? 0) + (r.sensorio ?? 0) };
}
