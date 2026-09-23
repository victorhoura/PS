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

describe("SOFA", () => {
  const sofa = pegar("sofa");

  it("sem nenhum dado, pede os dados em vez de dizer zero", () => {
    const { resumo, laudo } = responder(sofa, {});
    expect(resumo).toBe("PREENCHA OS DADOS DISPONÍVEIS");
    expect(laudo).not.toContain("SOFA TOTAL: 0");
  });

  it("REGRESSÃO: total parcial é rotulado como parcial, e diz o que falta", () => {
    // Um SOFA de 3 domínios somando 4 não é um SOFA 4. Ler um pelo outro
    // subestima a gravidade de quem está sem gasometria.
    const { resumo, laudo } = responder(sofa, {}, { plaq: 80, bili: 3.0, gcs: 14 });
    expect(resumo).toContain("PARCIAL");
    expect(resumo).toContain("3 DE 6 DOMÍNIOS");
    expect(laudo).toContain("SOFA PARCIAL: 5 PONTOS EM 3 DE 6 DOMÍNIOS");
    expect(laudo).toContain("SUBESTIMA A GRAVIDADE");
    expect(laudo).toContain("FALTAM: RESPIRATÓRIO, CARDIOVASCULAR, RIM");
  });

  it("com os seis domínios, soma e não fala em parcial", () => {
    const { resumo, laudo } = responder(
      sofa,
      { suporte: 1 },
      { fio2: 100, pao2: 90, plaq: 15, bili: 13, pam: 60, gcs: 5, cr: 6 },
    );
    // resp 4 + coag 4 + fígado 4 + cardio 1 + snc 4 + rim 4 = 21
    expect(laudo).toContain("SOFA TOTAL: 21/24");
    expect(resumo).toContain("6 DE 6");
    expect(laudo).not.toContain("PARCIAL");
  });

  it("REGRESSÃO: sem suporte ventilatório o domínio respiratório trava em 2", () => {
    // As notas 3 e 4 pressupõem ventilação. PaO2/FiO2 de 90 sem suporte é 2.
    const semSuporte = responder(sofa, {}, { fio2: 100, pao2: 90 });
    expect(semSuporte.laudo).toContain("- RESPIRATÓRIO: 2");

    const comSuporte = responder(sofa, { suporte: 1 }, { fio2: 100, pao2: 90 });
    expect(comSuporte.laudo).toContain("- RESPIRATÓRIO: 4");
  });

  it("calcula a relação, não copia o número", () => {
    // PaO2 90 com FiO2 50% dá 180, não 90.
    const { laudo } = responder(sofa, { suporte: 1 }, { fio2: 50, pao2: 90 });
    expect(laudo).toContain("PAO2/FIO2 = 180");
    expect(laudo).toContain("- RESPIRATÓRIO: 3");
  });

  it("o modo oximetria usa as faixas de SpO2/FiO2", () => {
    const { laudo } = responder(sofa, { metodo: 1 }, { fio2: 21, spo2: 95 });
    expect(laudo).toContain("SPO2/FIO2 = 452");
    expect(laudo).toContain("- RESPIRATÓRIO: 1");
  });

  it("vasopressor pontua por droga e dose; dobutamina dispensa a dose", () => {
    expect(responder(sofa, { vaso: 1 }, {}).laudo).toContain("- CARDIOVASCULAR: 2");
    expect(responder(sofa, { vaso: 2 }, { dose: 4 }).laudo).toContain("- CARDIOVASCULAR: 2");
    expect(responder(sofa, { vaso: 2 }, { dose: 12 }).laudo).toContain("- CARDIOVASCULAR: 3");
    expect(responder(sofa, { vaso: 2 }, { dose: 20 }).laudo).toContain("- CARDIOVASCULAR: 4");
    expect(responder(sofa, { vaso: 3 }, { dose: 0.08 }).laudo).toContain("- CARDIOVASCULAR: 3");
    expect(responder(sofa, { vaso: 3 }, { dose: 0.5 }).laudo).toContain("- CARDIOVASCULAR: 4");
  });

  it("vasopressor escolhido sem dose não vira nota zero", () => {
    const { laudo } = responder(sofa, { vaso: 3 }, { pam: 50 });
    expect(laudo).toContain("- CARDIOVASCULAR: —");
    expect(laudo).toContain("DOSE NÃO INFORMADA");
  });

  it("no rim vale o pior entre creatinina e diurese", () => {
    // Diurese boa não apaga creatinina ruim.
    expect(responder(sofa, {}, { cr: 4.0, diurese: 1500 }).laudo).toContain("- RIM: 3");
    // Nem creatinina boa apaga anúria.
    expect(responder(sofa, {}, { cr: 0.9, diurese: 150 }).laudo).toContain("- RIM: 4");
  });

  it("delta em relação ao basal só aparece quando o basal é informado", () => {
    const sem = responder(sofa, {}, { plaq: 80, bili: 3.0, gcs: 14 });
    expect(sem.laudo).not.toContain("DELTA SOFA");

    const com = responder(sofa, {}, { plaq: 80, bili: 3.0, gcs: 14, basal: 1 });
    expect(com.laudo).toContain("DELTA SOFA (ATUAL - BASAL): +4");
    expect(com.laudo).toContain("COMPATÍVEL COM SEPSE");
  });

  it("delta abaixo de 2 não invoca sepse", () => {
    const { laudo } = responder(sofa, {}, { plaq: 120, basal: 0 });
    expect(laudo).toContain("DELTA SOFA (ATUAL - BASAL): +1");
    expect(laudo).not.toContain("COMPATÍVEL COM SEPSE");
  });

  it("sem basal, cita a premissa do Sepsis-3 de basal zero", () => {
    const { laudo } = responder(sofa, {}, { plaq: 80, bili: 3.0 });
    expect(laudo).toContain("O SEPSIS-3 ASSUME BASAL 0");
    // Total < 2 sem basal não diz nada sobre sepse.
    expect(responder(sofa, {}, { plaq: 120 }).laudo).not.toContain("ASSUME BASAL 0");
  });

  it("REGRESSÃO: FiO2 em fração não vira domínio respiratório normal", () => {
    // 0,5 lido como 0,5% dava PaO2/FiO2 de 18.000 e nota zero.
    const { laudo } = responder(sofa, { suporte: 1 }, { fio2: 0.5, pao2: 90 });
    expect(laudo).toContain("- RESPIRATÓRIO: —");
    expect(laudo).toContain("FIO2 DEVE SER EM %");
  });

  it("S/F com SpO2 acima de 98% avisa que está fora da faixa validada", () => {
    const fora = responder(sofa, { metodo: 1 }, { fio2: 21, spo2: 99 });
    expect(fora.laudo).toContain("FORA DA FAIXA EM QUE O S/F FOI VALIDADO");
    const dentro = responder(sofa, { metodo: 1 }, { fio2: 21, spo2: 95 });
    expect(dentro.laudo).not.toContain("FORA DA FAIXA");
  });

  it("Glasgow fora de 3–15 não pontua", () => {
    expect(responder(sofa, {}, { gcs: 2 }).laudo).toContain("- SNC: —");
    expect(responder(sofa, {}, { gcs: 16 }).laudo).toContain("FORA DA ESCALA");
  });
});

