import { beforeEach, describe, expect, it, vi } from "vitest";

/** localStorage de mentira: o repositório só precisa de get/set/remove. */
function instalarArmazenamento(falhar = false) {
  const dados = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => dados.get(k) ?? null,
    setItem: (k: string, v: string) => {
      if (falhar) throw new DOMException("QuotaExceededError");
      dados.set(k, v);
    },
    removeItem: (k: string) => dados.delete(k),
    clear: () => dados.clear(),
  });
  vi.stubGlobal("window", { addEventListener() {}, removeEventListener() {} });
  return dados;
}

async function carregarModulo() {
  vi.resetModules();
  return import("../repositorio");
}

const CATEGORIA = "receitas" as const;

beforeEach(() => {
  vi.unstubAllGlobals();
  instalarArmazenamento();
});

describe("base intocada", () => {
  it("começa com os 311 textos do PS.py", async () => {
    const r = await carregarModulo();
    expect(r.todos()).toHaveLength(311);
  });

  it("o snapshot do servidor ignora a camada local", async () => {
    const r = await carregarModulo();
    r.criar(CATEGORIA, "MEU", "texto");
    expect(r.todosNoServidor()).toHaveLength(311);
    expect(r.todos()).toHaveLength(312);
  });
});

describe("criar", () => {
  it("acrescenta o texto na categoria e no topo da lista", async () => {
    const r = await carregarModulo();
    expect(r.criar(CATEGORIA, "MINHA RECEITA", "tomar 1 cp")).toBe(true);

    const daCat = r.daCategoria(CATEGORIA);
    expect(daCat[0].nome).toBe("MINHA RECEITA");
    expect(daCat[0].texto).toBe("tomar 1 cp");
    expect(r.ehNovo(daCat[0].id)).toBe(true);
  });

  it("apara espaços sobrando", async () => {
    const r = await carregarModulo();
    r.criar(CATEGORIA, "  NOME  ", "  corpo  ");
    expect(r.daCategoria(CATEGORIA)[0]).toMatchObject({ nome: "NOME", texto: "corpo" });
  });

  it("gera ids distintos", async () => {
    const r = await carregarModulo();
    r.criar(CATEGORIA, "A", "a");
    r.criar(CATEGORIA, "B", "b");
    const ids = r.daCategoria(CATEGORIA).slice(0, 2).map((s) => s.id);
    expect(new Set(ids).size).toBe(2);
  });
});

describe("editar", () => {
  it("sobrescreve um texto original sem alterar a base", async () => {
    const r = await carregarModulo();
    const alvo = r.daCategoria(CATEGORIA).find((s) => !r.ehNovo(s.id))!;

    r.editar(alvo.id, "NOVO NOME", "novo corpo");

    const depois = r.todos().find((s) => s.id === alvo.id)!;
    expect(depois.nome).toBe("NOVO NOME");
    expect(r.foiEditado(alvo.id)).toBe(true);
    expect(r.todosNoServidor().find((s) => s.id === alvo.id)!.nome).toBe(alvo.nome);
  });

  it("edita um texto seu no lugar", async () => {
    const r = await carregarModulo();
    r.criar(CATEGORIA, "ANTES", "x");
    const id = r.daCategoria(CATEGORIA)[0].id;

    r.editar(id, "DEPOIS", "y");

    expect(r.daCategoria(CATEGORIA)[0]).toMatchObject({ nome: "DEPOIS", texto: "y" });
    expect(r.daCategoria(CATEGORIA).filter((s) => r.ehNovo(s.id))).toHaveLength(1);
  });
});

