/**
 * Distúrbios do sódio e do potássio.
 *
 * Estes quatro não são escores: são contas e condutas. O que entra são
 * números medidos — peso, sódio, potássio — e o que sai é volume, taxa de
 * infusão e checklist. Por isso não têm pontuação nenhuma, e o resumo do
 * topo carrega o valor, não uma nota.
 *
 * A trava comum aos quatro: sem os campos preenchidos, o laudo PEDE os
 * dados em vez de calcular com zero. Uma conta de reposição feita sobre
 * peso vazio devolve volume zero, e volume zero num laudo é uma prescrição
 * errada com cara de resultado.
 */

import type { Calculadora, Valores } from "./tipos";
import { cx, n0, n1 } from "./tipos";

const num = (v: Valores, id: string): number | null => {
  const x = v[id];
  return x === null || x === undefined || Number.isNaN(x) ? null : x;
};

/** Água corporal total pelo fator de sexo, como no PS.py. */
const agua = (peso: number, mulher: boolean) => peso * (mulher ? 0.5 : 0.6);

const SEXO = {
  id: "sexo",
  label: "Sexo",
  padrao: 0,
  opcoes: [
    { label: "HOMEM (ÁGUA CORPORAL 60% DO PESO)", pontos: 0 },
    { label: "MULHER (ÁGUA CORPORAL 50% DO PESO)", pontos: 1 },
  ],
};

// ======================== HIPONATREMIA ========================

/** NaCl 3% tem 513 mEq de sódio por litro. */
const NACL3 = 513.0;

export const HIPONATREMIA: Calculadora = {
  slug: "hiponatremia",
  nome: "HIPONATREMIA",
  subtitulo: "Déficit de sódio e volume de NaCl 3%",
  campos: [
    { id: "peso", label: "PESO", unidade: "kg" },
    { id: "na", label: "SÓDIO ATUAL", unidade: "mEq/L" },
    { id: "alvo", label: "SÓDIO DESEJADO", unidade: "mEq/L" },
  ],
  grupos: [{ titulo: "SEXO", criterios: [SEXO] }],
  resumo: (_p, r, v) => {
    const c = contaHipoNa(r.sexo === 1, v);
    if (!c) return "PREENCHA PESO, SÓDIO ATUAL E SÓDIO DESEJADO";
    return `DÉFICIT ${n0(c.deficit)} mEq · ${n0(c.volumeSeguro)} mL DE NACL 3% EM 24H`;
  },
  laudo: (_p, r, v) => {
    const c = contaHipoNa(r.sexo === 1, v);
    if (!c) return "PREENCHA PESO, SÓDIO ATUAL E SÓDIO DESEJADO COM VALORES VÁLIDOS.";

    return cx([
      `DÉFICIT DE NA+ = ${n0(c.deficit)} MEQ`,
      "",
      `PARA ESTE PACIENTE SÃO NECESSÁRIOS ${n0(c.volumeTotal)} ML DE NACL 3% PARA CORRIGIR O ` +
        `DÉFICIT DE ${n0(c.deficit)} MEQ DE NA+, COM POTENCIAL DE ELEVAR A [NA+] SÉRICO EM ATÉ ` +
        `${n1(c.delta)} MEQ/L SE INFUNDIDO EM 24 HORAS.`,
      "",
      "CONSIDERANDO QUE A ELEVAÇÃO MÁXIMA SEGURA NA [NA+] SÉRICO É DE ATÉ 8 MEQ/L EM 24 HORAS, " +
        `UTILIZAREMOS ${n0(c.volumeSeguro)} ML DE NACL 3%, VOLUME PREVISTO PARA CAUSAR ESTA ` +
        "ELEVAÇÃO EM 24 HORAS.",
      "",
      `INFUSÃO DE ${n0(c.volumeSeguro)} ML NACL 3% EM 24 HORAS`,
      "",
      `55 ML NACL 20% + 445 ML SF 0,9% EV  ${n0(c.taxa)} ML/H`,
      "",
      "☞ SOLICITAR [NA+] SÉRICO A CADA 2 HORAS",
      ...(c.delta > 8
        ? ["", "OBS: O ALVO PEDIDO SUPERA 8 MEQ/L EM 24H. O VOLUME ACIMA JÁ ESTÁ LIMITADO AO SEGURO."]
        : []),
    ]);
  },
};

