/**
 * Abdome agudo: apendicite, pancreatite, diverticulite, vias biliares.
 */

import type { Calculadora } from "./tipos";
import { cx } from "./tipos";
import type { Resposta } from "./tipos";

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

// ============================ ATLANTA ============================

/**
 * Atlanta 2012 — gravidade da pancreatite aguda.
 *
 * Não é escore: é classificação por prevalência. Falência orgânica
 * PERSISTENTE (≥48h) define GRAVE sozinha, mesmo sem nenhuma complicação
 * marcada; falência transitória ou complicação define MODERADAMENTE GRAVE; e
 * nada marcado é LEVE. Marcar persistente e transitória ao mesmo tempo não é
 * contradição na tela — a persistente prevalece, e é isso que o laudo diz.
 */
export const ATLANTA: Calculadora = {
  slug: "atlanta",
  nome: "ATLANTA",
  subtitulo: "Gravidade da pancreatite aguda (Atlanta 2012)",
  grupos: [{
    titulo: "CRITÉRIOS",
    criterios: [
      { id: "persistente", label: "FALÊNCIA ORGÂNICA PERSISTENTE (≥48H) (RESP./CV/RENAL)", pontos: 0 },
      { id: "transitoria", label: "FALÊNCIA ORGÂNICA TRANSITÓRIA (<48H) (RESP./CV/RENAL)", pontos: 0 },
      { id: "local", label: "COMPLICAÇÕES LOCAIS (NECROSE, COLEÇÕES, PSEUDOCISTO)", pontos: 0 },
      { id: "sistemica", label: "COMPLICAÇÕES SISTÊMICAS (EXACERBAÇÃO DE COMORBIDADES)", pontos: 0 },
    ],
  }],
  resumo: (_p, r) => classeAtlanta(r).classe,
  laudo: (_p, r) => {
    const { classe, motivo } = classeAtlanta(r);
    const conduta =
      classe === "LEVE"
        ? ["- SUPORTE CLÍNICO: HIDRATAÇÃO, ANALGESIA, ANTIEMÉTICO.",
           "- REALIMENTAÇÃO ORAL PRECOCE QUANDO TOLERADO.",
           "- SEM ROTINA DE ANTIBIÓTICO (A MENOS DE INDICAÇÃO ESPECÍFICA).",
           "- AVALIAR ETIOLOGIA (BILIAR, ALCOÓLICA, HIPERTRIGLICERIDEMIA)."]
        : classe === "MODERADAMENTE GRAVE"
          ? ["- MONITORIZAÇÃO MAIS PRÓXIMA (RISCO DE PIORA).",
             "- CONSIDERAR UTI/SEMI-INTENSIVA CONFORME DISFUNÇÃO E NECESSIDADE DE SUPORTE.",
             "- IMAGEM CONFORME EVOLUÇÃO (SUSPEITA DE COMPLICAÇÃO/NECROSE).",
             "- NUTRIÇÃO ENTERAL SE IMPOSSIBILIDADE DE VIA ORAL PROLONGADA."]
          : ["- SUPORTE DE ÓRGÃOS E MANEJO EM UTI.",
             "- AVALIAR CHOQUE/INSUF. RESPIRATÓRIA/IRA: VOLUME, VASOATIVO, VNI/VM, DIÁLISE SE INDICADO.",
             "- IMAGEM ESTRATÉGICA PARA COMPLICAÇÕES; DISCUTIR COM GASTRO/CIRURGIA/UTI.",
             "- ANTIBIÓTICO APENAS SE INFECÇÃO SUSPEITA/CONFIRMADA (EX.: NECROSE INFECTADA)."];

    return cx([
      "CLASSIFICAÇÃO DE ATLANTA - PANCREATITE AGUDA",
      `CLASSIFICAÇÃO: ${classe}`,
      `CRITÉRIOS PRESENTES: ${motivo}`,
      "",
      "CONDUTA (SUGESTÃO PRÁTICA - ADAPTAR AO PROTOCOLO LOCAL):",
      ...conduta,
      "",
      "OBS: A CLASSIFICAÇÃO É APOIO; CORRELACIONAR COM EVOLUÇÃO, EXAMES, DISFUNÇÃO ORGÂNICA E PROTOCOLO DO SERVIÇO.",
      "REF: REVISED ATLANTA CLASSIFICATION (2012).",
    ]);
  },
};

function classeAtlanta(r: Resposta): { classe: string; motivo: string } {
  if (r.persistente === 1) {
    return {
      classe: "GRAVE",
      motivo: "FALÊNCIA ORGÂNICA PERSISTENTE (≥48H) (1 OU MAIS ÓRGÃOS)",
    };
  }
  const motivos: string[] = [];
  if (r.transitoria === 1) motivos.push("FALÊNCIA ORGÂNICA TRANSITÓRIA (<48H)");
  if (r.local === 1) motivos.push("COMPLICAÇÕES LOCAIS");
  if (r.sistemica === 1) motivos.push("COMPLICAÇÕES SISTÊMICAS");

  return motivos.length
    ? { classe: "MODERADAMENTE GRAVE", motivo: motivos.join(" / ") }
    : {
        classe: "LEVE",
        motivo: "SEM FALÊNCIA ORGÂNICA E SEM COMPLICAÇÕES LOCAIS OU SISTÊMICAS",
      };
}

