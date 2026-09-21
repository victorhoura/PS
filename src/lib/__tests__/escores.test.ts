import { describe, expect, it } from "vitest";
import {
  CALCULADORAS,
  acharCalculadora,
  respostaInicial,
  somar,
  valoresIniciais,
  type Calculadora,
  type Resposta,
  type Valores,
} from "../calculadoras";

/** Preenche um escore como se fosse a tela: marcações por cima do inicial. */
function responder(calc: Calculadora, marcado: Resposta, numeros: Valores = {}) {
  const r = { ...respostaInicial(calc), ...marcado };
  const v = { ...valoresIniciais(calc), ...numeros };
  const p = somar(calc, r);
  return { pontos: p, laudo: calc.laudo(p, r, v), resumo: calc.resumo(p, r, v) };
}

function pegar(slug: string): Calculadora {
  const c = acharCalculadora(slug);
  if (!c) throw new Error(`escore ${slug} não existe`);
  return c;
}

describe("registro de escores", () => {
  it("não tem slug repetido", () => {
    const slugs = CALCULADORAS.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("não tem id de critério repetido dentro do mesmo escore", () => {
    // Dois critérios com o mesmo id compartilhariam a resposta em silêncio,
    // e marcar um mudaria o outro.
    for (const c of CALCULADORAS) {
      const ids = c.grupos.flatMap((g) => g.criterios.map((k) => k.id));
      expect(new Set(ids).size, `${c.slug}: id repetido`).toBe(ids.length);
    }
  });

  it("todo escore responde com laudo e resumo na resposta inicial", () => {
    for (const c of CALCULADORAS) {
      const r = respostaInicial(c);
      const v = valoresIniciais(c);
      const p = somar(c, r);
      expect(c.laudo(p, r, v).length, `${c.slug}: laudo vazio`).toBeGreaterThan(0);
      expect(c.resumo(p, r, v).length, `${c.slug}: resumo vazio`).toBeGreaterThan(0);
    }
  });

  it("campos numéricos começam vazios, não em zero", () => {
    for (const c of CALCULADORAS) {
      for (const campo of c.campos ?? []) {
        expect(valoresIniciais(c)[campo.id], `${c.slug}/${campo.id}`).toBeNull();
      }
    }
  });
});

describe("NIHSS", () => {
  const nihss = pegar("nihss");

  it("começa zerada e classifica sem déficit", () => {
    const { pontos, resumo } = responder(nihss, {});
    expect(pontos).toBe(0);
    expect(resumo).toContain("SEM DÉFICIT");
  });

  it("soma os 11 itens e chega ao teto de 42", () => {
    const maximo: Resposta = {
      "1a": 3, "1b": 2, "1c": 2, "2": 2, "3": 3, "4": 3,
      "5a": 4, "5b": 4, "6a": 4, "6b": 4, "7": 2, "8": 2,
      "9": 3, "10": 2, "11": 2,
    };
    const { pontos, resumo } = responder(nihss, maximo);
    expect(pontos).toBe(42);
    expect(resumo).toContain("GRAVE");
  });

  it("classifica pelas faixas usuais", () => {
    expect(responder(nihss, { "1a": 3 }).resumo).toContain("LEVE");
    expect(responder(nihss, { "5a": 4, "5b": 4 }).resumo).toContain("MODERADO");
    // 4+4+4+4 = 16, o piso da faixa
    expect(responder(nihss, { "5a": 4, "5b": 4, "6a": 4, "6b": 4 }).resumo)
      .toContain("MODERADO A GRAVE");
    expect(responder(nihss, { "5a": 4, "5b": 4, "6a": 4, "6b": 4, "9": 3, "4": 3 }).resumo)
      .toContain("GRAVE (21–42)");
  });

  it("o laudo lista item a item, e não só o total", () => {
    const { laudo } = responder(nihss, { "9": 3 });
    expect(laudo).toContain("9. LINGUAGEM (AFASIA): 3 - MUDO/AFASIA GLOBAL");
    expect(laudo).toContain("1A. NÍVEL DE CONSCIÊNCIA: 0 - ALERTA");
  });
});

describe("CINCINNATI", () => {
  const cin = pegar("cincinnati");

  it("sem achado não levanta suspeita, mas avisa que não exclui", () => {
    const { pontos, resumo, laudo } = responder(cin, {});
    expect(pontos).toBe(0);
    expect(resumo).toContain("NENHUM ACHADO");
    expect(laudo).toContain("NÃO EXCLUI AVC");
  });

  it("um achado já aciona o protocolo", () => {
    const { pontos, resumo, laudo } = responder(cin, { fala: 1 });
    expect(pontos).toBe(1);
    expect(resumo).toContain("SUSPEITA DE AVC");
    expect(laudo).toContain("ACIONAR PROTOCOLO DE AVC");
    expect(laudo).toContain("FALA (DISARTRIA/AFASIA): ANORMAL");
    expect(laudo).toContain("FACE (ASSIMETRIA): NORMAL");
  });
});

describe("WELLS (TEP)", () => {
  const wells = pegar("wells-tep");

  it("soma os pesos fracionários", () => {
    expect(responder(wells, { fc: 1, imob: 1, previa: 1 }).pontos).toBe(4.5);
    expect(responder(wells, { tvp: 1, provavel: 1, fc: 1 }).pontos).toBe(7.5);
  });

  it("separa os três níveis nos cortes certos", () => {
    expect(responder(wells, { hemoptise: 1 }).laudo).toContain("BAIXA PROBABILIDADE");
    expect(responder(wells, { fc: 1, previa: 1 }).laudo).toContain("PROBABILIDADE INTERMEDIÁRIA");
    expect(responder(wells, { tvp: 1, provavel: 1, fc: 1 }).laudo).toContain("ALTA PROBABILIDADE");
  });

  it("alta probabilidade não manda pedir D-dímero", () => {
    const { laudo } = responder(wells, { tvp: 1, provavel: 1, fc: 1 });
    expect(laudo).toContain("NÃO USAR D-DÍMERO PARA EXCLUIR");
    expect(laudo).toContain("IMAGEM IMEDIATA");
  });

  it("REGRESSÃO: PERC sem idade ou SpO2 é indeterminada, nunca negativa", () => {
    // Dar PERC como negativa com campo em branco seria liberar o paciente
    // sem exame por causa de um dado que ninguém preencheu.
    const semNada = responder(wells, {});
    expect(semNada.laudo).toContain("PERC: INDETERMINADO");
    expect(semNada.laudo).not.toContain("PERC: NEGATIVO");
    expect(semNada.laudo).toContain("SOLICITAR D-DÍMERO");

    const soIdade = responder(wells, {}, { idade: 30 });
    expect(soIdade.laudo).toContain("PERC: INDETERMINADO");
    expect(soIdade.laudo).toContain("SPO2");
  });

  it("PERC negativa só com os oito itens negativos", () => {
    const { laudo } = responder(wells, {}, { idade: 30, spo2: 98 });
    expect(laudo).toContain("PERC: NEGATIVO");
    expect(laudo).toContain("PODE EXCLUIR TEP SEM D-DÍMERO E SEM IMAGEM");
  });

  it("qualquer item da PERC presente já a torna positiva, e diz qual", () => {
    const idoso = responder(wells, {}, { idade: 62, spo2: 98 });
    expect(idoso.laudo).toContain("PERC: POSITIVO");
    expect(idoso.laudo).toContain("IDADE ≥ 50");
    expect(idoso.laudo).toContain("SOLICITAR D-DÍMERO");

    const hipoxemico = responder(wells, {}, { idade: 30, spo2: 93 });
    expect(hipoxemico.laudo).toContain("SPO2 < 95%");
  });

  it("os itens que a PERC compartilha com o Wells são lidos do mesmo lugar", () => {
    // FC, hemoptise e TVP/TEP prévia pontuam no Wells E reprovam a PERC.
    const { laudo, pontos } = responder(wells, { hemoptise: 1 }, { idade: 30, spo2: 98 });
    expect(pontos).toBe(1);
    expect(laudo).toContain("PERC: POSITIVO");
    expect(laudo).toContain("HEMOPTISE");
  });

  it("PERC não é invocada para excluir em alta probabilidade", () => {
    // Critérios que pesam no Wells sem reprovar a PERC: assim ela sai
    // NEGATIVA e mesmo assim a conduta tem que ser de alta probabilidade.
    const { laudo } = responder(wells, { tvp: 1, provavel: 1, cancer: 1 }, { idade: 30, spo2: 99 });
    expect(laudo).toContain("PERC: NEGATIVO");
    expect(laudo).not.toContain("PODE EXCLUIR TEP SEM D-DÍMERO");
    expect(laudo).toContain("IMAGEM IMEDIATA");
  });

  it("os três itens exclusivos da PERC não somam ponto no Wells", () => {
    expect(responder(wells, { edema: 1, estrogenio: 1, cirurgia: 1 }).pontos).toBe(0);
  });
});
