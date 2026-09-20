import { beforeEach, describe, expect, it, vi } from "vitest";
import { MODELOS_APAC } from "@/data/apac-modelos";

/**
 * Os modelos seguem o desenho dos 311 textos: base intocada + camada sua.
 * O que estes testes protegem é isso — que editar ou excluir um modelo do
 * APAC.py nunca perde o original, e que restaurar sempre traz ele de volta.
 */
let naNuvem: unknown = null;
let gravadas: { chave: string; conteudo: unknown }[] = [];

function instalarNuvem() {
  gravadas = [];
  vi.stubGlobal("fetch", async (url: string, init?: { method?: string; body?: string }) => {
    const chave = String(url).split("/").pop() ?? "";
    if (init?.method === "PUT") {
      const conteudo = JSON.parse(init.body ?? "{}").conteudo;
      gravadas.push({ chave, conteudo });
      naNuvem = conteudo;
      return { ok: true, status: 200, json: async () => ({}) };
    }
    return { ok: true, status: 200, json: async () => ({ conteudo: naNuvem, atualizadoEm: null }) };
  });
}

async function carregar() {
  vi.resetModules();
  return import("../modelos");
}

beforeEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  naNuvem = null;
  instalarNuvem();
});

describe("APAC: base do APAC.py", () => {
  it("começa com os 10 modelos do programa original", async () => {
    const m = await carregar();
    expect(m.modelosApac()).toHaveLength(MODELOS_APAC.length);
    expect(m.modelosApac().every((x) => x.daBase)).toBe(true);
  });

  it("o snapshot do servidor traz só a base", async () => {
    const m = await carregar();
    m.criarApac({ nome: "MEU", exame: "TC", diagnostico: "D", cid: "R10", justificativa: "j" });
    expect(m.apacNoServidor()).toHaveLength(MODELOS_APAC.length);
    expect(m.modelosApac()).toHaveLength(MODELOS_APAC.length + 1);
  });

  it("criar põe o modelo no topo, marcado como seu", async () => {
    const m = await carregar();
    m.criarApac({ nome: "MEU MODELO", exame: "TC", diagnostico: "D", cid: "R10", justificativa: "j" });

    const primeiro = m.modelosApac()[0];
    expect(primeiro.nome).toBe("MEU MODELO");
    expect(primeiro.daBase).toBe(false);
    expect(m.ehNovo(primeiro.id)).toBe(true);
  });

  it("editar um da base não altera a base", async () => {
    const m = await carregar();
    const alvo = m.modelosApac()[0];

    m.editarApac(alvo.id, { ...alvo, nome: "RENOMEADO", exame: "OUTRO EXAME" });

    expect(m.modelosApac().find((x) => x.id === alvo.id)?.nome).toBe("RENOMEADO");
    expect(m.foiEditado("apac", alvo.id)).toBe(true);
    // O arquivo gerado do APAC.py continua intocado.
    expect(MODELOS_APAC.find((x) => m.idDaBase(x.nome) === alvo.id)?.nome).not.toBe("RENOMEADO");
  });

  it("excluir um da base esconde, e restaurar devolve o ORIGINAL", async () => {
    const m = await carregar();
    const alvo = m.modelosApac().find((x) => x.daBase)!;
    const nomeOriginal = alvo.nome;

    m.editarApac(alvo.id, { ...alvo, nome: "EDITADO POR MIM" });
    m.remover("apac", alvo.id);
    expect(m.modelosApac().find((x) => x.id === alvo.id)).toBeUndefined();
    expect(m.escondidos("apac")).toBe(1);

    m.restaurarBase("apac");
    const voltou = m.modelosApac().find((x) => x.id === alvo.id)!;
    expect(voltou.nome).toBe(nomeOriginal);
    expect(m.foiEditado("apac", alvo.id)).toBe(false);
  });

  it("excluir um modelo seu apaga de vez", async () => {
    const m = await carregar();
    m.criarApac({ nome: "TEMP", exame: "TC", diagnostico: "D", cid: "R10", justificativa: "j" });
    const id = m.modelosApac()[0].id;

    m.remover("apac", id);

    expect(m.modelosApac().find((x) => x.id === id)).toBeUndefined();
    expect(m.escondidos("apac")).toBe(0);
  });

  it("editar um modelo seu mexe nele, não cria outro", async () => {
    const m = await carregar();
    m.criarApac({ nome: "ANTES", exame: "TC", diagnostico: "D", cid: "R10", justificativa: "j" });
    const id = m.modelosApac()[0].id;

    m.editarApac(id, { nome: "DEPOIS", exame: "RX", diagnostico: "D", cid: "R10", justificativa: "j" });

    const meus = m.modelosApac().filter((x) => !x.daBase);
    expect(meus).toHaveLength(1);
    expect(meus[0]).toMatchObject({ id, nome: "DEPOIS", exame: "RX" });
  });
});

