/**
 * Escores neurológicos: consciência, AVC e cefaleia.
 */

import type { Calculadora } from "./tipos";
import { cx } from "./tipos";
import type { Resposta } from "./tipos";

// ============================ GLASGOW ============================

/**
 * Valor guardado para "V não testável" (intubado, traqueostomizado).
 *
 * Marcar V1 num intubado derruba o total em até 4 pontos por um motivo que
 * não é neurológico. A escala manda registrar o componente como não
 * testável (Teasdale 2014), e o costume é somar só E + M com o sufixo "T".
 */
const V_NAO_TESTAVEL = -1;

function contaGCS(r: Resposta) {
  const e = r.e ?? 4;
  const m = r.m ?? 6;
  const prs = r.prs ?? 0;
  const vt = r.v === V_NAO_TESTAVEL;
  const v = vt ? 0 : (r.v ?? 5);
  return { e, v, m, prs, vt, gcs: e + v + m };
}

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
          { label: "E2 - À PRESSÃO/DOR", pontos: 2 },
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
          { label: "VT - NÃO TESTÁVEL (INTUBADO/TRAQUEOSTOMIA)", pontos: 0, valor: V_NAO_TESTAVEL },
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
    const g = contaGCS(r);
    if (g.vt) return `GCS ${g.gcs}T (E${g.e} VT M${g.m}) · V NÃO TESTÁVEL`;
    return `GCS ${g.gcs} · GCS-P ${Math.max(1, g.gcs - g.prs)} · ${classeGCS(g.gcs)}`;
  },
  laudo: (_p, r) => {
    const g = contaGCS(r);
    const prsTxt = ["PRS: 0 (2 PUPILAS FOTORREAGENTES)", "PRS: 1 (1 PUPILA NÃO FOTORREAGENTE)", "PRS: 2 (2 PUPILAS NÃO FOTORREAGENTES)"][g.prs];
    if (g.vt) {
      return cx([
        `GLASGOW (GCS): ${g.gcs}T | E${g.e} VT M${g.m} | ${prsTxt}`,
        "V NÃO TESTÁVEL (INTUBADO/TRAQUEOSTOMIA): TOTAL = E + M, COM O SUFIXO T. NÃO COMPARAR COM A",
        "ESCALA DE 3 A 15 NEM CLASSIFICAR EM LEVE/MODERADO/GRAVE; O GCS-P NÃO SE APLICA.",
      ]);
    }
    return cx([
      `GLASGOW (GCS): ${g.gcs} | E${g.e} V${g.v} M${g.m} | ${classeGCS(g.gcs)} | ${prsTxt} | GCS-P: ${Math.max(1, g.gcs - g.prs)}`,
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
 * PS.py. Na escala original esses itens ficam sem nota e o examinador
 * justifica; aqui vale a escolha do programa de origem, e o laudo lista os
 * itens UN para que o número não seja lido como o de um exame completo.
 *
 * O UN guarda o valor -1 (e não os seus 0 pontos): se guardasse 0, seria
 * indistinguível do "0" do mesmo item — as duas opções apareciam marcadas
 * juntas e o laudo escrevia "0".
 *
 * Textos das opções conforme a escala do NINDS (Brott 1989).
 */
const UN = -1;
type OpcaoNihss = [string, number] | [string, number, number];

const MOTOR = (segundos: number): OpcaoNihss[] => [
  [`0 - SEM QUEDA (SUSTENTA ${segundos} S)`, 0],
  [`1 - CAI ANTES DE ${segundos} S, SEM TOCAR O LEITO`, 1],
  ["2 - ALGUM ESFORÇO CONTRA A GRAVIDADE, CAI NO LEITO", 2],
  ["3 - NENHUM ESFORÇO CONTRA A GRAVIDADE", 3],
  ["4 - SEM MOVIMENTO", 4],
  ["UN - AMPUTAÇÃO/ARTRODESE", 0, UN],
];

const NIHSS_ITENS: { id: string; titulo: string; opcoes: OpcaoNihss[] }[] = [
  { id: "1a", titulo: "1A. NÍVEL DE CONSCIÊNCIA", opcoes: [
    ["0 - ALERTA", 0], ["1 - NÃO ALERTA, DESPERTA COM ESTÍMULO MÍNIMO", 1],
    ["2 - SÓ RESPONDE A ESTÍMULO REPETIDO OU DOLOROSO", 2],
    ["3 - SÓ RESPOSTA REFLEXA OU NENHUMA (COMA)", 3]] },
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
  { id: "5a", titulo: "5A. MOTOR BRAÇO ESQUERDO", opcoes: MOTOR(10) },
  { id: "5b", titulo: "5B. MOTOR BRAÇO DIREITO", opcoes: MOTOR(10) },
  { id: "6a", titulo: "6A. MOTOR PERNA ESQUERDA", opcoes: MOTOR(5) },
  { id: "6b", titulo: "6B. MOTOR PERNA DIREITA", opcoes: MOTOR(5) },
  { id: "7", titulo: "7. ATAXIA DE MEMBROS", opcoes: [
    ["0 - AUSENTE", 0], ["1 - EM UM MEMBRO", 1], ["2 - EM DOIS MEMBROS", 2],
    ["UN - AMPUTAÇÃO/ARTRODESE", 0, UN]] },
  { id: "8", titulo: "8. SENSIBILIDADE", opcoes: [
    ["0 - NORMAL", 0], ["1 - PERDA LEVE/MODERADA", 1], ["2 - PERDA GRAVE/TOTAL", 2]] },
  { id: "9", titulo: "9. LINGUAGEM (AFASIA)", opcoes: [
    ["0 - SEM AFASIA", 0], ["1 - AFASIA LEVE/MODERADA", 1], ["2 - AFASIA GRAVE", 2],
    ["3 - MUDO/AFASIA GLOBAL", 3]] },
  { id: "10", titulo: "10. DISARTRIA", opcoes: [
    ["0 - NORMAL", 0], ["1 - LEVE/MODERADA", 1], ["2 - GRAVE/ININTELIGÍVEL OU MUDO", 2],
    ["UN - INTUBADO/OUTRA BARREIRA", 0, UN]] },
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
      opcoes: i.opcoes.map(([label, pontos, valor]) => ({ label, pontos, valor })),
    }],
  })),
  resumo: (p) => `NIHSS ${p}/42 · ${classeNIHSS(p)}`,
  laudo: (p, r) => {
    const itens = NIHSS_ITENS.map((i) => {
      const valor = r[i.id] ?? 0;
      const opcao = i.opcoes.find(([, pts, v]) => (v ?? pts) === valor);
      return `${i.titulo}: ${opcao ? opcao[0] : valor}`;
    });
    const naoTestaveis = NIHSS_ITENS.filter((i) => r[i.id] === UN).map((i) => i.id.toUpperCase());
    return cx([
      "NIHSS - RESULTADO",
      `PONTUAÇÃO: ${p}/42`,
      `CLASSIFICAÇÃO: ${classeNIHSS(p)}`,
      ...(naoTestaveis.length
        ? [`ITENS NÃO TESTÁVEIS (UN), CONTADOS COMO 0: ${naoTestaveis.join(", ")} — O TOTAL NÃO ` +
             "EQUIVALE AO DE UM EXAME COMPLETO; JUSTIFICAR NO PRONTUÁRIO."]
        : []),
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
      "REF: KOTHARI RU ET AL. ANN EMERG MED 1999;33:373-8.",
    ]);
  },
};