describe("ATLANTA", () => {
  const atl = pegar("atlanta");

  it("nada marcado é leve", () => {
    const { resumo, laudo } = responder(atl, {});
    expect(resumo).toBe("LEVE");
    expect(laudo).toContain("SEM FALÊNCIA ORGÂNICA E SEM COMPLICAÇÕES");
    expect(laudo).toContain("REALIMENTAÇÃO ORAL PRECOCE");
  });

  it("falência transitória ou complicação é moderadamente grave", () => {
    expect(responder(atl, { transitoria: 1 }).resumo).toBe("MODERADAMENTE GRAVE");
    expect(responder(atl, { local: 1 }).resumo).toBe("MODERADAMENTE GRAVE");
    expect(responder(atl, { sistemica: 1 }).resumo).toBe("MODERADAMENTE GRAVE");
  });

  it("REGRESSÃO: falência persistente prevalece, sozinha e sobre a transitória", () => {
    expect(responder(atl, { persistente: 1 }).resumo).toBe("GRAVE");
    const ambas = responder(atl, { persistente: 1, transitoria: 1, local: 1 });
    expect(ambas.resumo).toBe("GRAVE");
    expect(ambas.laudo).toContain("FALÊNCIA ORGÂNICA PERSISTENTE");
    expect(ambas.laudo).toContain("MANEJO EM UTI");
  });

  it("lista todos os motivos quando são vários", () => {
    const { laudo } = responder(atl, { transitoria: 1, local: 1, sistemica: 1 });
    expect(laudo).toContain("FALÊNCIA ORGÂNICA TRANSITÓRIA (<48H) / COMPLICAÇÕES LOCAIS / COMPLICAÇÕES SISTÊMICAS");
  });
});

