import { describe, expect, it, vi } from "vitest";

/**
 * Os links, que deixaram de ser constante no código.
 *
 * O que estes testes seguram: que o endereço digitado do jeito humano vira
 * link de verdade, que a ordem dos grupos é a de uso e não a alfabética, e
 * que apagar todos NÃO faz a lista embutida voltar do além — apagar é uma
 * escolha, e ressuscitar o que você apagou é o pior jeito de tratá-la.
 */

const nuvem = vi.hoisted(() => ({
  conteudo: null as unknown,
  gravado: [] as unknown[],
  quebrada: false,
}));

vi.mock("@/lib/nuvem", () => ({
  lerDaNuvem: async () => {
    if (nuvem.quebrada) throw new Error("sem rede");
    return { conteudo: nuvem.conteudo, atualizadoEm: null };
  },
  gravarNaNuvem: async (_c: string, conteudo: unknown) => {
    nuvem.gravado.push(conteudo);
    return true;
  },
  comEspera: () => (obter: () => unknown) => nuvem.gravado.push(obter()),
}));

async function modulo() {
  vi.resetModules();
  nuvem.conteudo = null;
  nuvem.gravado = [];
  nuvem.quebrada = false;
  return import("@/lib/links");
}

describe("endereço digitado do jeito humano", () => {
  it("acrescenta https:// quando falta", async () => {
    const l = await modulo();
    expect(l.normalizarUrl("whitebook.pebmed.com.br")).toBe("https://whitebook.pebmed.com.br");
  });

  it("não mexe no que já vem completo", async () => {
    const l = await modulo();
    expect(l.normalizarUrl("http://interno.hospital.local/x")).toBe(
      "http://interno.hospital.local/x",
    );
    expect(l.normalizarUrl("https://a.com/b?c=1")).toBe("https://a.com/b?c=1");
  });

  it("aceita endereço com caminho, porta e consulta", async () => {
    const l = await modulo();
    for (const bom of [
      "app.sinconecta.com/ords/f?p=1500:LOGIN_DESKTOP",
      "https://shiftlis.afip.com.br/shift/lis/x.cls?config=UNICO",
      "10.0.0.5.nip.io:8080/sistema",
    ]) {
      expect(l.urlValida(bom)).toBe(true);
    }
  });

  it("recusa o que não leva a lugar nenhum", async () => {
    const l = await modulo();
    for (const ruim of ["", "   ", "sem-ponto", "javascript:alert(1)", "http://"]) {
      expect(l.urlValida(ruim)).toBe(false);
    }
  });

  it("o host mostrado é só o domínio", async () => {
    const l = await modulo();
    expect(l.hostDe("https://app.sinconecta.com/ords/f?p=1500")).toBe("app.sinconecta.com");
  });
});

describe("grupos", () => {
  it("saem na ordem de uso, não em ordem alfabética", async () => {
    const l = await modulo();
    const itens = [
      { id: "1", nome: "A", url: "https://a.com", grupo: "Sistemas do hospital" },
      { id: "2", nome: "B", url: "https://b.com", grupo: "Consulta" },
      { id: "3", nome: "C", url: "https://c.com", grupo: "Sistemas do hospital" },
    ];
    expect(l.porGrupo(itens).map(([g, is]) => [g, is.length])).toEqual([
      ["Sistemas do hospital", 2],
      ["Consulta", 1],
    ]);
  });

  it("link sem grupo cai num balde com nome", async () => {
    const l = await modulo();
    const [[nome]] = l.porGrupo([{ id: "1", nome: "A", url: "https://a.com", grupo: "" }]);
    expect(nome).toBe("Links");
  });
});

describe("criar, editar e excluir", () => {
  it("criar acrescenta e grava a lista inteira", async () => {
    const l = await modulo();
    await l.carregarLinks();

    const antes = l.linksAtuais().length;
    l.salvarLink({ ...l.novoLink(), nome: "NOVO", url: "exemplo.com.br", grupo: "Consulta" });

    expect(l.linksAtuais()).toHaveLength(antes + 1);
    const ultimo = l.linksAtuais().at(-1)!;
    expect(ultimo.url).toBe("https://exemplo.com.br");
    expect((nuvem.gravado.at(-1) as { itens: unknown[] }).itens).toHaveLength(antes + 1);
  });

  it("editar troca o item no lugar, sem duplicar nem reordenar", async () => {
    const l = await modulo();
    await l.carregarLinks();

    const alvo = l.linksAtuais()[1];
    const posicao = l.linksAtuais().indexOf(alvo);
    l.salvarLink({ ...alvo, nome: "OUTRO NOME" });

    expect(l.linksAtuais()).toHaveLength(l.LINKS_BASE.length);
    expect(l.linksAtuais()[posicao].nome).toBe("OUTRO NOME");
    expect(l.linksAtuais()[posicao].id).toBe(alvo.id);
  });

  it("excluir tira só aquele", async () => {
    const l = await modulo();
    await l.carregarLinks();

    const alvo = l.linksAtuais()[0];
    l.removerLink(alvo.id);

    expect(l.linksAtuais().some((x) => x.id === alvo.id)).toBe(false);
    expect(l.linksAtuais()).toHaveLength(l.LINKS_BASE.length - 1);
  });

  it("restaurar devolve a lista que vem com o app", async () => {
    const l = await modulo();
    await l.carregarLinks();
    l.removerLink(l.linksAtuais()[0].id);
    l.restaurarLinks();
    expect(l.linksAtuais()).toEqual(l.LINKS_BASE);
  });
});

describe("o que vem da nuvem", () => {
  it("a lista de lá substitui a embutida", async () => {
    const l = await modulo();
    nuvem.conteudo = {
      versao: 1,
      itens: [{ id: "x", nome: "MEU", url: "https://meu.com", grupo: "Meus" }],
    };
    await l.carregarLinks();
    expect(l.linksAtuais()).toHaveLength(1);
    expect(l.linksAtuais()[0].nome).toBe("MEU");
  });

  it("lista VAZIA na nuvem é respeitada: apagar todos não ressuscita a base", async () => {
    const l = await modulo();
    nuvem.conteudo = { versao: 1, itens: [] };
    await l.carregarLinks();
    expect(l.linksAtuais()).toHaveLength(0);
  });

  it("registro estragado não derruba a tela", async () => {
    const l = await modulo();
    nuvem.conteudo = { versao: 1, itens: [{ nome: "sem id nem url" }, null, 7] };
    await l.carregarLinks();
    expect(l.linksAtuais()).toHaveLength(0);
  });

  it("sem nuvem valem os embutidos", async () => {
    const l = await modulo();
    nuvem.quebrada = true;
    await l.carregarLinks();
    expect(l.linksAtuais()).toEqual(l.LINKS_BASE);
  });
});