// ==================== PROTOCOLO DE CEFALEIA ====================

const TIPOS_PRIMARIOS = [
  {
    nome: "MIGRÂNEA (ENXAQUECA)",
    conduta: [
      "- PRIMEIRA LINHA: ANTIEMÉTICO ANTIDOPAMINÉRGICO (EX.: METOCLOPRAMIDA) + AINE (EX.: CETOPROFENO/IBUPROFENO) ± HIDRATAÇÃO.",
      "- CONSIDERAR MAGNÉSIO EV OU TRIPTANO SE ELEGÍVEL (SEM CONTRAINDICAÇÕES).",
      "- DEXAMETASONA EV EM DOSE ÚNICA PARA REDUZIR A RECORRÊNCIA APÓS A ALTA (AHS 2016).",
      "- EVITAR OPIOIDES COMO ROTINA.",
      "- REAVALIAR EM 30–60 MIN; REPETIR OU ASSOCIAR CONFORME RESPOSTA E PROTOCOLO.",
    ],
  },
  {
    nome: "CEFALEIA TENSIONAL",
    conduta: [
      "- ANALGESIA (DIPIRONA/PARACETAMOL) ± AINE.",
      "- MEDIDAS NÃO FARMACOLÓGICAS (HIDRATAÇÃO, SONO, ALIMENTAÇÃO).",
      "- AVALIAR USO EXCESSIVO DE ANALGÉSICOS (CEFALEIA POR ABUSO).",
    ],
  },
  {
    nome: "CEFALEIA EM SALVAS (CLUSTER)",
    conduta: [
      "- OXIGÊNIO 100% EM MÁSCARA COM RESERVATÓRIO (ALTO FLUXO) POR 15–20 MIN.",
      "- CONSIDERAR TRIPTANO (EX.: SUMATRIPTANO) SE ELEGÍVEL.",
      "- REAVALIAR; CONSIDERAR ENCAMINHAMENTO/PROFILAXIA CONFORME SERVIÇO.",
    ],
  },
  {
    nome: "OUTRA/INDEFINIDA",
    conduta: ["- ANALGESIA/ANTIEMÉTICO; REAVALIAÇÃO SERIADA."],
  },
];