describe("HINCHEY", () => {
  const hin = pegar("hinchey");

  it("começa no estágio I", () => {
    expect(responder(hin, {}).laudo).toContain("ESTÁGIO: I");
  });

  it("cada estágio traz a própria conduta", () => {
    expect(responder(hin, { estagio: 1 }).laudo).toContain("DRENAGEM PERCUTÂNEA");
    expect(responder(hin, { estagio: 2 }).laudo).toContain("AVALIAÇÃO CIRÚRGICA URGENTE");
    expect(responder(hin, { estagio: 3 }).laudo).toContain("EMERGÊNCIA CIRÚRGICA");
    expect(responder(hin, { estagio: 3 }).laudo).toContain("ESTÁGIO: IV");
  });
});

describe("TOKYO - COLANGITE", () => {
  const tk = pegar("tokyo-colangite");

  it("REGRESSÃO: sem inflamação sistêmica não há suspeita, mesmo com B e C", () => {
    // Colestase com imagem alterada e sem inflamação é obstrução biliar,
    // não colangite. O critério A é obrigatório nos dois níveis.
    const { laudo } = responder(tk, { b_lft: 1, c_dilatacao: 1 });
    expect(laudo).toContain("CRITÉRIOS INSUFICIENTES");
  });

  it("A + B ou A + C é suspeita; A + B + C é definitiva", () => {
    expect(responder(tk, { a_febre: 1, b_lft: 1 }).laudo).toContain("SUSPEITA DE COLANGITE");
    expect(responder(tk, { a_febre: 1, c_dilatacao: 1 }).laudo).toContain("SUSPEITA DE COLANGITE");
    expect(responder(tk, { a_febre: 1, b_lft: 1, c_dilatacao: 1 }).laudo)
      .toContain("COLANGITE DEFINITIVA");
  });

  it("bilirrubina ≥ 2 fecha o critério B sozinha", () => {
    const { laudo } = responder(tk, { a_febre: 1, c_dilatacao: 1 }, { bilirrubina: 2.4 });
    expect(laudo).toContain("COLANGITE DEFINITIVA");
    expect(laudo).toContain("- B (COLESTASE): SIM");

    const abaixo = responder(tk, { a_febre: 1, c_dilatacao: 1 }, { bilirrubina: 1.5 });
    expect(abaixo.laudo).toContain("- B (COLESTASE): NÃO");
  });

  it("qualquer disfunção orgânica leva a grau III, e diz qual", () => {
    const { laudo, resumo } = responder(tk, { a_febre: 1, b_lft: 1, g3_renal: 1 });
    expect(resumo).toContain("GRAU III (GRAVE)");
    expect(laudo).toContain("DISFUNÇÃO ORGÂNICA: RENAL");
    expect(laudo).toContain("DRENAGEM BILIAR O QUANTO ANTES");
  });

  it("grau II conta os critérios e avisa quando fechou com um só", () => {
    // O PS.py fecha grau II com 1 critério; o TG18 publicado pede 2 de 5.
    const um = responder(tk, { a_febre: 1, b_lft: 1 }, { idade: 80 });
    expect(um.resumo).toContain("GRAU II");
    expect(um.laudo).toContain("CRITÉRIOS DE GRAU II PRESENTES: 1 DE 5");
    expect(um.laudo).toContain("O TG18 PUBLICADO EXIGE 2 DE 5");

    const dois = responder(tk, { a_febre: 1, b_lft: 1 }, { idade: 80, temp: 39.5 });
    expect(dois.laudo).toContain("CRITÉRIOS DE GRAU II PRESENTES: 2 DE 5");
    expect(dois.laudo).not.toContain("EXIGE 2 DE 5");
  });

  it("leucopenia também conta como critério de grau II", () => {
    const { laudo } = responder(tk, { a_febre: 1, b_lft: 1 }, { leuco: 3200 });
    expect(laudo).toContain("LEUCÓCITOS 3200");
    expect(laudo).toContain("GRAU II");
  });

  it("sem critério nenhum é grau I", () => {
    const { resumo, laudo } = responder(tk, { a_febre: 1, b_lft: 1 }, { leuco: 9000, idade: 40 });
    expect(resumo).toContain("GRAU I (LEVE)");
    expect(laudo).toContain("PODE RESPONDER A TRATAMENTO CLÍNICO");
  });
});

