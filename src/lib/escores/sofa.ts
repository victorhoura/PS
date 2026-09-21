/**
 * SOFA completo — seis domínios, cada um de 0 a 4.
 *
 * Não é somatório de marcações: cada domínio é uma conta sobre valores
 * medidos (relação PaO2/FiO2, plaquetas, bilirrubina, dose de vasopressor,
 * Glasgow, creatinina). Por isso a pontuação toda mora aqui, e os grupos de
 * marcação só escolhem MODO (por gasometria ou por oximetria) e QUAL droga —
 * eles próprios não valem ponto.
 *
 * O ponto delicado é o domínio faltando. O PS.py soma o que tiver e escreve
 * "parcial se faltar dados"; um SOFA de 6 domínios somando 4 é outro número
 * que um SOFA de 3 domínios somando 4, e ler o segundo como se fosse o
 * primeiro subestima a gravidade. Aqui isso sai no resumo, em cima, e não
 * numa ressalva no rodapé do laudo.
 */

import type { Calculadora, Resposta, Valores } from "./tipos";
import { cx, n1 } from "./tipos";

/** O que um domínio devolve: nota (ou null, se faltou dado) e a leitura. */
interface Dominio {
  nome: string;
  nota: number | null;
  detalhe: string;
}

const num = (v: Valores, id: string): number | null => {
  const x = v[id];
  return x === null || x === undefined || Number.isNaN(x) ? null : x;
};

/** PaO2/FiO2 e SpO2/FiO2. Sem suporte ventilatório o domínio trava em 2. */
function respiratorio(r: Resposta, v: Valores): Dominio {
  const fio2 = num(v, "fio2");
  if (fio2 === null || fio2 <= 0) {
    return { nome: "RESPIRATÓRIO", nota: null, detalhe: "RESP: FIO2 NÃO INFORMADA." };
  }
  const fracao = fio2 / 100;
  const suporte = r.suporte === 1;
  const porOximetria = r.metodo === 1;

  const medida = num(v, porOximetria ? "spo2" : "pao2");
  if (medida === null || medida <= 0) {
    return {
      nome: "RESPIRATÓRIO",
      nota: null,
      detalhe: porOximetria
        ? "RESP: MODO SPO2/FIO2 ESCOLHIDO, MAS SPO2 NÃO INFORMADA."
        : "RESP: MODO PAO2/FIO2 ESCOLHIDO, MAS PAO2 NÃO INFORMADA.",
    };
  }

  const razao = medida / fracao;
  let nota: number;
  if (porOximetria) {
    if (razao >= 512) nota = 0;
    else if (razao < 89 && suporte) nota = 4;
    else if (razao < 214 && suporte) nota = 3;
    else if (razao < 357) nota = 2;
    else nota = 1;
  } else {
    if (razao >= 400) nota = 0;
    else if (razao < 100 && suporte) nota = 4;
    else if (razao < 200 && suporte) nota = 3;
    else if (razao < 300) nota = 2;
    else nota = 1;
  }
  // As notas 3 e 4 pressupõem ventilação; sem ela o domínio para em 2.
  if (!suporte && nota > 2) nota = 2;

  const sigla = porOximetria ? "SPO2/FIO2" : "PAO2/FIO2";
  return {
    nome: "RESPIRATÓRIO",
    nota,
    detalhe: `RESP: ${sigla} = ${Math.round(razao)} | SUPORTE: ${suporte ? "SIM" : "NÃO"}`,
  };
}

function coagulacao(v: Valores): Dominio {
  const plaq = num(v, "plaq");
  if (plaq === null) {
    return { nome: "COAGULAÇÃO", nota: null, detalhe: "COAG: PLAQUETAS NÃO INFORMADAS." };
  }
  const nota = plaq >= 150 ? 0 : plaq < 20 ? 4 : plaq < 50 ? 3 : plaq < 100 ? 2 : 1;
  return { nome: "COAGULAÇÃO", nota, detalhe: `COAG: PLAQ ${Math.round(plaq)} MIL/MM3` };
}

