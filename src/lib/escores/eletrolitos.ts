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
 * errada com cara de resultado. A segunda trava é a do valor normal: sódio
 * ou potássio dentro da faixa não recebem conduta de distúrbio.
 *
 * Fontes conferidas:
 * - Adrogué & Madias, NEJM 2000 (Hyponatremia; Hypernatremia): a variação do
 *   sódio por litro infundido e a água corporal por sexo e idade.
 * - Diretriz europeia de hiponatremia (ESE/ESICM/ERBP), Spasovski et al.,
 *   Eur J Endocrinol 2014: bólus de NaCl 3%, limites, supercorreção.
 * - Painel americano, Verbalis et al., Am J Med 2013: alto risco de
 *   desmielinização osmótica.
 * - Mohmand et al., Clin J Am Soc Nephrol 2007: a fórmula subestima a subida.
 * - Kardalas et al., Endocr Connect 2018: hipocalemia.
 * - Conferência KDIGO para hipercalemia no PS, Lindner et al., Eur J Emerg
 *   Med 2020; diretrizes do ERC 2021: graduação 5,5 / 6,0 / 6,5.
 */

import type { Calculadora, Criterio, Resposta, Valores } from "./tipos";
import { cx, n0, n1 } from "./tipos";

const num = (v: Valores, id: string): number | null => {
  const x = v[id];
  return x === null || x === undefined || Number.isNaN(x) ? null : x;
};

/**
 * Água corporal total como fração do peso (Adrogué & Madias, NEJM 2000):
 * 0,6 no homem e 0,5 na mulher adultos; 0,5 no homem e 0,45 na mulher
 * idosos. O PS.py só tinha as duas primeiras e superestimava a água do
 * idoso — o que infla o volume calculado, e com ele o risco de corrigir
 * rápido demais, justamente em quem mais sofre com isso.
 *
 * O artigo não diz a partir de que idade: por isso a opção fala em idoso,
 * sem inventar um corte que a fonte não deu.
 */
const PERFIS = [
  { nome: "HOMEM", fracao: 0.6, rotulo: "HOMEM (ÁGUA CORPORAL 60% DO PESO)" },
  { nome: "MULHER", fracao: 0.5, rotulo: "MULHER (ÁGUA CORPORAL 50% DO PESO)" },
  { nome: "HOMEM IDOSO", fracao: 0.5, rotulo: "HOMEM IDOSO (ÁGUA CORPORAL 50% DO PESO)" },
  { nome: "MULHER IDOSA", fracao: 0.45, rotulo: "MULHER IDOSA (ÁGUA CORPORAL 45% DO PESO)" },
];

/** O id continua "sexo": 0 e 1 querem dizer o mesmo que antes. */
const PERFIL: Criterio = {
  id: "sexo",
  label: "Sexo e idade",
  padrao: 0,
  opcoes: PERFIS.map((p, i) => ({ label: p.rotulo, pontos: i })),
};

const perfilDe = (r: Resposta) => PERFIS[r.sexo] ?? PERFIS[0];

// ======================== HIPONATREMIA ========================

/** NaCl 3%: 30 g/L ÷ 58,44 g/mol = 513 mEq de sódio por litro. */
const NACL3 = 513.0;

/**
 * Subida máxima que esta conta prescreve em 24h. As diretrizes aceitam 10
 * nas primeiras 24h, mas pedem 8 para quem tem alto risco de
 * desmielinização osmótica; 8 serve aos dois, e é o que o PS.py já usava.
 */
const TETO_HIPO = 8.0;