describe("TOKYO - COLECISTITE", () => {
  const tk = pegar("tokyo-colecistite");

  it("A + B é suspeita; com imagem vira definitiva", () => {
    expect(responder(tk, { a_murphy: 1, b_febre: 1 }).laudo).toContain("SUSPEITA DE COLECISTITE");
    expect(responder(tk, { a_murphy: 1, b_febre: 1, c_imagem: 1 }).laudo)
      .toContain("COLECISTITE DEFINITIVA");
  });

  it("imagem sozinha não diagnostica", () => {
    expect(responder(tk, { c_imagem: 1 }).laudo).toContain("CRITÉRIOS INSUFICIENTES");
  });

  it("leucócitos acima de 18 mil entram no grau II", () => {
    const { laudo, resumo } = responder(tk, { a_murphy: 1, b_febre: 1 }, { leuco: 19000 });
    expect(resumo).toContain("GRAU II");
    expect(laudo).toContain("LEUCÓCITOS 19000 (>18.000)");

    const abaixo = responder(tk, { a_murphy: 1, b_febre: 1 }, { leuco: 15000 });
    expect(abaixo.resumo).toContain("GRAU I");
  });

  it("disfunção orgânica prevalece sobre os critérios de grau II", () => {
    const { resumo, laudo } = responder(tk, { a_murphy: 1, b_febre: 1, g3_orgao: 1, g2_72h: 1 });
    expect(resumo).toContain("GRAU III");
    expect(laudo).toContain("COLECISTOSTOMIA");
  });
});

describe("CHARCOT / REYNOLDS", () => {
  const ch = pegar("charcot-reynolds");

  it("tríade incompleta não exclui, e manda para o TG18", () => {
    const { resumo, laudo } = responder(ch, { febre: 1, dor: 1 });
    expect(resumo).toContain("TRÍADE 2/3");
    expect(laudo).toContain("NÃO FECHA A TRÍADE COMPLETA");
    expect(laudo).toContain("NÃO EXCLUI COLANGITE");
    expect(laudo).toContain("CRITÉRIOS DE TÓQUIO");
  });

  it("as três fecham a tríade de Charcot", () => {
    const { resumo, laudo } = responder(ch, { febre: 1, dor: 1, ictericia: 1 });
    expect(resumo).toBe("TRÍADE DE CHARCOT POSITIVA");
    expect(laudo).toContain("TRÍADE DE CHARCOT: 3/3");
    expect(laudo).toContain("INICIAR ANTIBIÓTICO");
  });

  it("as cinco fecham a pêntade de Reynolds, com conduta de sepse", () => {
    const todos = { febre: 1, dor: 1, ictericia: 1, hipotensao: 1, sensorio: 1 };
    const { resumo, laudo } = responder(ch, todos);
    expect(resumo).toBe("PÊNTADE DE REYNOLDS POSITIVA");
    expect(laudo).toContain("PÊNTADE DE REYNOLDS: 5/5");
    expect(laudo).toContain("PROTOCOLO DE SEPSE");
    expect(laudo).toContain("CONSIDERAR UTI");
  });

  it("REGRESSÃO: hipotensão e sensório sem a tríade não fazem pêntade", () => {
    // Pêntade é tríade MAIS os dois, não dois de cinco.
    const { resumo, laudo } = responder(ch, { hipotensao: 1, sensorio: 1 });
    expect(resumo).not.toContain("PÊNTADE DE REYNOLDS POSITIVA");
    expect(laudo).toContain("NÃO FECHA A TRÍADE COMPLETA");
  });
});