function contaHipoNa(mulher: boolean, v: Valores) {
  const peso = num(v, "peso");
  const na = num(v, "na");
  const alvo = num(v, "alvo");
  if (peso === null || na === null || alvo === null) return null;
  if (peso <= 0 || na <= 0 || alvo <= 0) return null;

  const tbw = agua(peso, mulher);
  // Alvo abaixo do sódio atual não é correção de hiponatremia: zera.
  const delta = Math.max(0, alvo - na);
  const deficit = tbw * delta;
  const volumeTotal = (deficit / NACL3) * 1000;

  // A elevação segura é de até 8 mEq/L em 24h, doa o que o alvo pedir.
  const deltaSeguro = Math.min(delta, 8.0);
  const volumeSeguro = ((tbw * deltaSeguro) / NACL3) * 1000;

  return { tbw, delta, deficit, volumeTotal, volumeSeguro, taxa: volumeSeguro / 24 };
}

// ======================== HIPERNATREMIA ========================

/** Adrogué–Madias: ΔNa por litro = (Na da solução − Na sérico) / (ACT + 1). */
function volumeParaDelta(naSerico: number, tbw: number, naSolucao: number, deltaNa: number) {
  const denominador = naSolucao - naSerico;
  if (denominador === 0) return null;
  return Math.abs((deltaNa * (tbw + 1)) / denominador);
}

const SOLUCOES: { nome: string; na: number; preparo?: string }[] = [
  { nome: "ÁGUA LIVRE", na: 0 },
  { nome: "SORO GLICOSADO 5%", na: 0 },
  { nome: "SOLUÇÃO SALINA 0,45%", na: 77, preparo: "250 ML SF 0,9% + 250 ML AD" },
  { nome: "SOLUÇÃO SALINA 0,225%", na: 38.5, preparo: "125 ML SF 0,9% + 375 ML AD" },
];

export const HIPERNATREMIA: Calculadora = {
  slug: "hipernatremia",
  nome: "HIPERNATREMIA",
  subtitulo: "Volume de água livre pelas primeiras 24 horas (Adrogué–Madias)",
  campos: [
    { id: "peso", label: "PESO", unidade: "kg" },
    { id: "na", label: "SÓDIO SÉRICO", unidade: "mEq/L" },
  ],
  grupos: [{ titulo: "SEXO", criterios: [SEXO] }],
  resumo: (_p, r, v) => {
    const c = contaHiperNa(r.sexo === 1, v);
    if (c === null) return "PREENCHA PESO E SÓDIO SÉRICO";
    if (c === "semHipernatremia") return "NA ≤ 145 · NÃO HÁ HIPERNATREMIA A CORRIGIR";
    return `REDUZIR ATÉ ${n1(c.reducao)} mEq/L EM 24H · SG 5% ${n0(c.volumes[1] ?? 0)} mL`;
  },
  laudo: (_p, r, v) => {
    const c = contaHiperNa(r.sexo === 1, v);
    if (c === null) return "PREENCHA PESO E SÓDIO SÉRICO COM VALORES VÁLIDOS.";
    if (c === "semHipernatremia") {
      return "NA SÉRICO ≤ 145: NÃO HÁ HIPERNATREMIA PARA CORRIGIR NESTA CALCULADORA.";
    }

    const fmt = (i: number) => (c.volumes[i] === null ? "-" : `${n0(c.volumes[i] as number)} ML`);
    const taxa = (i: number) =>
      c.volumes[i] === null ? "-" : `${n0((c.volumes[i] as number) / 24)} ML/H`;

    return cx([
      "HIPERNATREMIA - PRIMEIRAS 24 HORAS",
      `PESO: ${n1(c.peso)} KG | SEXO: ${r.sexo === 1 ? "MULHER" : "HOMEM"} | NA: ${n1(c.na)} MEQ/L`,
      `OBJETIVO: REDUZIR ATÉ ${n1(c.reducao)} MEQ/L EM 24H (MÁXIMO 8/24H, SEM PASSAR DE 145).`,
      "",
      "VOLUME NECESSÁRIO PARA CAUSAR ESTA REDUÇÃO (POR SOLUÇÃO):",
      ...SOLUCOES.map((s, i) => `- ${s.nome} = ${fmt(i)}`),
      "",
      "INFUSÃO EM 24 HORAS:",
      `- SORO GLICOSADO 5% EV ${taxa(1)}`,
      ...SOLUCOES.slice(2).map((s, i) => `- ${s.nome}: ${s.preparo}  EV ${taxa(i + 2)}`),
      "",
      "CONSIDERAÇÕES:",
      "☞ SOLICITAR NA+ SÉRICO A CADA 2 HORAS",
      "☞ PREFERIR A VIA ENTERAL, SE DISPONÍVEL",
    ]);
  },
};