export const HIPONATREMIA: Calculadora = {
  slug: "hiponatremia",
  nome: "HIPONATREMIA",
  subtitulo: "Volume de NaCl 3% pela fórmula de Adrogué–Madias",
  campos: [
    { id: "peso", label: "PESO", unidade: "kg" },
    { id: "na", label: "SÓDIO ATUAL", unidade: "mEq/L" },
    { id: "alvo", label: "SÓDIO DESEJADO", unidade: "mEq/L" },
  ],
  grupos: [{ titulo: "SEXO E IDADE", criterios: [PERFIL] }],
  resumo: (_p, r, v) => {
    const c = contaHipoNa(perfilDe(r).fracao, v);
    if (c === null) return "PREENCHA PESO, SÓDIO ATUAL E SÓDIO DESEJADO";
    if (c === "semHiponatremia") return "NA ≥ 135 · NÃO HÁ HIPONATREMIA A CORRIGIR";
    if (c === "semSubida") return "O SÓDIO DESEJADO NÃO É MAIOR QUE O ATUAL";
    return `NACL 3% ${n0(c.volumeSeguro)} mL EM 24H (${n0(c.taxa)} mL/H) · +${n1(c.deltaSeguro)} mEq/L`;
  },
  laudo: (_p, r, v) => {
    const perfil = perfilDe(r);
    const c = contaHipoNa(perfil.fracao, v);
    if (c === null) return "PREENCHA PESO, SÓDIO ATUAL E SÓDIO DESEJADO COM VALORES VÁLIDOS.";
    if (c === "semHiponatremia") {
      return "NA SÉRICO ≥ 135: NÃO HÁ HIPONATREMIA PARA CORRIGIR NESTA CALCULADORA.";
    }
    if (c === "semSubida") {
      return "O SÓDIO DESEJADO NÃO É MAIOR QUE O ATUAL: NÃO HÁ VOLUME DE NACL 3% A CALCULAR.";
    }

    return cx([
      "HIPONATREMIA - NACL 3% (ADROGUÉ–MADIAS)",
      `PESO: ${n1(c.peso)} KG | ${perfil.nome} | ÁGUA CORPORAL TOTAL: ${n1(c.tbw)} L`,
      `NA ATUAL: ${n1(c.na)} MEQ/L | NA DESEJADO: ${n1(c.alvo)} MEQ/L`,
      "",
      `CADA 1 L DE NACL 3% ELEVA O NA SÉRICO EM ~${n1(c.porLitro)} MEQ/L`,
      "= (513 − NA ATUAL) ÷ (ÁGUA CORPORAL TOTAL + 1).",
      "",
      ...(c.delta > TETO_HIPO
        ? [
            `O ALVO PEDIDO (+${n1(c.delta)} MEQ/L) EXIGIRIA ${n0(c.volumeTotal)} ML, MAS A SUBIDA ` +
              "FICA LIMITADA A 8 MEQ/L EM 24H.",
          ]
        : []),
      `VOLUME: ${n0(c.volumeSeguro)} ML DE NACL 3% EM 24H, PREVISTO PARA ELEVAR O NA EM ` +
        `${n1(c.deltaSeguro)} MEQ/L.`,
      "",
      `INFUSÃO: NACL 3% EV ${n0(c.taxa)} ML/H POR 24 HORAS`,
      "PREPARO DE CADA 500 ML DE NACL 3%: 55 ML NACL 20% + 445 ML SF 0,9%",
      "",
      "SINTOMAS GRAVES (VÔMITOS, CONVULSÃO, SONOLÊNCIA PROFUNDA, COMA) - ANTES DA INFUSÃO:",
      "- NACL 3% 150 ML EV EM 20 MIN; DOSAR NA AO FIM (DIRETRIZ EUROPEIA 2014).",
      "- REPETIR ATÉ O NA SUBIR 5 MEQ/L OU OS SINTOMAS CEDEREM (ATÉ 3 BÓLUS NO TOTAL).",
      "- A SUBIDA DOS BÓLUS CONTA DENTRO DO LIMITE DAS 24 HORAS.",
      "",
      "SEGURANÇA:",
      "☞ SOLICITAR NA SÉRICO A CADA 2 HORAS.",
      "☞ A FÓRMULA É UMA ESTIMATIVA: COM NA < 120, A SUBIDA REAL SUPEROU A PREVISTA EM 3 DE " +
        "CADA 4 PACIENTES (MOHMAND 2007), EM GERAL POR DIURESE AQUOSA QUANDO A CAUSA SE RESOLVE.",
      "☞ LIMITE: 10 MEQ/L NAS PRIMEIRAS 24H E 8 A CADA 24H SEGUINTES; 8 EM 24H SE ALTO RISCO DE " +
        "DESMIELINIZAÇÃO OSMÓTICA (NA ≤ 105, HIPOCALEMIA, ETILISMO, DESNUTRIÇÃO, HEPATOPATIA " +
        "AVANÇADA). ESTA CONTA USA 8, QUE SERVE AOS DOIS CASOS.",
      "☞ PASSOU DO LIMITE: SUSPENDER O NACL 3% E DISCUTIR COM ESPECIALISTA ÁGUA LIVRE (SG 5% " +
        "10 ML/KG EM 1H) E DESMOPRESSINA 2 MCG EV (NÃO REPETIR ANTES DE 8H).",
      "☞ NACL 3% É PARA HIPONATREMIA COM SINTOMAS MODERADOS OU GRAVES. NA CRÔNICA SEM ESSES " +
        "SINTOMAS, TRATAR A CAUSA: RESTRIÇÃO HÍDRICA NA SIADH, SF 0,9% NA HIPOVOLÊMICA.",
    ]);
  },
};