describe("HIPONATREMIA", () => {
  const hipo = pegar("hiponatremia");

  /** Sódio final por balanço de massa: o que a fórmula promete tem que acontecer. */
  const sodioFinal = (na: number, act: number, litros: number) =>
    (na * act + 513 * litros) / (act + litros);

  it("REGRESSÃO: sem os campos, pede os dados em vez de calcular com zero", () => {
    // Volume zero num laudo é prescrição errada com cara de resultado.
    const { resumo, laudo } = responder(hipo, {});
    expect(resumo).toContain("PREENCHA");
    expect(laudo).toContain("PREENCHA PESO, SÓDIO ATUAL E SÓDIO DESEJADO");
    expect(laudo).not.toContain("0 ML DE NACL");
  });

  it("aplica Adrogué–Madias, conferido na mão", () => {
    // Homem 70 kg -> ACT 42 L. 1 L de NaCl 3% sobe (513-120)/(42+1) = 9,14.
    // Subir 8: 8/9,14 = 875 mL em 24h = 36 mL/h. O alvo de +10 pediria 1.094.
    const { laudo, resumo } = responder(hipo, {}, { peso: 70, na: 120, alvo: 130 });
    expect(laudo).toContain("~9,1 MEQ/L");
    expect(laudo).toContain("EXIGIRIA 1.094 ML");
    expect(laudo).toContain("VOLUME: 875 ML DE NACL 3% EM 24H");
    expect(laudo).toContain("36 ML/H");
    expect(resumo).toBe("NACL 3% 875 mL EM 24H (36 mL/H) · +8,0 mEq/L");
  });

  it("REGRESSÃO: o volume prescrito produz a subida que o laudo anuncia", () => {
    // A conta do PS.py (ACT × ΔNa ÷ 513) dava 655 mL para os mesmos +8, que
    // por balanço de massa sobem o sódio só 6,0: ela esquece a água que
    // entra junto com o sódio.
    const { laudo } = responder(hipo, {}, { peso: 70, na: 120, alvo: 128 });
    const ml = Number(/VOLUME: ([\d.]+) ML/.exec(laudo)![1].replace(".", ""));
    expect(sodioFinal(120, 42, ml / 1000) - 120).toBeCloseTo(8, 0);
    expect(laudo).not.toContain("655 ML");
  });

  it("a água corporal muda com o sexo e a idade", () => {
    const vol = (sexo: number) =>
      responder(hipo, { sexo }, { peso: 70, na: 120, alvo: 130 }).laudo;
    // Mulher e homem idoso: ACT 35 L -> 733 mL. Mulher idosa: 31,5 L -> 662 mL.
    expect(vol(1)).toContain("VOLUME: 733 ML");
    expect(vol(1)).toContain("ÁGUA CORPORAL TOTAL: 35,0 L");
    expect(vol(2)).toContain("VOLUME: 733 ML");
    expect(vol(2)).toContain("HOMEM IDOSO");
    expect(vol(3)).toContain("VOLUME: 662 ML");
    expect(vol(3)).toContain("ÁGUA CORPORAL TOTAL: 31,5 L");
  });

  it("REGRESSÃO: o volume infundido nunca passa dos 8 mEq/L em 24h", () => {
    // Alvo pedindo 20 de subida: o volume continua o de 8.
    const { laudo } = responder(hipo, {}, { peso: 70, na: 115, alvo: 135 });
    expect(laudo).toContain("VOLUME: 864 ML");
    expect(laudo).toContain("EXIGIRIA 2.161 ML");
    expect(laudo).toContain("LIMITADA A 8 MEQ/L EM 24H");
  });

  it("alvo que não sobe não vira volume, nem negativo nem zero", () => {
    const { laudo, resumo } = responder(hipo, {}, { peso: 70, na: 130, alvo: 125 });
    expect(resumo).toContain("NÃO É MAIOR QUE O ATUAL");
    expect(laudo).not.toContain("-");
    expect(laudo).not.toContain("ML/H");
  });

  it("REGRESSÃO: sódio normal não recebe salina hipertônica", () => {
    const { laudo, resumo } = responder(hipo, {}, { peso: 70, na: 138, alvo: 142 });
    expect(resumo).toContain("NÃO HÁ HIPONATREMIA");
    expect(laudo).not.toContain("ML/H");
  });

  it("traz o bólus dos sintomas graves e os limites de segurança", () => {
    const { laudo } = responder(hipo, {}, { peso: 70, na: 118, alvo: 124 });
    expect(laudo).toContain("NACL 3% 150 ML EV EM 20 MIN");
    expect(laudo).toContain("ATÉ 3 BÓLUS NO TOTAL");
    expect(laudo).toContain("10 MEQ/L NAS PRIMEIRAS 24H");
    expect(laudo).toContain("NA ≤ 105");
    expect(laudo).toContain("DESMOPRESSINA");
    expect(laudo).toContain("55 ML NACL 20% + 445 ML SF 0,9%");
  });
});

describe("HIPERNATREMIA", () => {
  const hiper = pegar("hipernatremia");

  it("não calcula sem peso e sódio", () => {
    expect(responder(hiper, {}).laudo).toContain("PREENCHA PESO E SÓDIO SÉRICO");
  });

  it("REGRESSÃO: sódio ≤ 145 diz que não há o que corrigir", () => {
    const { resumo, laudo } = responder(hiper, {}, { peso: 70, na: 142 });
    expect(resumo).toContain("NÃO HÁ HIPERNATREMIA");
    expect(laudo).toContain("NÃO HÁ HIPERNATREMIA PARA CORRIGIR");
    expect(laudo).not.toContain("ML/H");
  });

  it("aplica Adrogué–Madias, conferido na mão", () => {
    // Homem 70 kg -> ACT 42. Na 160, reduzir 8.
    // Água livre: 8*(42+1)/160 = 2,15 L. Salina 0,45%: 344/83 = 4,15 L.
    const { laudo } = responder(hiper, {}, { peso: 70, na: 160 });
    expect(laudo).toContain("ÁGUA LIVRE = 2.150 ML");
    expect(laudo).toContain("SOLUÇÃO SALINA 0,45% = 4.145 ML");
    expect(laudo).toContain("SOLUÇÃO SALINA 0,225% = 2.831 ML");
    expect(laudo).toContain("REDUZIR ATÉ 8,0 MEQ/L EM 24H");
  });

  it("a idosa tem menos água, e recebe menos volume", () => {
    // ACT 70 × 0,45 = 31,5. Água livre: 8*(31,5+1)/160 = 1,625 L.
    const { laudo } = responder(hiper, { sexo: 3 }, { peso: 70, na: 160 });
    expect(laudo).toContain("ÁGUA LIVRE = 1.625 ML");
    expect(laudo).toContain("MULHER IDOSA");
  });

  it("não reduz abaixo de 145 mesmo quando 8 caberiam", () => {
    // Na 150: só há 5 de margem até 145, não 8.
    const { laudo } = responder(hiper, {}, { peso: 70, na: 150 });
    expect(laudo).toContain("REDUZIR ATÉ 5,0 MEQ/L EM 24H");
  });

  it("lembra que o volume não inclui as perdas que continuam", () => {
    const { laudo } = responder(hiper, {}, { peso: 70, na: 160 });
    expect(laudo).toContain("NÃO INCLUI AS PERDAS QUE CONTINUAM");
    expect(laudo).toContain("0,5 MEQ/L/H");
  });
});