function contaHiperNa(mulher: boolean, v: Valores) {
  const peso = num(v, "peso");
  const na = num(v, "na");
  if (peso === null || na === null || peso <= 0 || na <= 0) return null;
  if (na <= 145) return "semHipernatremia" as const;

  const tbw = agua(peso, mulher);
  // Reduz no máximo 8 por dia, e nunca abaixo de 145.
  const reducao = Math.min(8.0, na - 145.0);
  const volumes = SOLUCOES.map((s) => {
    const litros = volumeParaDelta(na, tbw, s.na, -reducao);
    return litros === null ? null : litros * 1000;
  });

  return { peso, na, tbw, reducao, volumes };
}

// ======================== HIPOCALEMIA ========================

export const HIPOCALEMIA: Calculadora = {
  slug: "hipocalemia",
  nome: "HIPOCALEMIA",
  subtitulo: "Classificação e reposição de potássio",
  campos: [{ id: "k", label: "POTÁSSIO", unidade: "mEq/L" }],
  grupos: [{
    titulo: "CONTEXTO",
    criterios: [
      { id: "sintomas", label: "SINTOMAS (FRAQUEZA, CÃIBRAS, ÍLEO, ARRITMIA)", pontos: 0 },
      { id: "ecg", label: "ALTERAÇÕES NO ECG", pontos: 0 },
      { id: "semVo", label: "VIA ORAL IMPOSSÍVEL", pontos: 0 },
    ],
  }],
  resumo: (_p, r, v) => {
    const k = num(v, "k");
    if (k === null) return "PREENCHA O POTÁSSIO";
    return `K ${n1(k)} mEq/L · ${classeHipoK(k, r.sintomas === 1, r.ecg === 1)}`;
  },
  laudo: (_p, r, v) => {
    const k = num(v, "k");
    if (k === null) return "PREENCHA O POTÁSSIO COM UM VALOR VÁLIDO.";

    const sintomas = r.sintomas === 1;
    const ecg = r.ecg === 1;
    const classe = classeHipoK(k, sintomas, ecg);

    const conduta =
      classe === "NORMAL"
        ? ["K DENTRO DA NORMALIDADE.",
           "SE HÁ SUSPEITA CLÍNICA OU ERRO LABORATORIAL: REPETIR EXAME E AVALIAR MAGNÉSIO."]
        : classe === "LEVE"
          ? ["CONDUTA (LEVE):",
             "- PREFERIR REPOSIÇÃO VIA ORAL (KCL).",
             "- DOSE TÍPICA: 20–40 MEQ/DIA, FRACIONAR (EX.: 10–20 MEQ 12/12H).",
             "- ORIENTAR REVISÃO DE DIURÉTICOS/LAXANTES E DIETA.",
             "- CONSIDERAR DOSAR/CORRIGIR MG SE SUSPEITA.",
             "- REAVALIAR K EM 24–48H (OU ANTES SE RISCO)."]
          : classe === "MODERADA"
            ? ["CONDUTA (MODERADA):",
               "- VIA ORAL SE TOLERADO/SEGURO: 40–80 MEQ/DIA, FRACIONADO.",
               "- SE VO IMPOSSÍVEL OU INTOLERÂNCIA: CONSIDERAR EV LENTO.",
               "- MONITORIZAR K SERIADO (FREQUÊNCIA CONFORME RISCO/PROTOCOLO).",
               "- CONSIDERAR DOSAR/CORRIGIR MAGNÉSIO (COEXISTÊNCIA FREQUENTE)."]
            : ["CONDUTA (GRAVE, OU COM ECG/SINTOMAS):",
               "- MONITORIZAÇÃO (ECG) E TRATAR EM AMBIENTE COM SUPORTE.",
               "- REPOSIÇÃO EV DE KCL (NUNCA EM BÓLUS).",
               "- ACESSO PERIFÉRICO: ATÉ 10 MEQ/H.",
               "- ACESSO CENTRAL + MONITOR: ATÉ 20 MEQ/H (CONFORME PROTOCOLO LOCAL).",
               "- DOSAR K A CADA 2–4H ATÉ ESTABILIZAR (CONFORME PROTOCOLO).",
               "- CORRIGIR HIPOMAGNESEMIA SE PRESENTE (CAUSA DE REFRATARIEDADE)."];

    return cx([
      "HIPOCALEMIA - CONDUTA",
      `K+ ATUAL: ${k.toFixed(2).replace(".", ",")} MEQ/L`,
      `CLASSE: ${classe}`,
      `SINTOMAS: ${sintomas ? "SIM" : "NÃO"}`,
      `ECG: ${ecg ? "ALTERADO" : "NÃO RELATADO"}`,
      `VO IMPOSSÍVEL: ${r.semVo === 1 ? "SIM" : "NÃO"}`,
      "",
      ...conduta,
      ...(r.semVo === 1 && (classe === "LEVE" || classe === "MODERADA")
        ? ["", "OBS: VIA ORAL MARCADA COMO IMPOSSÍVEL — USAR A ROTA EV DESTA MESMA CLASSE."]
        : []),
      "",
      "LEMBRETES:",
      "- INVESTIGAR CAUSA (DIURÉTICOS, VÔMITOS/DIARREIA, ALCALOSE, INSULINA/BETA2, HIPERALDOSTERONISMO).",
      "- HIPOMAGNESEMIA NÃO CORRIGIDA MANTÉM A HIPOCALEMIA REFRATÁRIA.",
    ]);
  },
};