const RED_FLAGS = [
  { id: "rf_trovao", label: "INÍCIO SÚBITO / \"TROVÃO\" (PICO < 1 HORA)" },
  { id: "rf_neuro", label: "DÉFICIT NEUROLÓGICO / REBAIXAMENTO / CONVULSÃO" },
  { id: "rf_febre", label: "FEBRE / RIGIDEZ DE NUCA / SUSPEITA DE INFECÇÃO DO SNC" },
  { id: "rf_imuno", label: "IMUNOSSUPRESSÃO / HIV / NEOPLASIA" },
  { id: "rf_gestacao", label: "GESTAÇÃO / PUERPÉRIO" },
  { id: "rf_idade", label: "INÍCIO APÓS OS 50 ANOS" },
  { id: "rf_papiledema", label: "PAPILEDEMA / SINAIS DE HIPERTENSÃO INTRACRANIANA" },
  { id: "rf_posicional", label: "POSICIONAL / PIORA COM VALSALVA (TOSSE/ESFORÇO)" },
  { id: "rf_trauma", label: "PÓS-TRAUMA" },
  { id: "rf_olho", label: "OLHO VERMELHO DOLOROSO COM SINTOMAS AUTONÔMICOS (GLAUCOMA AGUDO?)" },
  { id: "rf_pior", label: "PIOR DA VIDA / PADRÃO NOVO OU PROGRESSIVO" },
];

const OTTAWA = [
  { id: "ot_idade", label: "IDADE ≥ 40 ANOS" },
  { id: "ot_pescoco", label: "DOR/CERVICALGIA OU RIGIDEZ DE NUCA" },
  { id: "ot_loc", label: "PERDA DE CONSCIÊNCIA TESTEMUNHADA" },
  { id: "ot_esforco", label: "INÍCIO DURANTE ESFORÇO" },
  { id: "ot_trovao", label: "CEFALEIA EM TROVÃO (THUNDERCLAP)" },
  { id: "ot_flexao", label: "FLEXÃO CERVICAL LIMITADA AO EXAME" },
];