// ============================ HINCHEY ============================

const HINCHEY_ESTAGIOS = [
  {
    rotulo: "HINCHEY I - ABSCESSO/PERITONITE PERICÓLICA (MICROPERFURAÇÃO)",
    descricao: "HINCHEY I: ABSCESSO/PERITONITE PERICÓLICA (MICROPERFURAÇÃO)",
    risco: "GERALMENTE MANEJO CLÍNICO; DRENAGEM SE ABSCESSO SELECIONADO",
    conduta: [
      "- TRATAMENTO CLÍNICO (ANALGESIA, HIDRATAÇÃO, DIETA CONFORME TOLERÂNCIA).",
      "- ANTIBIÓTICO SE INDICADO PELO SERVIÇO (COMPLICADA/ABSCESSO).",
      "- IMAGEM/REAVALIAÇÃO SERIADA; ALTA COM ORIENTAÇÕES SE ESTÁVEL E BOM CONTROLE.",
    ],
  },
  {
    rotulo: "HINCHEY II - ABSCESSO PÉLVICO / INTRA-ABDOMINAL / RETROPERITONEAL (DISTANTE)",
    descricao: "HINCHEY II: ABSCESSO DISTANTE (PÉLVICO/INTRA-ABD./RETROPERITONEAL)",
    risco: "ANTIBIÓTICO + CONSIDERAR DRENAGEM PERCUTÂNEA; CIRURGIA SE FALHA/INSTABILIDADE",
    conduta: [
      "- ANTIBIÓTICO + AVALIAR DRENAGEM PERCUTÂNEA (ABSCESSO MAIOR OU ACESSÍVEL).",
      "- INTERNAÇÃO E MONITORIZAÇÃO; CIRURGIA SE FALHA, PIORA OU INSTABILIDADE.",
    ],
  },
  {
    rotulo: "HINCHEY III - PERITONITE PURULENTA GENERALIZADA",
    descricao: "HINCHEY III: PERITONITE PURULENTA GENERALIZADA",
    risco: "GERALMENTE NECESSITA AVALIAÇÃO CIRÚRGICA URGENTE",
    conduta: [
      "- AVALIAÇÃO CIRÚRGICA URGENTE.",
      "- SUPORTE (ACESSO, VOLUME, ANALGESIA, ANTIBIÓTICO DE AMPLO ESPECTRO).",
      "- INVESTIGAR/CONTROLAR FOCO CONFORME ESTRATÉGIA DO SERVIÇO.",
    ],
  },
  {
    rotulo: "HINCHEY IV - PERITONITE FECAL GENERALIZADA",
    descricao: "HINCHEY IV: PERITONITE FECAL GENERALIZADA",
    risco: "EMERGÊNCIA CIRÚRGICA (ALTO RISCO) + SUPORTE INTENSIVO",
    conduta: [
      "- EMERGÊNCIA CIRÚRGICA.",
      "- SUPORTE INTENSIVO + ANTIBIÓTICO AMPLO; MANEJO DE SEPSE/CHOQUE SE PRESENTE.",
      "- DISCUSSÃO IMEDIATA COM CIRURGIA/UTI.",
    ],
  },
];

/**
 * Hinchey — estágio da diverticulite complicada.
 *
 * Aqui a "pontuação" é o índice do estágio, não uma soma: I a IV são
 * mutuamente exclusivos e vêm de achado de imagem ou de cirurgia.
 */
export const HINCHEY: Calculadora = {
  slug: "hinchey",
  nome: "HINCHEY",
  subtitulo: "Estágio da diverticulite complicada",
  grupos: [{
    titulo: "SELECIONE O ESTÁGIO",
    criterios: [{
      id: "estagio",
      label: "Estágio",
      padrao: 0,
      opcoes: HINCHEY_ESTAGIOS.map((e, i) => ({ label: e.rotulo, pontos: i })),
    }],
  }],
  resumo: (_p, r) => HINCHEY_ESTAGIOS[r.estagio ?? 0].descricao,
  laudo: (_p, r) => {
    const e = HINCHEY_ESTAGIOS[r.estagio ?? 0];
    return cx([
      "HINCHEY - DIVERTICULITE COMPLICADA (RESULTADO)",
      `ESTÁGIO: ${["I", "II", "III", "IV"][r.estagio ?? 0]}`,
      e.descricao,
      e.risco,
      "",
      "CONDUTA (SUGESTÃO PRÁTICA - ADAPTAR AO PROTOCOLO LOCAL):",
      ...e.conduta,
      "",
      "OBS: A DECISÃO DEPENDE DO QUADRO CLÍNICO, DA TC, DAS COMORBIDADES E DA DISPONIBILIDADE DE DRENAGEM/CIRURGIA.",
      "REF: CLASSIFICAÇÃO DE HINCHEY (DIVERTICULITE COMPLICADA).",
    ]);
  },
};