/** ECG alterado ou sintoma joga direto para GRAVE, qualquer que seja o K. */
function classeHipoK(k: number, sintomas: boolean, ecg: boolean): string {
  if (k < 2.5 || sintomas || ecg) return "GRAVE";
  if (k < 3.0) return "MODERADA";
  if (k < 3.5) return "LEVE";
  return "NORMAL";
}

// ======================== HIPERCALEMIA ========================

export const HIPERCALEMIA: Calculadora = {
  slug: "hipercalemia",
  nome: "HIPERCALEMIA",
  subtitulo: "Conduta por gravidade, do cálcio à remoção",
  campos: [
    { id: "k", label: "POTÁSSIO", unidade: "mEq/L" },
    { id: "peso", label: "PESO (OPCIONAL)", unidade: "kg" },
  ],
  grupos: [{
    titulo: "CONTEXTO",
    criterios: [
      { id: "ecg", label: "ALTERAÇÕES NO ECG", pontos: 0 },
      { id: "renal", label: "DRC/IRA IMPORTANTE OU ANÚRIA", pontos: 0 },
      { id: "acidose", label: "ACIDOSE METABÓLICA", pontos: 0 },
    ],
  }],
  resumo: (_p, r, v) => {
    const k = num(v, "k");
    if (k === null) return "PREENCHA O POTÁSSIO";
    const grave = r.ecg === 1 || k >= 6.5;
    return `K ${n1(k)} mEq/L · ${grave ? "GRAVE — TRATAR AGORA" : "SEM GRAVIDADE IMEDIATA"}`;
  },
  laudo: (_p, r, v) => {
    const k = num(v, "k");
    if (k === null) return "PREENCHA O POTÁSSIO COM UM VALOR VÁLIDO.";

    const peso = num(v, "peso");
    const ecg = r.ecg === 1;
    const renal = r.renal === 1;
    const acidose = r.acidose === 1;
    const grave = ecg || k >= 6.5;

    return cx([
      "HIPERCALEMIA - CONDUTA (SEGUIR PROTOCOLO LOCAL)",
      `K+ INFORMADO: ${n1(k)} MEQ/L`,
      ...(peso !== null ? [`PESO: ${n1(peso)} KG`] : []),
      `ECG: ${ecg ? "COM ALTERAÇÕES" : "SEM ALTERAÇÕES RELATADAS"}`,
      `DRC/IRA IMPORTANTE/ANÚRIA: ${renal ? "SIM" : "NÃO/IGNORADO"}`,
      `ACIDOSE METABÓLICA: ${acidose ? "SIM" : "NÃO/IGNORADO"}`,
      "",
      grave
        ? "QUADRO GRAVE (K ≥ 6,5 OU ALTERAÇÕES NO ECG) -> TRATAR IMEDIATAMENTE + MONITORIZAÇÃO + ECG SERIADO."
        : "SEM CRITÉRIOS DE GRAVIDADE IMEDIATA (SE ESTÁVEL): CONFIRMAR AMOSTRA (HEMÓLISE), REPETIR K/ECG, REVER DROGAS E FUNÇÃO RENAL.",
      "",
      ...(grave
        ? ["1) PROTEGER MEMBRANA (SE ECG ALTERADO OU ARRITMIA):",
           "- CÁLCIO GLUCONATO 10% 30 ML EV EM 5–10 MIN (OU 1 G EV); REAVALIAR ECG EM 5 MIN; PODE REPETIR SE PERSISTIR.",
           "- ALTERNATIVA: CÁLCIO CLORETO 10% 10 ML EV (PREFERIR ACESSO CENTRAL).",
           ""]
        : []),
      "2) SHIFT (LEVAR O K+ PARA DENTRO DA CÉLULA):",
      "- SOLUÇÃO POLARIZANTE (PADRÃO): SG 10% 500 ML + 10 UI DE INSULINA REGULAR EV.",
      "- INFUNDIR DE FORMA CONTÍNUA (EX.: 1–2 HORAS), CONFORME PROTOCOLO LOCAL.",
      "- ESTA ESTRATÉGIA OFERECE 50 G DE GLICOSE DE FORMA CONTÍNUA, COM MENOR RISCO DE HIPOGLICEMIA TARDIA.",
      "- MONITORIZAR GLICEMIA CAPILAR SERIADA (EX.: 0, 30, 60, 120 MIN E CONFORME EVOLUÇÃO).",
      "- BETA2-AGONISTA: SALBUTAMOL NEB 10–20 MG (SE NÃO CONTRAINDICADO).",
      ...(acidose ? ["- ACIDOSE METABÓLICA: CONSIDERAR BICARBONATO DE SÓDIO EV (EFEITO ADJUVANTE)."] : []),
      "",
      "3) REMOVER POTÁSSIO DO ORGANISMO:",
      "- SE DIURESE PRESENTE: CONSIDERAR DIURÉTICO DE ALÇA (EX.: FUROSEMIDA EV) + HIDRATAÇÃO CONFORME STATUS VOLÊMICO.",
      "- CONSIDERAR QUELANTES (EX.: ZIRCÔNIO/CATIÔNICO) CONFORME DISPONIBILIDADE E PROTOCOLO.",
      ...(renal || grave
        ? ["- DRC/IRA IMPORTANTE OU QUADRO GRAVE: DISCUTIR HEMODIÁLISE/NEFRO URGENTE, ESPECIALMENTE SE REFRATÁRIO OU ANÚRICO."]
        : []),
      "",
      "MONITORIZAÇÃO / CHECKLIST:",
      "- ECG SERIADO; K SERIADO (EX.: 1–2H APÓS TERAPIA, CONFORME PROTOCOLO).",
      "- GLICEMIA CAPILAR SERIADA APÓS INSULINA (RISCO DE HIPOGLICEMIA).",
      "- INVESTIGAR CAUSA: HEMÓLISE, DRC/IRA, RABDOMIÓLISE, ACIDOSE, MEDICAÇÕES (IECA/BRA, ESPIRONOLACTONA, TMP-SMX).",
    ]);
  },
};