/**
 * Protocolo de cefaleia: primeiro exclui secundária, só depois trata.
 *
 * Qualquer red flag OU qualquer critério de Ottawa já muda a conduta inteira
 * — o tipo primário escolhido passa a ser irrelevante, porque tratar
 * enxaqueca num paciente com trovão é perder a hemorragia. Por isso o ramo
 * secundário não imprime o tratamento primário junto: só a analgesia de
 * enquanto se investiga.
 *
 * A regra de Ottawa pressupõe cefaleia aguda intensa, com pico em menos de
 * uma hora e exame neurológico normal. Fora disso ela não se aplica, e o
 * laudo diz isso em vez de dar um veredito que não vale.
 */
export const PROTOCOLO_CEFALEIA: Calculadora = {
  slug: "protocolo-cefaleia",
  nome: "PROTOCOLO DE CEFALEIA",
  subtitulo: "Excluir causa secundária e tratar a dor",
  grupos: [
    {
      titulo: "TIPO (SE PRIMÁRIA PROVÁVEL)",
      criterios: [{
        id: "tipo",
        label: "Tipo",
        padrao: 0,
        opcoes: TIPOS_PRIMARIOS.map((t, i) => ({ label: t.nome, pontos: i })),
      }],
    },
    {
      titulo: "RED FLAGS (SUSPEITA DE CEFALEIA SECUNDÁRIA)",
      criterios: RED_FLAGS.map((f) => ({ id: f.id, label: f.label, pontos: 0 })),
    },
    {
      titulo: "OTTAWA SAH (SÓ SE DOR AGUDA INTENSA, PICO <1H E NEURO NORMAL)",
      criterios: OTTAWA.map((f) => ({ id: f.id, label: f.label, pontos: 0 })),
    },
  ],
  resumo: (_p, r) => {
    const flags = RED_FLAGS.filter((f) => r[f.id] === 1);
    const ottawa = OTTAWA.filter((f) => r[f.id] === 1);
    if (flags.length || ottawa.length) {
      const partes = [];
      if (flags.length) partes.push(`${flags.length} RED FLAG${flags.length > 1 ? "S" : ""}`);
      if (ottawa.length) partes.push(`OTTAWA+ (${ottawa.length})`);
      return `SUSPEITA DE SECUNDÁRIA · ${partes.join(" · ")}`;
    }
    return `PRIMÁRIA PROVÁVEL · ${TIPOS_PRIMARIOS[r.tipo ?? 0].nome}`;
  },
  laudo: (_p, r) => {
    const flags = RED_FLAGS.filter((f) => r[f.id] === 1);
    const ottawa = OTTAWA.filter((f) => r[f.id] === 1);
    const secundaria = flags.length > 0 || ottawa.length > 0;

    if (secundaria) {
      return cx([
        "PROTOCOLO DE CEFALEIA",
        "OBJETIVOS: ALÍVIO DA DOR + EXCLUSÃO DE CEFALEIA SECUNDÁRIA",
        "",
        "STATUS: SUSPEITA DE CEFALEIA SECUNDÁRIA",
        "",
        ...(flags.length
          ? ["RED FLAGS PRESENTES:", ...flags.map((f) => `- ${f.label}`), ""]
          : []),
        ...(ottawa.length
          ? ["OTTAWA SAH POSITIVO — CRITÉRIOS PRESENTES:",
             ...ottawa.map((f) => `- ${f.label}`),
             "(QUALQUER CRITÉRIO POSITIVO AUMENTA A NECESSIDADE DE INVESTIGAR HSA.)",
             ""]
          : ["OTTAWA SAH: NENHUM CRITÉRIO MARCADO.", ""]),
        "PASSOS SUGERIDOS (ADAPTAR AO PROTOCOLO LOCAL):",
        "- AVALIAR SINAIS VITAIS, EXAME NEUROLÓGICO COMPLETO E FUNDO DE OLHO (SE DISPONÍVEL).",
        "- DEFINIR A SUSPEITA PRINCIPAL (HSA, MENINGITE, TVC, TUMOR/HIC, ARTERITE TEMPORAL, CRISE HIPERTENSIVA, DISSECÇÃO, GLAUCOMA AGUDO).",
        "- CONSIDERAR NEUROIMAGEM (TC SEM CONTRASTE NA URGÊNCIA PARA QUADROS AGUDOS OU COM ALARME).",
        "- SE SUSPEITA DE HSA E TC NEGATIVA: CONDUTA ADICIONAL CONFORME TEMPO DE INÍCIO E PROTOCOLO (LP/ANGIO-TC).",
        "- SE FEBRE/RIGIDEZ DE NUCA: CONSIDERAR MENINGITE/ENCEFALITE (ANTIBIÓTICO/ANTIVIRAL CONFORME PROTOCOLO + LP QUANDO SEGURO).",
        "- SE GESTAÇÃO/PUERPÉRIO: CONSIDERAR TVC E PRÉ-ECLÂMPSIA (PA, LABORATÓRIO, IMAGEM CONFORME SUSPEITA).",
        "",
        "ALÍVIO SINTOMÁTICO (ENQUANTO INVESTIGA):",
        "- ANALGESIA E ANTIEMÉTICO; EVITAR OPIOIDES COMO PRIMEIRA LINHA, SE POSSÍVEL.",
        "",
        "OBS: DOCUMENTAR AS RED FLAGS, O EXAME NEUROLÓGICO E A REAVALIAÇÃO.",
        "REF: RED FLAGS SNNOOP10 (DO TP ET AL. NEUROLOGY 2019) | OTTAWA SAH (PERRY JJ ET AL. JAMA 2013).",
      ]);
    }

    const tipo = TIPOS_PRIMARIOS[r.tipo ?? 0];
    return cx([
      "PROTOCOLO DE CEFALEIA",
      "OBJETIVOS: ALÍVIO DA DOR + EXCLUSÃO DE CEFALEIA SECUNDÁRIA",
      "",
      "STATUS: PRIMÁRIA PROVÁVEL (NENHUMA RED FLAG MARCADA)",
      `TIPO SELECIONADO: ${tipo.nome}`,
      "",
      "TRATAMENTO NA URGÊNCIA (SUGESTÃO PRÁTICA):",
      ...tipo.conduta,
      "",
      "OBS: A AUSÊNCIA DE RED FLAGS NÃO DISPENSA REAVALIAÇÃO — ORIENTAR RETORNO SE MUDANÇA DE PADRÃO OU PIORA.",
    ]);
  },
};