function contaHipoNa(fracao: number, v: Valores) {
  const peso = num(v, "peso");
  const na = num(v, "na");
  const alvo = num(v, "alvo");
  if (peso === null || na === null || alvo === null) return null;
  if (peso <= 0 || na <= 0 || alvo <= 0 || na >= NACL3) return null;
  // Sódio normal não é hiponatremia: sem esta trava, um alvo acima de um
  // sódio de 138 virava prescrição de salina hipertônica.
  if (na >= 135) return "semHiponatremia" as const;
  const delta = alvo - na;
  if (delta <= 0) return "semSubida" as const;

  const tbw = peso * fracao;
  // Adrogué–Madias: quanto 1 L da solução muda o sódio sérico. O PS.py
  // dividia o déficit (ACT × ΔNa) por 513, conta que esquece a água que
  // entra junto com o sódio: prometia +8 e entregava cerca de +6.
  const porLitro = (NACL3 - na) / (tbw + 1);
  const deltaSeguro = Math.min(delta, TETO_HIPO);
  const volumeTotal = (delta / porLitro) * 1000;
  const volumeSeguro = (deltaSeguro / porLitro) * 1000;

  return {
    peso, na, alvo, tbw, porLitro, delta, deltaSeguro, volumeTotal, volumeSeguro,
    taxa: volumeSeguro / 24,
  };
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
  grupos: [{ titulo: "SEXO E IDADE", criterios: [PERFIL] }],
  resumo: (_p, r, v) => {
    const c = contaHiperNa(perfilDe(r).fracao, v);
    if (c === null) return "PREENCHA PESO E SÓDIO SÉRICO";
    if (c === "semHipernatremia") return "NA ≤ 145 · NÃO HÁ HIPERNATREMIA A CORRIGIR";
    return `REDUZIR ATÉ ${n1(c.reducao)} mEq/L EM 24H · SG 5% ${n0(c.volumes[1] ?? 0)} mL`;
  },
  laudo: (_p, r, v) => {
    const perfil = perfilDe(r);
    const c = contaHiperNa(perfil.fracao, v);
    if (c === null) return "PREENCHA PESO E SÓDIO SÉRICO COM VALORES VÁLIDOS.";
    if (c === "semHipernatremia") {
      return "NA SÉRICO ≤ 145: NÃO HÁ HIPERNATREMIA PARA CORRIGIR NESTA CALCULADORA.";
    }

    const fmt = (i: number) => (c.volumes[i] === null ? "-" : `${n0(c.volumes[i] as number)} ML`);
    const taxa = (i: number) =>
      c.volumes[i] === null ? "-" : `${n0((c.volumes[i] as number) / 24)} ML/H`;

    return cx([
      "HIPERNATREMIA - PRIMEIRAS 24 HORAS (ADROGUÉ–MADIAS)",
      `PESO: ${n1(c.peso)} KG | ${perfil.nome} | ÁGUA CORPORAL TOTAL: ${n1(c.tbw)} L | ` +
        `NA: ${n1(c.na)} MEQ/L`,
      `OBJETIVO: REDUZIR ATÉ ${n1(c.reducao)} MEQ/L EM 24H (TETO CONSERVADOR DE 8/24H, SEM ` +
        "PASSAR DE 145).",
      "",
      "VOLUME NECESSÁRIO PARA CAUSAR ESTA REDUÇÃO (POR SOLUÇÃO):",
      ...SOLUCOES.map((s, i) => `- ${s.nome} = ${fmt(i)}`),
      "",
      "INFUSÃO EM 24 HORAS:",
      `- SORO GLICOSADO 5% EV ${taxa(1)}`,
      ...SOLUCOES.slice(2).map((s, i) => `- ${s.nome}: ${s.preparo}  EV ${taxa(i + 2)}`),
      "",
      "CONSIDERAÇÕES:",
      "☞ O VOLUME ACIMA NÃO INCLUI AS PERDAS QUE CONTINUAM (INSENSÍVEIS, DIURESE, " +
        "GASTROINTESTINAIS): SOMÁ-LAS AO QUE FOR PRESCRITO.",
      "☞ HIPERNATREMIA CRÔNICA OU DE DURAÇÃO DESCONHECIDA: NÃO BAIXAR MAIS QUE 0,5 MEQ/L/H. " +
        "INSTALADA EM HORAS: PODE BAIXAR ~1 MEQ/L/H.",
      "☞ SOLICITAR NA+ SÉRICO A CADA 2 HORAS",
      "☞ PREFERIR A VIA ENTERAL, SE DISPONÍVEL",
    ]);
  },
};