describe("SADT: tudo é seu", () => {
  it("começa vazia — o programa original não tinha modelo de requisição", async () => {
    const m = await carregar();
    expect(m.modelosSadt()).toEqual([]);
    expect(m.sadtNoServidor()).toEqual([]);
  });

  it("criar, editar e excluir", async () => {
    const m = await carregar();
    m.criarSadt({
      nome: "COLICA RENAL",
      hd: "NEFROLITIASE",
      cid: "N20",
      historia: "COLICA RENAL",
      procedimentos: ["US DE RINS E VIAS URINARIAS"],
    });

    const criado = m.modelosSadt()[0];
    expect(criado).toMatchObject({ nome: "COLICA RENAL", cid: "N20", daBase: false });

    m.editarSadt(criado.id, { ...criado, cid: "N20.0", procedimentos: ["US", "RX"] });
    expect(m.modelosSadt()[0]).toMatchObject({ cid: "N20.0", procedimentos: ["US", "RX"] });

    m.remover("sadt", criado.id);
    expect(m.modelosSadt()).toEqual([]);
  });
});

describe("nuvem", () => {
  it("a camada sobe para a chave 'modelos'", async () => {
    vi.useFakeTimers();
    const m = await carregar();
    m.criarApac({ nome: "MEU", exame: "TC", diagnostico: "D", cid: "R10", justificativa: "j" });

    await vi.advanceTimersByTimeAsync(2000);
    vi.useRealTimers();

    expect(gravadas.at(-1)?.chave).toBe("modelos");
    const camada = gravadas.at(-1)?.conteudo as { apac: { novos: { nome: string }[] } };
    expect(camada.apac.novos[0].nome).toBe("MEU");
  });

  it("sincronizar aplica a camada que veio do banco", async () => {
    naNuvem = {
      versao: 1,
      apac: { editados: {}, removidos: [], novos: [] },
      sadt: {
        editados: {},
        removidos: [],
        novos: [
          { id: "novo:x", daBase: false, nome: "DA NUVEM", hd: "H", cid: "C", historia: "h", procedimentos: ["P"] },
        ],
      },
    };

    const m = await carregar();
    await m.sincronizarModelos();

    expect(m.estadoDosModelos()).toBe("pronto");
    expect(m.modelosSadt()[0].nome).toBe("DA NUVEM");
  });

  it("banco fora: a base continua servindo e o estado avisa", async () => {
    vi.stubGlobal("fetch", async () => ({ ok: false, status: 502, json: async () => ({}) }));
    const m = await carregar();
    await m.sincronizarModelos();

    expect(m.estadoDosModelos()).toBe("erro");
    expect(m.modelosApac()).toHaveLength(MODELOS_APAC.length);
  });

  it("conteúdo estranho no banco não derruba a lista", async () => {
    naNuvem = { versao: 1, apac: { removidos: "não é array" }, sadt: null };
    const m = await carregar();
    await m.sincronizarModelos();

    expect(m.modelosApac()).toHaveLength(MODELOS_APAC.length);
    expect(m.modelosSadt()).toEqual([]);
  });
});