// ============== CLASSIFICAÇÃO DE CEFALEIA (ICHD-3) ==============

/**
 * Classificação das cefaleias primárias pelo ICHD-3 (Cephalalgia 2018).
 *
 * Os três conjuntos são avaliados ao mesmo tempo e em separado, e o
 * resultado pode ser "nenhum" ou "mais de um" — não é um escolhe-um. Quando
 * um conjunto não fecha, o laudo diz O QUE FALTA, em vez de apenas negar:
 * é a diferença entre "não é enxaqueca" e "falta perguntar sobre náusea".
 *
 * O critério A de cada um é o número de crises: ≥ 5 na migrânea e nas
 * salvas, ≥ 10 na tensional. O PS.py não o perguntava e fechava o
 * diagnóstico na primeira crise; sem ele, o máximo que a ICHD-3 permite é
 * a forma "provável" (1.5.1, 2.4, 3.5). As salvas têm ainda o critério D,
 * de frequência.
 *
 * Isto classifica cefaleia PRIMÁRIA. Com red flag, o instrumento é o
 * protocolo de cefaleia, não este.
 */
export const CEFALEIA_ICHD: Calculadora = {
  slug: "cefaleia-ichd",
  nome: "CLASSIFICAÇÃO DE CEFALEIA",
  subtitulo: "Cefaleias primárias pelos critérios ICHD-3",
  grupos: [
    {
      titulo: "NÚMERO DE CRISES (CRITÉRIO A)",
      criterios: [
        { id: "n5", label: "≥ 5 CRISES COM ESTE PADRÃO (MIGRÂNEA, SALVAS)", pontos: 0 },
        { id: "n10", label: "≥ 10 EPISÓDIOS COM ESTE PADRÃO (TENSIONAL)", pontos: 0 },
      ],
    },
    {
      titulo: "DURAÇÃO DA CRISE",
      criterios: [
        { id: "dur_migranea", label: "4 A 72 HORAS (MIGRÂNEA)", pontos: 0 },
        { id: "dur_tensional", label: "30 MINUTOS A 7 DIAS (TENSIONAL)", pontos: 0 },
        { id: "dur_salvas", label: "15 A 180 MINUTOS (SALVAS)", pontos: 0 },
      ],
    },
    {
      titulo: "MIGRÂNEA SEM AURA — CARACTERÍSTICAS (PRECISA DE ≥2)",
      criterios: [
        { id: "m_unilateral", label: "UNILATERAL", pontos: 0 },
        { id: "m_pulsatil", label: "PULSÁTIL", pontos: 0 },
        { id: "m_intensidade", label: "INTENSIDADE MODERADA OU FORTE", pontos: 0 },
        { id: "m_atividade", label: "PIORA COM ATIVIDADE ROTINEIRA", pontos: 0 },
      ],
    },
    {
      titulo: "MIGRÂNEA — ACOMPANHAMENTO (NÁUSEA/VÔMITO, OU FOTO + FONO)",
      criterios: [
        { id: "m_nausea", label: "NÁUSEA E/OU VÔMITO", pontos: 0 },
        { id: "m_foto", label: "FOTOFOBIA", pontos: 0 },
        { id: "m_fono", label: "FONOFOBIA", pontos: 0 },
      ],
    },
    {
      titulo: "TENSIONAL — CARACTERÍSTICAS (PRECISA DE ≥2)",
      criterios: [
        { id: "t_bilateral", label: "BILATERAL", pontos: 0 },
        { id: "t_aperto", label: "EM PRESSÃO/APERTO (NÃO PULSÁTIL)", pontos: 0 },
        { id: "t_intensidade", label: "INTENSIDADE LEVE OU MODERADA", pontos: 0 },
        { id: "t_atividade", label: "NÃO PIORA COM ATIVIDADE ROTINEIRA", pontos: 0 },
      ],
    },
    {
      titulo: "TENSIONAL — EXCLUSÕES",
      criterios: [
        { id: "t_sem_nausea", label: "SEM NÁUSEA E SEM VÔMITO", pontos: 0 },
        { id: "t_foto", label: "FOTOFOBIA PRESENTE", pontos: 0 },
        { id: "t_fono", label: "FONOFOBIA PRESENTE", pontos: 0 },
      ],
    },
    {
      titulo: "SALVAS — OBRIGATÓRIOS",
      criterios: [
        { id: "c_local", label: "UNILATERAL ORBITÁRIA/SUPRAORBITÁRIA/TEMPORAL", pontos: 0 },
        { id: "c_severa", label: "SEVERA OU MUITO SEVERA", pontos: 0 },
        { id: "c_freq", label: "FREQUÊNCIA DE 1 A CADA 2 DIAS ATÉ 8 POR DIA", pontos: 0 },
      ],
    },
    {
      titulo: "SALVAS — AUTONÔMICOS IPSILATERAIS OU INQUIETAÇÃO (≥1)",
      criterios: [
        { id: "c_lacrimejamento", label: "INJEÇÃO CONJUNTIVAL E/OU LACRIMEJAMENTO", pontos: 0 },
        { id: "c_nasal", label: "CONGESTÃO NASAL E/OU RINORREIA", pontos: 0 },
        { id: "c_edema", label: "EDEMA PALPEBRAL", pontos: 0 },
        { id: "c_sudorese", label: "SUDORESE FACIAL/FRONTAL", pontos: 0 },
        { id: "c_miose", label: "MIOSE E/OU PTOSE", pontos: 0 },
        { id: "c_agitacao", label: "AGITAÇÃO/INQUIETAÇÃO", pontos: 0 },
      ],
    },
  ],
  resumo: (_p, r) => {
    const av = avaliarICHD(r);
    const fechados = av.filter((c) => c.estado === "fecha").map((c) => c.nome);
    const provaveis = av.filter((c) => c.estado === "provavel").map((c) => c.nome);
    if (fechados.length === 1) return `PREENCHE: ${fechados[0]}`;
    if (fechados.length > 1) return `MAIS DE UM CONJUNTO FECHA: ${fechados.join(" + ")}`;
    if (provaveis.length === 1) return `${provaveis[0]} PROVÁVEL · FALTA O Nº DE CRISES`;
    if (provaveis.length > 1) return `MAIS DE UM CONJUNTO PROVÁVEL: ${provaveis.join(" + ")}`;
    return "NENHUM CONJUNTO ICHD-3 PREENCHIDO";
  },
  laudo: (_p, r) => {
    const avaliacoes = avaliarICHD(r);
    const fechados = avaliacoes.filter((c) => c.estado === "fecha").map((c) => c.nome);
    const provaveis = avaliacoes.filter((c) => c.estado === "provavel").map((c) => c.nome);

    const conclusao =
      fechados.length === 1
        ? [`CONCLUSÃO: PREENCHE ${fechados[0]}.`]
        : fechados.length > 1
          ? [`CONCLUSÃO: MAIS DE UM CONJUNTO FECHA (${fechados.join(" + ")}).`,
             "- REVISAR OS CRITÉRIOS: OS CONJUNTOS DEVERIAM SER MUTUAMENTE EXCLUDENTES NA PRÁTICA."]
          : provaveis.length
            ? [`CONCLUSÃO: ${provaveis.join(" + ")} PROVÁVEL — TODOS OS CRITÉRIOS MENOS O Nº DE CRISES.`,
               "- CONFIRMAR NA HISTÓRIA SE JÁ HOUVE O NÚMERO DE CRISES QUE A ICHD-3 PEDE."]
            : ["CONCLUSÃO: NENHUM CONJUNTO DE CRITÉRIOS ICHD-3 FOI PREENCHIDO.",
               "- REVISAR OS DADOS OU CONSIDERAR OUTRAS CAUSAS."];

    return cx([
      "CLASSIFICAÇÃO DE CEFALEIA (ICHD-3)",
      "",
      ...avaliacoes.map((c) =>
        c.estado === "fecha"
          ? `${c.nome}: PREENCHE`
          : c.estado === "provavel"
            ? `${c.nome}: PROVÁVEL — ${c.motivo}`
            : `${c.nome}: NÃO PREENCHE — ${c.motivo}`),
      "",
      ...conclusao,
      "",
      "OBS: ESTA CLASSIFICAÇÃO VALE PARA CEFALEIAS PRIMÁRIAS. SE HOUVER RED FLAG, USAR O PROTOCOLO DE CEFALEIA.",
      "REF: ICHD-3, CEPHALALGIA 2018;38:1-211.",
    ]);
  },
};

