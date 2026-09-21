/**
 * Escores neurológicos: consciência, AVC e cefaleia.
 */

import type { Calculadora } from "./tipos";
import { cx } from "./tipos";
import type { Resposta } from "./tipos";

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

// ==================== PROTOCOLO DE CEFALEIA ====================

const TIPOS_PRIMARIOS = [
  {
    nome: "MIGRÂNEA (ENXAQUECA)",
    conduta: [
      "- PRIMEIRA LINHA: ANTIEMÉTICO ANTIDOPAMINÉRGICO (EX.: METOCLOPRAMIDA) + AINE (EX.: CETOPROFENO/IBUPROFENO) ± HIDRATAÇÃO.",
      "- CONSIDERAR MAGNÉSIO EV OU TRIPTANO SE ELEGÍVEL (SEM CONTRAINDICAÇÕES).",
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
        "- DEFINIR A SUSPEITA PRINCIPAL (HSA, MENINGITE, TVC, TUMOR/HIC, ARTERITE TEMPORAL, CRISE HIPERTENSIVA, DISSECÇÃO).",
        "- CONSIDERAR NEUROIMAGEM (TC SEM CONTRASTE NA URGÊNCIA PARA QUADROS AGUDOS OU COM ALARME).",
        "- SE SUSPEITA DE HSA E TC NEGATIVA: CONDUTA ADICIONAL CONFORME TEMPO DE INÍCIO E PROTOCOLO (LP/ANGIO-TC).",
        "- SE FEBRE/RIGIDEZ DE NUCA: CONSIDERAR MENINGITE/ENCEFALITE (ANTIBIÓTICO/ANTIVIRAL CONFORME PROTOCOLO + LP QUANDO SEGURO).",
        "- SE GESTAÇÃO/PUERPÉRIO: CONSIDERAR TVC E PRÉ-ECLÂMPSIA (PA, LABORATÓRIO, IMAGEM CONFORME SUSPEITA).",
        "",
        "ALÍVIO SINTOMÁTICO (ENQUANTO INVESTIGA):",
        "- ANALGESIA E ANTIEMÉTICO; EVITAR OPIOIDES COMO PRIMEIRA LINHA, SE POSSÍVEL.",
        "",
        "OBS: DOCUMENTAR AS RED FLAGS, O EXAME NEUROLÓGICO E A REAVALIAÇÃO.",
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
 * Classificação das cefaleias primárias pelo ICHD-3.
 *
 * Os três conjuntos são avaliados ao mesmo tempo e em separado, e o
 * resultado pode ser "nenhum" ou "mais de um" — não é um escolhe-um. Quando
 * um conjunto não fecha, o laudo diz O QUE FALTA, em vez de apenas negar:
 * é a diferença entre "não é enxaqueca" e "falta perguntar sobre náusea".
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
    const fechados = avaliarICHD(r).filter((c) => c.fecha).map((c) => c.nome);
    if (fechados.length === 0) return "NENHUM CONJUNTO ICHD-3 PREENCHIDO";
    if (fechados.length === 1) return `TIPO PROVÁVEL: ${fechados[0]}`;
    return `MAIS DE UM CONJUNTO FECHA: ${fechados.join(" + ")}`;
  },
  laudo: (_p, r) => {
    const avaliacoes = avaliarICHD(r);
    const fechados = avaliacoes.filter((c) => c.fecha).map((c) => c.nome);

    const conclusao =
      fechados.length === 0
        ? ["CONCLUSÃO: NENHUM CONJUNTO DE CRITÉRIOS ICHD-3 FOI PREENCHIDO.",
           "- REVISAR OS DADOS OU CONSIDERAR OUTRAS CAUSAS."]
        : fechados.length === 1
          ? [`CONCLUSÃO: TIPO PROVÁVEL — ${fechados[0]}.`]
          : [`CONCLUSÃO: MAIS DE UM CONJUNTO FECHA (${fechados.join(" + ")}).`,
             "- REVISAR OS CRITÉRIOS: OS CONJUNTOS DEVERIAM SER MUTUAMENTE EXCLUDENTES NA PRÁTICA."];

    return cx([
      "CLASSIFICAÇÃO DE CEFALEIA (ICHD-3)",
      "",
      ...avaliacoes.map((c) => `${c.nome}: ${c.fecha ? "PREENCHE" : `NÃO PREENCHE — ${c.motivo}`}`),
      "",
      ...conclusao,
      "",
      "OBS: ESTA CLASSIFICAÇÃO VALE PARA CEFALEIAS PRIMÁRIAS. SE HOUVER RED FLAG, USAR O PROTOCOLO DE CEFALEIA.",
    ]);
  },
};

function avaliarICHD(r: Resposta) {
  const marcado = (id: string) => r[id] === 1;
  const conta = (ids: string[]) => ids.filter(marcado).length;

  // ---- migrânea sem aura ----
  let migranea: { fecha: boolean; motivo: string };
  if (!marcado("dur_migranea")) {
    migranea = { fecha: false, motivo: "FALTA A DURAÇÃO DE 4–72H" };
  } else if (conta(["m_unilateral", "m_pulsatil", "m_intensidade", "m_atividade"]) < 2) {
    migranea = { fecha: false, motivo: "FALTAM ≥2 CARACTERÍSTICAS (UNILATERAL/PULSÁTIL/INTENSIDADE/PIORA)" };
  } else if (marcado("m_nausea") || (marcado("m_foto") && marcado("m_fono"))) {
    migranea = { fecha: true, motivo: "" };
  } else {
    migranea = { fecha: false, motivo: "FALTA NÁUSEA/VÔMITO OU FOTOFOBIA + FONOFOBIA" };
  }

  // ---- tensional ----
  let tensional: { fecha: boolean; motivo: string };
  if (!marcado("dur_tensional")) {
    tensional = { fecha: false, motivo: "FALTA A DURAÇÃO DE 30 MIN–7 DIAS" };
  } else if (conta(["t_bilateral", "t_aperto", "t_intensidade", "t_atividade"]) < 2) {
    tensional = { fecha: false, motivo: "FALTAM ≥2 CARACTERÍSTICAS (BILATERAL/APERTO/LEVE-MODERADA/NÃO PIORA)" };
  } else if (!marcado("t_sem_nausea")) {
    tensional = { fecha: false, motivo: "FALTA CONFIRMAR AUSÊNCIA DE NÁUSEA E VÔMITO" };
  } else if (marcado("t_foto") && marcado("t_fono")) {
    tensional = { fecha: false, motivo: "FOTOFOBIA E FONOFOBIA JUNTAS NÃO FECHAM TENSIONAL" };
  } else {
    tensional = { fecha: true, motivo: "" };
  }

  // ---- salvas ----
  let salvas: { fecha: boolean; motivo: string };
  const autonomicos = conta([
    "c_lacrimejamento", "c_nasal", "c_edema", "c_sudorese", "c_miose",
  ]);
  if (!marcado("dur_salvas")) {
    salvas = { fecha: false, motivo: "FALTA A DURAÇÃO DE 15–180 MIN" };
  } else if (!(marcado("c_local") && marcado("c_severa"))) {
    salvas = { fecha: false, motivo: "FALTA LOCALIZAÇÃO TÍPICA UNILATERAL E/OU INTENSIDADE SEVERA" };
  } else if (autonomicos === 0 && !marcado("c_agitacao")) {
    salvas = { fecha: false, motivo: "FALTAM SINAIS AUTONÔMICOS IPSILATERAIS OU AGITAÇÃO/INQUIETAÇÃO" };
  } else {
    salvas = { fecha: true, motivo: "" };
  }

  return [
    { nome: "MIGRÂNEA (ICHD-3)", ...migranea },
    { nome: "TENSIONAL (ICHD-3)", ...tensional },
    { nome: "SALVAS/CLUSTER (ICHD-3)", ...salvas },
  ];
}