function figado(v: Valores): Dominio {
  const bili = num(v, "bili");
  if (bili === null) {
    return { nome: "FÍGADO", nota: null, detalhe: "FÍGADO: BILIRRUBINA NÃO INFORMADA." };
  }
  const nota = bili < 1.2 ? 0 : bili < 2.0 ? 1 : bili < 6.0 ? 2 : bili < 12.0 ? 3 : 4;
  return { nome: "FÍGADO", nota, detalhe: `FÍGADO: BILIRRUBINA ${n1(bili)} MG/DL` };
}

const DROGAS = ["NENHUM", "DOBUTAMINA", "DOPAMINA", "NORADRENALINA", "ADRENALINA"];

/** Em uso de vasopressor a nota vem da droga e da dose; sem ele, da PAM. */
function cardiovascular(r: Resposta, v: Valores): Dominio {
  const droga = r.vaso ?? 0;
  const dose = num(v, "dose");

  if (droga === 0) {
    const pam = num(v, "pam");
    if (pam === null) {
      return { nome: "CARDIOVASCULAR", nota: null, detalhe: "CARDIO: PAM NÃO INFORMADA." };
    }
    return {
      nome: "CARDIOVASCULAR",
      nota: pam >= 70 ? 0 : 1,
      detalhe: `CARDIO: PAM ${Math.round(pam)} MMHG, SEM VASOPRESSOR`,
    };
  }

  // Dobutamina pontua 2 em qualquer dose, então não exige o campo.
  if (droga === 1) {
    return { nome: "CARDIOVASCULAR", nota: 2, detalhe: "CARDIO: DOBUTAMINA (QUALQUER DOSE)" };
  }
  if (dose === null) {
    return {
      nome: "CARDIOVASCULAR",
      nota: null,
      detalhe: `CARDIO: ${DROGAS[droga]} ESCOLHIDA, MAS DOSE NÃO INFORMADA.`,
    };
  }

  const nota = droga === 2 ? (dose <= 5 ? 2 : dose <= 15 ? 3 : 4) : dose <= 0.1 ? 3 : 4;
  return {
    nome: "CARDIOVASCULAR",
    nota,
    detalhe: `CARDIO: ${DROGAS[droga]} ${n1(dose)} MCG/KG/MIN`,
  };
}

function snc(v: Valores): Dominio {
  const gcs = num(v, "gcs");
  if (gcs === null) return { nome: "SNC", nota: null, detalhe: "SNC: GCS NÃO INFORMADO." };
  const g = Math.round(gcs);
  const nota = g === 15 ? 0 : g >= 13 ? 1 : g >= 10 ? 2 : g >= 6 ? 3 : 4;
  return { nome: "SNC (GCS)", nota, detalhe: `SNC: GCS ${g}` };
}

/** Creatinina e diurese valem os dois; vale o PIOR dos dois. */
function rim(v: Valores): Dominio {
  const cr = num(v, "cr");
  const diurese = num(v, "diurese");
  if (cr === null && diurese === null) {
    return { nome: "RIM", nota: null, detalhe: "RIM: CREATININA/DIURESE NÃO INFORMADAS." };
  }

  const notas: number[] = [];
  const partes: string[] = [];
  if (cr !== null) {
    notas.push(cr < 1.2 ? 0 : cr < 2.0 ? 1 : cr < 3.5 ? 2 : cr < 5.0 ? 3 : 4);
    partes.push(`CR ${n1(cr)}`);
  }
  if (diurese !== null) {
    notas.push(diurese < 200 ? 4 : diurese < 500 ? 3 : 0);
    partes.push(`DIURESE 24H ${Math.round(diurese)} ML`);
  }
  return { nome: "RIM", nota: Math.max(...notas), detalhe: `RIM: ${partes.join(" | ")}` };
}

function dominios(r: Resposta, v: Valores): Dominio[] {
  return [respiratorio(r, v), coagulacao(v), figado(v), cardiovascular(r, v), snc(v), rim(v)];
}