type EstadoICHD = { estado: "fecha" | "provavel" | "nao"; motivo: string };

/**
 * Quando B em diante fecham, o número de crises decide entre o diagnóstico
 * e a forma provável; quando algo de B em diante falta, é isso que o laudo
 * aponta, e o número de crises nem entra na conta.
 */
function porCrises(temCrises: boolean, faltaCrises: string): EstadoICHD {
  return temCrises
    ? { estado: "fecha", motivo: "" }
    : { estado: "provavel", motivo: faltaCrises };
}

function avaliarICHD(r: Resposta) {
  const marcado = (id: string) => r[id] === 1;
  const conta = (ids: string[]) => ids.filter(marcado).length;

  // ---- migrânea sem aura ----
  let migranea: EstadoICHD;
  if (!marcado("dur_migranea")) {
    migranea = { estado: "nao", motivo: "FALTA A DURAÇÃO DE 4–72H" };
  } else if (conta(["m_unilateral", "m_pulsatil", "m_intensidade", "m_atividade"]) < 2) {
    migranea = { estado: "nao", motivo: "FALTAM ≥2 CARACTERÍSTICAS (UNILATERAL/PULSÁTIL/INTENSIDADE/PIORA)" };
  } else if (marcado("m_nausea") || (marcado("m_foto") && marcado("m_fono"))) {
    migranea = porCrises(marcado("n5"), "FALTA CONFIRMAR ≥ 5 CRISES (ICHD-3 1.5.1)");
  } else {
    migranea = { estado: "nao", motivo: "FALTA NÁUSEA/VÔMITO OU FOTOFOBIA + FONOFOBIA" };
  }

  // ---- tensional ----
  let tensional: EstadoICHD;
  if (!marcado("dur_tensional")) {
    tensional = { estado: "nao", motivo: "FALTA A DURAÇÃO DE 30 MIN–7 DIAS" };
  } else if (conta(["t_bilateral", "t_aperto", "t_intensidade", "t_atividade"]) < 2) {
    tensional = { estado: "nao", motivo: "FALTAM ≥2 CARACTERÍSTICAS (BILATERAL/APERTO/LEVE-MODERADA/NÃO PIORA)" };
  } else if (!marcado("t_sem_nausea")) {
    tensional = { estado: "nao", motivo: "FALTA CONFIRMAR AUSÊNCIA DE NÁUSEA E VÔMITO" };
  } else if (marcado("t_foto") && marcado("t_fono")) {
    tensional = { estado: "nao", motivo: "FOTOFOBIA E FONOFOBIA JUNTAS NÃO FECHAM TENSIONAL" };
  } else {
    tensional = porCrises(marcado("n10"), "FALTA CONFIRMAR ≥ 10 EPISÓDIOS (ICHD-3 2.4)");
  }

  // ---- salvas ----
  let salvas: EstadoICHD;
  const autonomicos = conta([
    "c_lacrimejamento", "c_nasal", "c_edema", "c_sudorese", "c_miose",
  ]);
  if (!marcado("dur_salvas")) {
    salvas = { estado: "nao", motivo: "FALTA A DURAÇÃO DE 15–180 MIN" };
  } else if (!(marcado("c_local") && marcado("c_severa"))) {
    salvas = { estado: "nao", motivo: "FALTA LOCALIZAÇÃO TÍPICA UNILATERAL E/OU INTENSIDADE SEVERA" };
  } else if (autonomicos === 0 && !marcado("c_agitacao")) {
    salvas = { estado: "nao", motivo: "FALTAM SINAIS AUTONÔMICOS IPSILATERAIS OU AGITAÇÃO/INQUIETAÇÃO" };
  } else if (!marcado("c_freq")) {
    salvas = { estado: "nao", motivo: "FALTA A FREQUÊNCIA TÍPICA (1 A CADA 2 DIAS ATÉ 8 POR DIA)" };
  } else {
    salvas = porCrises(marcado("n5"), "FALTA CONFIRMAR ≥ 5 CRISES (ICHD-3 3.5)");
  }

  return [
    { nome: "MIGRÂNEA (ICHD-3)", ...migranea },
    { nome: "TENSIONAL (ICHD-3)", ...tensional },
    { nome: "SALVAS/CLUSTER (ICHD-3)", ...salvas },
  ];
}