function contaHiperNa(fracao: number, v: Valores) {
  const peso = num(v, "peso");
  const na = num(v, "na");
  if (peso === null || na === null || peso <= 0 || na <= 0) return null;
  if (na <= 145) return "semHipernatremia" as const;

  const tbw = peso * fracao;
  // Reduz no máximo 8 por dia, e nunca abaixo de 145. Adrogué–Madias
  // propõem 10/dia na crônica; 8 é mais lento, e fica como estava no PS.py.
  const reducao = Math.min(8.0, na - 145.0);
  const volumes = SOLUCOES.map((s) => {
    const litros = volumeParaDelta(na, tbw, s.na, -reducao);
    return litros === null ? null : litros * 1000;
  });

  return { peso, na, tbw, reducao, volumes };
}

// ======================== HIPOCALEMIA ========================

type ClasseHipoK = "NORMAL" | "LEVE" | "MODERADA" | "GRAVE";

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
    const classe = classeHipoK(k);
    const marcado = r.sintomas === 1 || r.ecg === 1;
    if (classe === "NORMAL") {
      return `K ${n1(k)} mEq/L · NORMAL${marcado ? " · ECG/SINTOMAS NÃO SE EXPLICAM PELO K" : ""}`;
    }
    const agrava = marcado && classe !== "GRAVE";
    return `K ${n1(k)} mEq/L · ${classe}${agrava ? " COM ECG/SINTOMAS → CONDUTA DE GRAVE" : ""}`;
  },
  laudo: (_p, r, v) => {
    const k = num(v, "k");
    if (k === null) return "PREENCHA O POTÁSSIO COM UM VALOR VÁLIDO.";

    const sintomas = r.sintomas === 1;
    const ecg = r.ecg === 1;
    const classe = classeHipoK(k);
    // ECG alterado ou sintoma pedem a conduta da classe grave — mas só
    // quando há hipocalemia. Com K normal, o que foi marcado tem outra causa,
    // e mandar KCl EV ali seria criar o distúrbio oposto.
    const agrava = (sintomas || ecg) && classe !== "NORMAL" && classe !== "GRAVE";
    const conduta: ClasseHipoK = agrava ? "GRAVE" : classe;

    const linhas =
      conduta === "NORMAL"
        ? ["K DENTRO DA NORMALIDADE.",
           ...(sintomas || ecg
             ? ["OS SINTOMAS/O ECG MARCADOS NÃO SE EXPLICAM POR HIPOCALEMIA: INVESTIGAR OUTRA " +
                  "CAUSA (MAGNÉSIO, CÁLCIO, ISQUEMIA, DROGAS)."]
             : []),
           "SE HÁ SUSPEITA CLÍNICA OU ERRO LABORATORIAL: REPETIR EXAME E AVALIAR MAGNÉSIO."]
        : conduta === "LEVE"
          ? ["CONDUTA (LEVE):",
             "- PREFERIR REPOSIÇÃO VIA ORAL (KCL).",
             "- DOSE TÍPICA: 20–40 MEQ/DIA, FRACIONAR (EX.: 10–20 MEQ 12/12H).",
             "- ORIENTAR REVISÃO DE DIURÉTICOS/LAXANTES E DIETA.",
             "- CONSIDERAR DOSAR/CORRIGIR MG SE SUSPEITA.",
             "- REAVALIAR K EM 24–48H (OU ANTES SE RISCO)."]
          : conduta === "MODERADA"
            ? ["CONDUTA (MODERADA):",
               "- VIA ORAL SE TOLERADO/SEGURO: 40–80 MEQ/DIA, FRACIONADO.",
               "- SE VO IMPOSSÍVEL OU INTOLERÂNCIA: CONSIDERAR EV LENTO.",
               "- MONITORIZAR K SERIADO (FREQUÊNCIA CONFORME RISCO/PROTOCOLO).",
               "- CONSIDERAR DOSAR/CORRIGIR MAGNÉSIO (COEXISTÊNCIA FREQUENTE)."]
            : ["CONDUTA (GRAVE, OU COM ECG/SINTOMAS):",
               "- MONITORIZAÇÃO (ECG) E TRATAR EM AMBIENTE COM SUPORTE.",
               "- REPOSIÇÃO EV DE KCL (NUNCA EM BÓLUS).",
               "- DILUIR EM SF 0,9%: SORO GLICOSADO ESTIMULA INSULINA E DESLOCA O K PARA DENTRO " +
                 "DA CÉLULA.",
               "- ACESSO PERIFÉRICO: ATÉ 10 MEQ/H.",
               "- ACESSO CENTRAL + MONITOR: ATÉ 20 MEQ/H (CONFORME PROTOCOLO LOCAL).",
               "- DOSAR K A CADA 2–4H ATÉ ESTABILIZAR (CONFORME PROTOCOLO).",
               "- CORRIGIR HIPOMAGNESEMIA SE PRESENTE (CAUSA DE REFRATARIEDADE)."];

    return cx([
      "HIPOCALEMIA - CONDUTA",
      `K+ ATUAL: ${k.toFixed(2).replace(".", ",")} MEQ/L`,
      `CLASSE: ${classe}${agrava ? " PELO VALOR - CONDUTA DE GRAVE POR ECG/SINTOMAS" : ""}`,
      `SINTOMAS: ${sintomas ? "SIM" : "NÃO"}`,
      `ECG: ${ecg ? "ALTERADO" : "NÃO RELATADO"}`,
      `VO IMPOSSÍVEL: ${r.semVo === 1 ? "SIM" : "NÃO"}`,
      "",
      ...linhas,
      ...(r.semVo === 1 && (conduta === "LEVE" || conduta === "MODERADA")
        ? ["", "OBS: VIA ORAL MARCADA COMO IMPOSSÍVEL — USAR A ROTA EV DESTA MESMA CLASSE."]
        : []),
      "",
      "LEMBRETES:",
      "- INVESTIGAR CAUSA (DIURÉTICOS, VÔMITOS/DIARREIA, ALCALOSE, INSULINA/BETA2, HIPERALDOSTERONISMO).",
      "- HIPOMAGNESEMIA NÃO CORRIGIDA MANTÉM A HIPOCALEMIA REFRATÁRIA.",
      "- CADA 1 MEQ/L DE QUEDA DO K ≈ 200–400 MEQ DE DÉFICIT CORPORAL (ESTIMATIVA GROSSEIRA).",
      "- DOENÇA RENAL: REPOR COM CAUTELA E DOSAR O K MAIS VEZES.",
    ]);
  },
};