describe("HIPOCALEMIA", () => {
  const hipo = pegar("hipocalemia");

  it("não classifica sem o potássio", () => {
    expect(responder(hipo, {}).laudo).toContain("PREENCHA O POTÁSSIO");
  });

  it("classifica pelas faixas", () => {
    expect(responder(hipo, {}, { k: 3.8 }).resumo).toContain("NORMAL");
    expect(responder(hipo, {}, { k: 3.2 }).resumo).toContain("LEVE");
    expect(responder(hipo, {}, { k: 2.7 }).resumo).toContain("MODERADA");
    expect(responder(hipo, {}, { k: 2.2 }).resumo).toContain("GRAVE");
  });

  it("REGRESSÃO: com hipocalemia, ECG alterado ou sintoma pedem a conduta de grave", () => {
    // Um K de 3,3 com arritmia não é hipocalemia leve.
    expect(responder(hipo, { ecg: 1 }, { k: 3.3 }).resumo).toContain("CONDUTA DE GRAVE");
    expect(responder(hipo, { sintomas: 1 }, { k: 3.3 }).resumo).toContain("CONDUTA DE GRAVE");
    const { laudo } = responder(hipo, { ecg: 1 }, { k: 3.3 });
    expect(laudo).toContain("NUNCA EM BÓLUS");
    expect(laudo).toContain("CLASSE: LEVE PELO VALOR");
  });

  it("REGRESSÃO: com K normal, sintoma marcado não vira KCl EV", () => {
    // Antes: K 4,0 com "sintomas" saía GRAVE, com reposição EV.
    const { resumo, laudo } = responder(hipo, { sintomas: 1 }, { k: 4.0 });
    expect(resumo).toContain("NORMAL");
    expect(resumo).not.toContain("GRAVE");
    expect(laudo).not.toContain("REPOSIÇÃO EV");
    expect(laudo).toContain("INVESTIGAR OUTRA CAUSA");
  });

  it("a reposição EV é diluída em SF, não em glicose", () => {
    expect(responder(hipo, {}, { k: 2.2 }).laudo).toContain("DILUIR EM SF 0,9%");
  });

  it("via oral impossível troca a rota nas classes que a assumem", () => {
    const { laudo } = responder(hipo, { semVo: 1 }, { k: 3.2 });
    expect(laudo).toContain("USAR A ROTA EV DESTA MESMA CLASSE");
  });
});