export const SOFA: Calculadora = {
  slug: "sofa",
  nome: "SOFA",
  subtitulo: "Disfunção orgânica em seis domínios (0–24)",
  campos: [
    { id: "fio2", label: "FIO2", unidade: "%" },
    { id: "pao2", label: "PAO2", unidade: "mmHg" },
    { id: "spo2", label: "SPO2", unidade: "%" },
    { id: "plaq", label: "PLAQUETAS", unidade: "mil/mm³" },
    { id: "bili", label: "BILIRRUBINA", unidade: "mg/dL" },
    { id: "pam", label: "PAM", unidade: "mmHg" },
    { id: "dose", label: "DOSE DO VASOPRESSOR", unidade: "mcg/kg/min" },
    { id: "gcs", label: "GLASGOW", unidade: "3–15" },
    { id: "cr", label: "CREATININA", unidade: "mg/dL" },
    { id: "diurese", label: "DIURESE 24H", unidade: "mL" },
    { id: "basal", label: "SOFA BASAL (OPCIONAL)", unidade: "pts" },
  ],
  grupos: [
    {
      titulo: "RESPIRATÓRIO",
      criterios: [
        {
          id: "metodo",
          label: "Como medir a oxigenação",
          padrao: 0,
          opcoes: [
            { label: "PAO2/FIO2 (GASOMETRIA ARTERIAL)", pontos: 0 },
            { label: "SPO2/FIO2 (OXIMETRIA, SEM GASO)", pontos: 1 },
          ],
        },
        { id: "suporte", label: "EM VENTILAÇÃO MECÂNICA OU NÃO INVASIVA", pontos: 0 },
      ],
    },
    {
      titulo: "VASOPRESSOR EM USO",
      criterios: [
        {
          id: "vaso",
          label: "Droga",
          padrao: 0,
          opcoes: DROGAS.map((nome, i) => ({ label: nome, pontos: i })),
        },
      ],
    },
  ],
  resumo: (_p, r, v) => {
    const ds = dominios(r, v);
    const medidos = ds.filter((d) => d.nota !== null);
    const total = medidos.reduce((s, d) => s + (d.nota ?? 0), 0);
    if (medidos.length === 0) return "PREENCHA OS DADOS DISPONÍVEIS";
    if (medidos.length < ds.length) {
      return `SOFA ${total} PARCIAL · ${medidos.length} DE ${ds.length} DOMÍNIOS`;
    }
    return `SOFA ${total}/24 · 6 DE 6 DOMÍNIOS`;
  },
  laudo: (_p, r, v) => {
    const ds = dominios(r, v);
    const medidos = ds.filter((d) => d.nota !== null);
    const faltando = ds.filter((d) => d.nota === null);
    const total = medidos.reduce((s, d) => s + (d.nota ?? 0), 0);

    const basal = num(v, "basal");
    const delta: string[] = [];
    if (basal !== null) {
      const d = total - Math.round(basal);
      delta.push(`DELTA SOFA (ATUAL - BASAL): ${d >= 0 ? "+" : ""}${d}`);
      if (d >= 2) {
        delta.push("- DELTA SOFA ≥ 2 SUGERE DISFUNÇÃO ORGÂNICA SIGNIFICATIVA.");
        delta.push("- COM INFECÇÃO SUSPEITA OU CONFIRMADA, É COMPATÍVEL COM SEPSE (SEPSIS-3).");
      }
    }

    return cx([
      "SOFA - SCORE COMPLETO",
      "",
      "DOMÍNIOS (0–4):",
      ...ds.map((d) => `- ${d.nome}: ${d.nota === null ? "—" : d.nota}`),
      "",
      faltando.length
        ? `SOFA PARCIAL: ${total} PONTOS EM ${medidos.length} DE 6 DOMÍNIOS`
        : `SOFA TOTAL: ${total}/24`,
      ...(faltando.length
        ? [`FALTAM: ${faltando.map((d) => d.nome).join(", ")} — O TOTAL SUBESTIMA A GRAVIDADE.`]
        : []),
      ...delta,
      "",
      "DETALHES:",
      ...ds.map((d) => `- ${d.detalhe}`),
      "",
      "OBS:",
      "- SOFA COMPLETO É DIFERENTE DE qSOFA (TRIAGEM).",
      "- USAR CONTEXTO CLÍNICO; NÃO SUBSTITUI JULGAMENTO MÉDICO.",
    ]);
  },
};
