/**
 * Escores neurológicos: consciência, AVC e cefaleia.
 */

import type { Calculadora } from "./tipos";
import { cx } from "./tipos";

// ============================ GLASGOW ============================

export const GLASGOW: Calculadora = {
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

// ============================ NIHSS ============================

/**
 * As 11 seções da NIHSS, com a pontuação de cada opção.
 *
 * "UN" (não testável — amputação, artrodese, tubo) pontua ZERO, como no
 * PS.py. Na escala original esses itens ficam sem nota e o total não é
 * comparável; aqui vale a escolha do programa de origem, e o laudo avisa
 * quando um UN foi marcado para que o número não seja lido como se o exame
 * tivesse sido completo.
 */
const NIHSS_ITENS: { id: string; titulo: string; opcoes: [string, number][] }[] = [
  { id: "1a", titulo: "1A. NÍVEL DE CONSCIÊNCIA", opcoes: [
    ["0 - ALERTA", 0], ["1 - SONOLENTO/OBTUNDIDO", 1], ["2 - ESTUPOR", 2], ["3 - COMA", 3]] },
  { id: "1b", titulo: "1B. PERGUNTAS (MÊS E IDADE)", opcoes: [
    ["0 - AMBAS CORRETAS", 0], ["1 - UMA CORRETA", 1], ["2 - NENHUMA CORRETA", 2]] },
  { id: "1c", titulo: "1C. COMANDOS (OLHOS / MÃO)", opcoes: [
    ["0 - OBEDECE AMBOS", 0], ["1 - OBEDECE UM", 1], ["2 - NÃO OBEDECE", 2]] },
  { id: "2", titulo: "2. MELHOR OLHAR (GAZE)", opcoes: [
    ["0 - NORMAL", 0], ["1 - PARESIA PARCIAL", 1], ["2 - DESVIO FORÇADO", 2]] },
  { id: "3", titulo: "3. CAMPOS VISUAIS", opcoes: [
    ["0 - SEM PERDA", 0], ["1 - HEMIANOPSIA PARCIAL", 1], ["2 - HEMIANOPSIA COMPLETA", 2],
    ["3 - CEGUEIRA BILATERAL", 3]] },
  { id: "4", titulo: "4. PARALISIA FACIAL", opcoes: [
    ["0 - NORMAL", 0], ["1 - FRAQUEZA MÍNIMA", 1], ["2 - PARALISIA PARCIAL", 2],
    ["3 - PARALISIA COMPLETA", 3]] },
  { id: "5a", titulo: "5A. MOTOR BRAÇO ESQUERDO", opcoes: [
    ["0 - SEM QUEDA", 0], ["1 - QUEDA < 10S", 1], ["2 - NÃO SUSTENTA 10S", 2],
    ["3 - NENHUM ESFORÇO CONTRA GRAVIDADE", 3], ["4 - SEM MOVIMENTO", 4],
    ["UN - AMPUTAÇÃO/ARTRODESE", 0]] },
  { id: "5b", titulo: "5B. MOTOR BRAÇO DIREITO", opcoes: [
    ["0 - SEM QUEDA", 0], ["1 - QUEDA < 10S", 1], ["2 - NÃO SUSTENTA 10S", 2],
    ["3 - NENHUM ESFORÇO CONTRA GRAVIDADE", 3], ["4 - SEM MOVIMENTO", 4],
    ["UN - AMPUTAÇÃO/ARTRODESE", 0]] },
  { id: "6a", titulo: "6A. MOTOR PERNA ESQUERDA", opcoes: [
    ["0 - SEM QUEDA", 0], ["1 - QUEDA < 5S", 1], ["2 - NÃO SUSTENTA 5S", 2],
    ["3 - NENHUM ESFORÇO CONTRA GRAVIDADE", 3], ["4 - SEM MOVIMENTO", 4],
    ["UN - AMPUTAÇÃO/ARTRODESE", 0]] },
  { id: "6b", titulo: "6B. MOTOR PERNA DIREITA", opcoes: [
    ["0 - SEM QUEDA", 0], ["1 - QUEDA < 5S", 1], ["2 - NÃO SUSTENTA 5S", 2],
    ["3 - NENHUM ESFORÇO CONTRA GRAVIDADE", 3], ["4 - SEM MOVIMENTO", 4],
    ["UN - AMPUTAÇÃO/ARTRODESE", 0]] },
  { id: "7", titulo: "7. ATAXIA DE MEMBROS", opcoes: [
    ["0 - AUSENTE", 0], ["1 - EM UM MEMBRO", 1], ["2 - EM DOIS MEMBROS", 2],
    ["UN - AMPUTAÇÃO/ARTRODESE", 0]] },
  { id: "8", titulo: "8. SENSIBILIDADE", opcoes: [
    ["0 - NORMAL", 0], ["1 - PERDA LEVE/MODERADA", 1], ["2 - PERDA GRAVE/TOTAL", 2]] },
  { id: "9", titulo: "9. LINGUAGEM (AFASIA)", opcoes: [
    ["0 - SEM AFASIA", 0], ["1 - AFASIA LEVE/MODERADA", 1], ["2 - AFASIA GRAVE", 2],
    ["3 - MUDO/AFASIA GLOBAL", 3]] },
  { id: "10", titulo: "10. DISARTRIA", opcoes: [
    ["0 - NORMAL", 0], ["1 - LEVE/MODERADA", 1], ["2 - GRAVE/ININTELIGÍVEL OU MUDO", 2],
    ["UN - INTUBADO/OUTRA BARREIRA", 0]] },
  { id: "11", titulo: "11. NEGLIGÊNCIA/INATENÇÃO (EXTINÇÃO)", opcoes: [
    ["0 - AUSENTE", 0], ["1 - PARCIAL", 1], ["2 - PROFUNDA", 2]] },
];

export function classeNIHSS(p: number): string {
  if (p === 0) return "SEM DÉFICIT (0)";
  if (p <= 4) return "LEVE (1–4)";
  if (p <= 15) return "MODERADO (5–15)";
  if (p <= 20) return "MODERADO A GRAVE (16–20)";
  return "GRAVE (21–42)";
}

export const NIHSS: Calculadora = {
  slug: "nihss",
  nome: "NIHSS",
  subtitulo: "Gravidade do déficit neurológico no AVC (0–42)",
  grupos: NIHSS_ITENS.map((i) => ({
    titulo: i.titulo,
    criterios: [{
      id: i.id,
      label: i.titulo,
      padrao: 0,
      opcoes: i.opcoes.map(([label, pontos]) => ({ label, pontos })),
    }],
  })),
  resumo: (p) => `NIHSS ${p}/42 · ${classeNIHSS(p)}`,
  laudo: (p, r) => {
    const itens = NIHSS_ITENS.map((i) => {
      const valor = r[i.id] ?? 0;
      // "UN" e "0" pontuam igual, então o rótulo é quem diz qual foi marcado.
      const opcao = i.opcoes.find(([, pts]) => pts === valor);
      return `${i.titulo}: ${opcao ? opcao[0] : valor}`;
    });
    return cx([
      "NIHSS - RESULTADO",
      `PONTUAÇÃO: ${p}/42`,
      `CLASSIFICAÇÃO: ${classeNIHSS(p)}`,
      "",
      ...itens,
      "",
      "OBS: A NIHSS MEDE GRAVIDADE, NÃO DEFINE ELEGIBILIDADE A TROMBÓLISE SOZINHA —",
      "CORRELACIONAR COM TEMPO DE INÍCIO, IMAGEM E CONTRAINDICAÇÕES.",
    ]);
  },
};

// ============================ CINCINNATI ============================

export const CINCINNATI: Calculadora = {
  slug: "cincinnati",
  nome: "CINCINNATI",
  subtitulo: "Triagem pré-hospitalar de AVC (0–3)",
  grupos: [
    { titulo: "FACE (ASSIMETRIA)", criterios: [{ id: "face", label: "Face", padrao: 0,
      opcoes: [{ label: "NORMAL", pontos: 0 }, { label: "ANORMAL", pontos: 1 }] }] },
    { titulo: "BRAÇO (DRIFT)", criterios: [{ id: "braco", label: "Braço", padrao: 0,
      opcoes: [{ label: "NORMAL", pontos: 0 }, { label: "ANORMAL", pontos: 1 }] }] },
    { titulo: "FALA (DISARTRIA/AFASIA)", criterios: [{ id: "fala", label: "Fala", padrao: 0,
      opcoes: [{ label: "NORMAL", pontos: 0 }, { label: "ANORMAL", pontos: 1 }] }] },
  ],
  resumo: (p) => (p === 0 ? "0/3 · NENHUM ACHADO" : `${p}/3 · SUSPEITA DE AVC`),
  laudo: (p, r) => {
    const achados = [
      ["FACE (ASSIMETRIA)", r.face],
      ["BRAÇO (DRIFT)", r.braco],
      ["FALA (DISARTRIA/AFASIA)", r.fala],
    ].map(([nome, v]) => `- ${nome}: ${v ? "ANORMAL" : "NORMAL"}`);

    const conduta = p === 0
      ? ["- NENHUM DOS TRÊS ACHADOS PRESENTE.",
         "- CINCINNATI NEGATIVA NÃO EXCLUI AVC: SE A HISTÓRIA SUGERE, SEGUIR A INVESTIGAÇÃO."]
      : ["- ACIONAR PROTOCOLO DE AVC.",
         "- DEFINIR O HORÁRIO DO ÚLTIMO MOMENTO ASSINTOMÁTICO.",
         "- GLICEMIA CAPILAR, ACESSO VENOSO, MONITORIZAÇÃO.",
         "- TOMOGRAFIA DE CRÂNIO SEM CONTRASTE COM URGÊNCIA.",
         "- APLICAR NIHSS PARA GRADUAR O DÉFICIT."];

    return cx([
      "CINCINNATI - RESULTADO",
      `PONTUAÇÃO: ${p}/3`,
      ...achados,
      "",
      "CONDUTA:",
      ...conduta,
      "",
      "OBS: UM ACHADO ALTERADO JÁ SUSTENTA A SUSPEITA — A ESCALA TRIA, NÃO GRADUA.",
    ]);
  },
};