describe("HIPERCALEMIA", () => {
  const hiper = pegar("hipercalemia");

  it("não decide sem o potássio", () => {
    expect(responder(hiper, {}).laudo).toContain("PREENCHA O POTÁSSIO");
  });

  it("REGRESSÃO: K normal não recebe insulina nem cálcio", () => {
    // Sem a trava, K 4,8 saía com solução polarizante e quelante.
    const { resumo, laudo } = responder(hiper, {}, { k: 4.8 });
    expect(resumo).toContain("SEM HIPERCALEMIA");
    expect(laudo).not.toContain("INSULINA REGULAR");
    expect(laudo).not.toContain("GLUCONATO");
    expect(laudo).not.toContain("QUELANTE:");
  });

  it("ECG alterado com K normal manda procurar outra causa, não tratar potássio", () => {
    const { laudo } = responder(hiper, { ecg: 1 }, { k: 5.0 });
    expect(laudo).toContain("PROCURAR OUTRA CAUSA");
    expect(laudo).not.toContain("GLUCONATO");
  });

  it("gradua pelo ERC: leve, moderada, grave", () => {
    expect(responder(hiper, {}, { k: 5.7 }).resumo).toContain("LEVE");
    expect(responder(hiper, {}, { k: 6.2 }).resumo).toContain("MODERADA");
    expect(responder(hiper, {}, { k: 6.6 }).resumo).toContain("GRAVE");
  });

  it("REGRESSÃO: ECG alterado é grave mesmo com K baixo para a faixa", () => {
    const comEcg = responder(hiper, { ecg: 1 }, { k: 5.8 });
    expect(comEcg.resumo).toContain("GRAVE");
    expect(comEcg.laudo).toContain("GLUCONATO DE CÁLCIO");

    const semEcg = responder(hiper, {}, { k: 5.8 });
    expect(semEcg.resumo).toContain("LEVE");
    expect(semEcg.laudo).not.toContain("GLUCONATO");
  });

  it("REGRESSÃO: o cálcio sai com mL e gramas que batem", () => {
    // 30 mL de gluconato a 10% são 3 g, não "ou 1 g": 1 g é a dose do
    // cloreto, que tem três vezes mais cálcio por mL.
    const { laudo } = responder(hiper, { ecg: 1 }, { k: 6.8 });
    expect(laudo).toContain("GLUCONATO DE CÁLCIO 10% 30 ML (3 G)");
    expect(laudo).toContain("CLORETO DE CÁLCIO 10% 10 ML (1 G)");
    expect(laudo).not.toContain("OU 1 G EV");
  });

  it("K ≥ 6,5 é grave mesmo sem ECG alterado", () => {
    const { resumo, laudo } = responder(hiper, {}, { k: 6.6 });
    expect(resumo).toContain("GRAVE");
    expect(laudo).toContain("PROTEGER MEMBRANA");
  });

  it("o shift sai a partir de 6,0 ou com ECG; bicarbonato só com acidose", () => {
    const leve = responder(hiper, {}, { k: 5.8 });
    expect(leve.laudo).not.toContain("SOLUÇÃO POLARIZANTE");
    expect(leve.laudo).toContain("SHIFT: NÃO É DE ROTINA");

    const moderada = responder(hiper, {}, { k: 6.2 });
    expect(moderada.laudo).toContain("SOLUÇÃO POLARIZANTE");
    expect(moderada.laudo).not.toContain("PROTEGER MEMBRANA");
    expect(moderada.laudo).not.toContain("BICARBONATO");

    expect(responder(hiper, { acidose: 1 }, { k: 6.2 }).laudo).toContain("BICARBONATO DE SÓDIO");
  });

  it("diálise entra por doença renal ou por gravidade", () => {
    expect(responder(hiper, { renal: 1 }, { k: 5.5 }).laudo).toContain("HEMODIÁLISE");
    expect(responder(hiper, {}, { k: 7.0 }).laudo).toContain("HEMODIÁLISE");
    expect(responder(hiper, {}, { k: 5.5 }).laudo).not.toContain("HEMODIÁLISE");
  });

  it("peso é opcional e só aparece quando informado", () => {
    expect(responder(hiper, {}, { k: 5.5 }).laudo).not.toContain("PESO:");
    expect(responder(hiper, {}, { k: 5.5, peso: 80 }).laudo).toContain("PESO: 80,0 KG");
  });
});

describe("PROTOCOLO DE CEFALEIA", () => {
  const prot = pegar("protocolo-cefaleia");

  it("sem red flag, trata como primária do tipo escolhido", () => {
    const { resumo, laudo } = responder(prot, {});
    expect(resumo).toContain("PRIMÁRIA PROVÁVEL");
    expect(laudo).toContain("NENHUMA RED FLAG MARCADA");
    expect(laudo).toContain("METOCLOPRAMIDA");
  });

  it("cada tipo primário tem a própria conduta", () => {
    expect(responder(prot, { tipo: 1 }).laudo).toContain("CEFALEIA POR ABUSO");
    expect(responder(prot, { tipo: 2 }).laudo).toContain("OXIGÊNIO 100%");
    expect(responder(prot, { tipo: 3 }).laudo).toContain("REAVALIAÇÃO SERIADA");
  });

  it("REGRESSÃO: uma red flag apaga a conduta primária", () => {
    // Tratar enxaqueca num paciente com cefaleia em trovão é perder a
    // hemorragia. O ramo secundário não pode imprimir o tratamento primário.
    const { resumo, laudo } = responder(prot, { tipo: 0, rf_trovao: 1 });
    expect(resumo).toContain("SUSPEITA DE SECUNDÁRIA");
    expect(laudo).toContain("SUSPEITA DE CEFALEIA SECUNDÁRIA");
    expect(laudo).not.toContain("METOCLOPRAMIDA");
    expect(laudo).toContain("NEUROIMAGEM");
  });

  it("Ottawa sozinho, sem red flag, já muda o status", () => {
    const { resumo, laudo } = responder(prot, { ot_esforco: 1 });
    expect(resumo).toContain("OTTAWA+");
    expect(laudo).toContain("OTTAWA SAH POSITIVO");
    expect(laudo).toContain("INVESTIGAR HSA");
  });

  it("o laudo nomeia as red flags marcadas, não só o total", () => {
    const { laudo, resumo } = responder(prot, { rf_febre: 1, rf_gestacao: 1 });
    expect(resumo).toContain("2 RED FLAGS");
    expect(laudo).toContain("FEBRE / RIGIDEZ DE NUCA");
    expect(laudo).toContain("GESTAÇÃO / PUERPÉRIO");
    expect(laudo).toContain("OTTAWA SAH: NENHUM CRITÉRIO MARCADO");
  });
});