describe("remover e restaurar", () => {
  it("esconde um original e devolve com restaurar", async () => {
    const r = await carregarModulo();
    const alvo = r.daCategoria(CATEGORIA).find((s) => !r.ehNovo(s.id))!;

    r.remover(alvo.id);
    expect(r.todos().find((s) => s.id === alvo.id)).toBeUndefined();

    r.restaurar(alvo.id);
    expect(r.todos().find((s) => s.id === alvo.id)).toMatchObject({ nome: alvo.nome });
  });

  it("restaurar devolve o texto do PS.py, não a última edição", async () => {
    const r = await carregarModulo();
    const alvo = r.daCategoria(CATEGORIA).find((s) => !r.ehNovo(s.id))!;

    r.editar(alvo.id, "EDITADO", "corpo editado");
    r.remover(alvo.id);
    r.restaurar(alvo.id);

    expect(r.todos().find((s) => s.id === alvo.id)!.texto).toBe(alvo.texto);
    expect(r.foiEditado(alvo.id)).toBe(false);
  });

  it("apaga um texto seu de vez", async () => {
    const r = await carregarModulo();
    r.criar(CATEGORIA, "TEMP", "x");
    const id = r.daCategoria(CATEGORIA)[0].id;

    r.remover(id);

    expect(r.todos().find((s) => s.id === id)).toBeUndefined();
    expect(r.resumoCamada().novos).toBe(0);
  });
});

describe("contagens", () => {
  it("acompanham criação e remoção", async () => {
    const r = await carregarModulo();
    const antes = r.contagens()[CATEGORIA];

    r.criar(CATEGORIA, "A", "a");
    expect(r.contagens()[CATEGORIA]).toBe(antes + 1);

    const original = r.daCategoria(CATEGORIA).find((s) => !r.ehNovo(s.id))!;
    r.remover(original.id);
    expect(r.contagens()[CATEGORIA]).toBe(antes);
  });
});

describe("backup", () => {
  it("exporta e reimporta a camada inteira", async () => {
    const r = await carregarModulo();
    r.criar(CATEGORIA, "MEU TEXTO", "corpo");
    const original = r.daCategoria(CATEGORIA).find((s) => !r.ehNovo(s.id))!;
    r.editar(original.id, "MUDADO", "outro corpo");

    const json = r.exportar();
    r.limparTudo();
    expect(r.resumoCamada()).toEqual({ novos: 0, editados: 0, removidos: 0 });

    expect(r.importar(json).ok).toBe(true);
    expect(r.resumoCamada()).toMatchObject({ novos: 1, editados: 1 });
    expect(r.todos().find((s) => s.id === original.id)!.nome).toBe("MUDADO");
  });

  it("recusa arquivo que não é backup do app", async () => {
    const r = await carregarModulo();
    expect(r.importar('{"app":"outra-coisa"}').ok).toBe(false);
    expect(r.importar("nao e json").ok).toBe(false);
    expect(r.importar('{"novos":[]}').ok).toBe(false);
  });

  it("descarta entradas malformadas do arquivo", async () => {
    const r = await carregarModulo();
    const json = JSON.stringify({
      app: "ps-japa",
      editados: {},
      removidos: [],
      novos: [
        { id: "novo:receitas:1", categoria: "receitas", nome: "OK", texto: "t", ordem: 0 },
        { id: "quebrado" },
        null,
      ],
    });
    expect(r.importar(json).ok).toBe(true);
    expect(r.resumoCamada().novos).toBe(1);
  });
});

describe("armazenamento indisponível", () => {
  it("não derruba o app quando o navegador recusa gravar", async () => {
    vi.unstubAllGlobals();
    instalarArmazenamento(true);
    const r = await carregarModulo();

    // Devolve false para a tela avisar, mas a edição vale nesta sessão.
    expect(r.criar(CATEGORIA, "A", "a")).toBe(false);
    expect(r.daCategoria(CATEGORIA)[0].nome).toBe("A");
  });

  it("ignora camada corrompida e mantém a base", async () => {
    const dados = instalarArmazenamento();
    dados.set("ps-japa:textos:v1", "{isso nao e json");
    const r = await carregarModulo();
    expect(r.todos()).toHaveLength(311);
  });
});
