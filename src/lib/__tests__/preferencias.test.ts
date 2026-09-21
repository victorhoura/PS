import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * O que estes testes protegem: uma resposta da nuvem que chega atrasada não
 * pode apagar o que você mexeu enquanto ela vinha.
 *
 * O caso que deu origem a isto foi o tema — clicar em CLARO nos primeiros
 * instantes da tela e ver a tela voltar para escuro sozinha um segundo
 * depois, com a nuvem guardando "claro" e a tela mostrando "escuro". Mas o
 * defeito não era do tema: era desta camada, e valia igual para o nome do
 * médico e para o contador do plantão.
 *
 * A nuvem aqui é lenta de propósito: só responde quando o teste mandar. É o
 * único jeito de ficar dentro da janela de corrida em vez de torcer por ela.
 */

const fingida = vi.hoisted(() => ({
  conteudo: null as unknown,
  responder: null as null | (() => void),
  gravadas: [] as unknown[],
}));

vi.mock("@/lib/nuvem", () => ({
  lerDaNuvem: async () => {
    await new Promise<void>((seguir) => {
      fingida.responder = seguir;
    });
    return { conteudo: fingida.conteudo, atualizadoEm: null };
  },
  gravarNaNuvem: async (_chave: unknown, conteudo: unknown) => {
    fingida.gravadas.push(conteudo);
    return true;
  },
  // O agrupamento não interessa aqui; o que interessa é O QUE seria gravado.
  comEspera: () => (obter: () => unknown) => fingida.gravadas.push(obter()),
}));

/** Módulo novo a cada teste: o cache dele é global e mora no módulo. */
async function modulo() {
  vi.resetModules();
  fingida.conteudo = null;
  fingida.responder = null;
  fingida.gravadas = [];
  return import("@/lib/preferencias");
}

/** Deixa o microtask da leitura rodar até ficar pendurada esperando resposta. */
const respirar = () => new Promise((r) => setTimeout(r, 0));

describe("resposta atrasada da nuvem", () => {
  it("não desfaz o que você mexeu enquanto ela vinha", async () => {
    const p = await modulo();

    const carga = p.carregarPreferencias();
    await respirar();

    p.definirPreferencia("tema", "claro");

    fingida.conteudo = { tema: "escuro", medico: "DRA. SOUZA" };
    fingida.responder!();
    await carga;

    expect(p.preferenciasAtuais().tema).toBe("claro");
  });

  it("mas traz normalmente o que você não mexeu", async () => {
    const p = await modulo();

    const carga = p.carregarPreferencias();
    await respirar();
    p.definirPreferencia("tema", "claro");

    fingida.conteudo = { tema: "escuro", medico: "DRA. SOUZA", contador: 7 };
    fingida.responder!();
    await carga;

    expect(p.preferenciasAtuais().medico).toBe("DRA. SOUZA");
    expect(p.preferenciasAtuais().contador).toBe(7);
  });

  it("vale para qualquer campo, não só o tema", async () => {
    const p = await modulo();

    const carga = p.carregarPreferencias();
    await respirar();
    p.definirPreferencia("medico", "DR. HOURA");
    p.definirPreferencia("contador", 3);

    fingida.conteudo = { medico: "NOME VELHO", contador: 99, tema: "claro" };
    fingida.responder!();
    await carga;

    expect(p.preferenciasAtuais().medico).toBe("DR. HOURA");
    expect(p.preferenciasAtuais().contador).toBe(3);
    expect(p.preferenciasAtuais().tema).toBe("claro");
  });

  it("o que sobe para a nuvem depois é o seu, não o que ela devolveu", async () => {
    const p = await modulo();

    const carga = p.carregarPreferencias();
    await respirar();
    p.definirPreferencia("tema", "claro");

    fingida.conteudo = { tema: "escuro" };
    fingida.responder!();
    await carga;

    fingida.gravadas = [];
    p.definirPreferencia("contador", 1);
    expect(fingida.gravadas.at(-1)).toMatchObject({ tema: "claro", contador: 1 });
  });
});

describe("caminho sem corrida", () => {
  beforeEach(() => vi.clearAllMocks());

  it("a nuvem manda quando você não mexeu em nada", async () => {
    const p = await modulo();

    const carga = p.carregarPreferencias();
    await respirar();
    fingida.conteudo = { tema: "claro", medico: "DRA. SOUZA" };
    fingida.responder!();
    await carga;

    expect(p.preferenciasAtuais()).toEqual({ tema: "claro", medico: "DRA. SOUZA" });
  });

  it("mexer depois do carregamento grava normalmente", async () => {
    const p = await modulo();

    const carga = p.carregarPreferencias();
    await respirar();
    fingida.conteudo = { tema: "escuro" };
    fingida.responder!();
    await carga;

    p.definirPreferencia("tema", "claro");
    expect(p.preferenciasAtuais().tema).toBe("claro");
    expect(fingida.gravadas.at(-1)).toMatchObject({ tema: "claro" });
  });
});