/** Pelo valor: < 2,5 grave; 2,5–2,9 moderada; 3,0–3,4 leve (Kardalas 2018). */
function classeHipoK(k: number): ClasseHipoK {
  if (k < 2.5) return "GRAVE";
  if (k < 3.0) return "MODERADA";
  if (k < 3.5) return "LEVE";
  return "NORMAL";
}

// ======================== HIPERCALEMIA ========================

type ClasseHiperK = "SEM" | "LEVE" | "MODERADA" | "GRAVE";

/**
 * Graduação do ERC 2021: leve 5,5–5,9; moderada 6,0–6,4; grave ≥ 6,5.
 * Abaixo de 5,5 não há hipercalemia que peça tratamento agudo — a
 * conferência KDIGO usa ≥ 5,5 como definição.
 */
function classeHiperK(k: number): ClasseHiperK {
  if (k < 5.5) return "SEM";
  if (k < 6.0) return "LEVE";
  if (k < 6.5) return "MODERADA";
  return "GRAVE";
}

const FAIXA_HIPER: Record<Exclude<ClasseHiperK, "SEM">, string> = {
  LEVE: "LEVE (5,5–5,9)",
  MODERADA: "MODERADA (6,0–6,4)",
  GRAVE: "GRAVE (≥ 6,5)",
};

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
    const classe = classeHiperK(k);
    if (classe === "SEM") return `K ${n1(k)} mEq/L · SEM HIPERCALEMIA AGUDA (< 5,5)`;
    if (r.ecg === 1 || classe === "GRAVE") return `K ${n1(k)} mEq/L · GRAVE — TRATAR AGORA`;
    return `K ${n1(k)} mEq/L · ${classe}`;
  },
  laudo: (_p, r, v) => {
    const k = num(v, "k");
    if (k === null) return "PREENCHA O POTÁSSIO COM UM VALOR VÁLIDO.";

    const peso = num(v, "peso");
    const ecg = r.ecg === 1;
    const renal = r.renal === 1;
    const acidose = r.acidose === 1;
    const classe = classeHiperK(k);

    // Sem esta trava, um K de 4,8 saía com insulina, salbutamol e quelante.
    if (classe === "SEM") {
      return cx([
        "HIPERCALEMIA - CONDUTA",
        `K+ INFORMADO: ${n1(k)} MEQ/L`,
        "",
        "K < 5,5: NÃO HÁ HIPERCALEMIA QUE PEÇA TRATAMENTO AGUDO (CÁLCIO, INSULINA, QUELANTE).",
        ...(ecg
          ? ["ECG ALTERADO COM K < 5,5: A ALTERAÇÃO PROVAVELMENTE NÃO É DO POTÁSSIO - PROCURAR " +
               "OUTRA CAUSA. SE ESTE K FOR ANTIGO E HOUVER SUSPEITA DE SUBIDA, REPETIR COM " +
               "URGÊNCIA (GASOMETRIA)."]
          : []),
        "SE K ENTRE 5,0 E 5,4: REVER DROGAS (IECA/BRA, ESPIRONOLACTONA, TMP-SMX) E FUNÇÃO RENAL, " +
          "E REPETIR.",
      ]);
    }

    const grave = ecg || classe === "GRAVE";
    // Insulina e beta-2 a partir de 6,0 ou com ECG alterado; na faixa leve
    // o ERC e a UK Kidney Association não os pedem de rotina.
    const shift = grave || classe === "MODERADA";

    return cx([
      "HIPERCALEMIA - CONDUTA (SEGUIR PROTOCOLO LOCAL)",
      `K+ INFORMADO: ${n1(k)} MEQ/L - ${FAIXA_HIPER[classe]}`,
      ...(peso !== null ? [`PESO: ${n1(peso)} KG`] : []),
      `ECG: ${ecg ? "COM ALTERAÇÕES" : "SEM ALTERAÇÕES RELATADAS"}`,
      `DRC/IRA IMPORTANTE/ANÚRIA: ${renal ? "SIM" : "NÃO/IGNORADO"}`,
      `ACIDOSE METABÓLICA: ${acidose ? "SIM" : "NÃO/IGNORADO"}`,
      "",
      grave
        ? "QUADRO GRAVE (K ≥ 6,5 OU ALTERAÇÕES NO ECG) -> TRATAR IMEDIATAMENTE + MONITORIZAÇÃO + ECG SERIADO."
        : classe === "MODERADA"
          ? "HIPERCALEMIA MODERADA -> MONITOR CARDÍACO + ECG DE 12 DERIVAÇÕES; TRATAR SEM ESPERAR A " +
            "CONFIRMAÇÃO DO K."
          : "HIPERCALEMIA LEVE SEM ALTERAÇÃO NO ECG: CONFIRMAR AMOSTRA (HEMÓLISE), REPETIR K/ECG, " +
            "REVER DROGAS E FUNÇÃO RENAL.",
      "",
      ...(grave
        ? ["1) PROTEGER MEMBRANA (ECG ALTERADO OU ARRITMIA; OU K ≥ 6,5 SEM ECG/MONITOR À MÃO):",
           "- GLUCONATO DE CÁLCIO 10% 30 ML (3 G) EV EM 5–10 MIN; REAVALIAR ECG EM 5–10 MIN; " +
             "PODE REPETIR SE PERSISTIR.",
           "- OU CLORETO DE CÁLCIO 10% 10 ML (1 G) EV, A MESMA QUANTIDADE DE CÁLCIO (PREFERIR " +
             "ACESSO CENTRAL).",
           "- O CÁLCIO NÃO BAIXA O K E AGE POR 30–60 MIN: SEGUIR COM O SHIFT.",
           ""]
        : []),
      ...(shift
        ? ["2) SHIFT (LEVAR O K+ PARA DENTRO DA CÉLULA):",
           "- SOLUÇÃO POLARIZANTE (PADRÃO): SG 10% 500 ML + 10 UI DE INSULINA REGULAR EV.",
           "- INFUNDIR DE FORMA CONTÍNUA (EX.: 1–2 HORAS), CONFORME PROTOCOLO LOCAL.",
           "- ESTA ESTRATÉGIA OFERECE 50 G DE GLICOSE DE FORMA CONTÍNUA, COM MENOR RISCO DE HIPOGLICEMIA TARDIA.",
           "- GLICEMIA > 200 MG/DL: A INSULINA PODE IR SEM GLICOSE.",
           "- MONITORIZAR GLICEMIA CAPILAR SERIADA (EX.: 0, 30, 60, 120 MIN E CONFORME EVOLUÇÃO).",
           "- BETA2-AGONISTA: SALBUTAMOL NEB 10–20 MG (SE NÃO CONTRAINDICADO); SOMA EFEITO À INSULINA."]
        : ["2) SHIFT: NÃO É DE ROTINA NA FAIXA LEVE SEM ALTERAÇÃO NO ECG."]),
      ...(acidose ? ["- ACIDOSE METABÓLICA: CONSIDERAR BICARBONATO DE SÓDIO EV (EFEITO ADJUVANTE)."] : []),
      "",
      "3) REMOVER POTÁSSIO DO ORGANISMO:",
      "- SE DIURESE PRESENTE: CONSIDERAR DIURÉTICO DE ALÇA (EX.: FUROSEMIDA EV) + HIDRATAÇÃO CONFORME STATUS VOLÊMICO.",
      "- QUELANTE: CICLOSSILICATO DE ZIRCÔNIO SÓDICO 10 G VO 8/8H OU POLIESTIRENOSSULFONATO " +
        "15–60 G VO/VR (SEM SORBITOL). PATIRÔMER COMEÇA A AGIR EM ~7H: NÃO SERVE PARA A URGÊNCIA.",
      ...(renal || grave
        ? ["- DRC/IRA IMPORTANTE OU QUADRO GRAVE: DISCUTIR HEMODIÁLISE/NEFRO URGENTE, ESPECIALMENTE SE REFRATÁRIO OU ANÚRICO."]
        : []),
      "",
      "MONITORIZAÇÃO / CHECKLIST:",
      "- ECG SERIADO; MONITOR CARDÍACO CONTÍNUO SE K > 6,0.",
      ...(shift
        ? ["- K 1H APÓS O SHIFT E DE NOVO EM 2–3H: O EFEITO É TRANSITÓRIO E HÁ REBOTE.",
           "- GLICEMIA CAPILAR SERIADA APÓS INSULINA (RISCO DE HIPOGLICEMIA)."]
        : ["- REPETIR K CONFORME A EVOLUÇÃO."]),
      "- INVESTIGAR CAUSA: HEMÓLISE, DRC/IRA, RABDOMIÓLISE, ACIDOSE, MEDICAÇÕES (IECA/BRA, ESPIRONOLACTONA, TMP-SMX).",
    ]);
  },
};