describe("CLASSIFICAÇÃO DE CEFALEIA (ICHD-3)", () => {
  const ichd = pegar("cefaleia-ichd");

  it("sem nada marcado, nenhum conjunto fecha", () => {
    const { resumo, laudo } = responder(ichd, {});
    expect(resumo).toContain("NENHUM CONJUNTO");
    expect(laudo).toContain("FALTA A DURAÇÃO DE 4–72H");
  });

  it("REGRESSÃO: diz O QUE falta, e não só que não preenche", () => {
    // "Não é enxaqueca" e "falta perguntar sobre náusea" são coisas
    // diferentes para quem está com o paciente na frente.
    const { laudo } = responder(ichd, {
      dur_migranea: 1, m_unilateral: 1, m_pulsatil: 1,
    });
    expect(laudo).toContain("FALTA NÁUSEA/VÔMITO OU FOTOFOBIA + FONOFOBIA");
  });

  it("migrânea fecha com duração + 2 características + náusea", () => {
    const { resumo } = responder(ichd, {
      dur_migranea: 1, m_unilateral: 1, m_pulsatil: 1, m_nausea: 1,
    });
    expect(resumo).toBe("TIPO PROVÁVEL: MIGRÂNEA (ICHD-3)");
  });

  it("foto + fono substituem a náusea na migrânea", () => {
    const { resumo } = responder(ichd, {
      dur_migranea: 1, m_unilateral: 1, m_pulsatil: 1, m_foto: 1, m_fono: 1,
    });
    expect(resumo).toContain("MIGRÂNEA");
  });

  it("uma característica só não basta", () => {
    const { laudo } = responder(ichd, { dur_migranea: 1, m_unilateral: 1, m_nausea: 1 });
    expect(laudo).toContain("FALTAM ≥2 CARACTERÍSTICAS");
  });

  it("REGRESSÃO: foto e fono juntas impedem a tensional", () => {
    const base = { dur_tensional: 1, t_bilateral: 1, t_aperto: 1, t_sem_nausea: 1 };
    expect(responder(ichd, base).resumo).toContain("TENSIONAL");

    const comAmbas = responder(ichd, { ...base, t_foto: 1, t_fono: 1 });
    expect(comAmbas.laudo).toContain("FOTOFOBIA E FONOFOBIA JUNTAS NÃO FECHAM TENSIONAL");

    // Uma só continua fechando.
    expect(responder(ichd, { ...base, t_foto: 1 }).resumo).toContain("TENSIONAL");
  });

  it("tensional exige a confirmação explícita de ausência de náusea", () => {
    const { laudo } = responder(ichd, { dur_tensional: 1, t_bilateral: 1, t_aperto: 1 });
    expect(laudo).toContain("FALTA CONFIRMAR AUSÊNCIA DE NÁUSEA");
  });

  it("salvas precisa de localização, intensidade e um autonômico", () => {
    const semAuto = responder(ichd, { dur_salvas: 1, c_local: 1, c_severa: 1 });
    expect(semAuto.laudo).toContain("FALTAM SINAIS AUTONÔMICOS");

    const comAuto = responder(ichd, { dur_salvas: 1, c_local: 1, c_severa: 1, c_miose: 1 });
    expect(comAuto.resumo).toContain("SALVAS/CLUSTER");

    // Agitação substitui o autonômico.
    const comAgitacao = responder(ichd, {
      dur_salvas: 1, c_local: 1, c_severa: 1, c_agitacao: 1,
    });
    expect(comAgitacao.resumo).toContain("SALVAS/CLUSTER");
  });

  it("mais de um conjunto fechando é sinalizado, não escondido", () => {
    const { resumo, laudo } = responder(ichd, {
      dur_migranea: 1, m_unilateral: 1, m_pulsatil: 1, m_nausea: 1,
      dur_salvas: 1, c_local: 1, c_severa: 1, c_miose: 1,
    });
    expect(resumo).toContain("MAIS DE UM CONJUNTO");
    expect(laudo).toContain("REVISAR OS CRITÉRIOS");
  });
});
