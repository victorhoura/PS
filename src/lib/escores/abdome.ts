/**
 * Abdome agudo: apendicite, pancreatite, diverticulite, vias biliares.
 */

import type { Calculadora } from "./tipos";
import { cx } from "./tipos";

// ============================ ALVARADO ============================

export const ALVARADO: Calculadora = {
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
