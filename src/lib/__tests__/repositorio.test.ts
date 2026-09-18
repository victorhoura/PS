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

/** Acha pelo nome: a posição na lista depende da ordem da categoria. */
function achar<T extends { nome: string }>(lista: T[], nome: string): T | undefined {
  return lista.find((s) => s.nome === nome);
}

describe("criar", () => {
  it("acrescenta o texto na categoria", async () => {
    const r = await carregarModulo();
    expect(r.criar(CATEGORIA, "MINHA RECEITA", "tomar 1 cp")).toBe(true);

    const criado = achar(r.daCategoria(CATEGORIA), "MINHA RECEITA")!;
    expect(criado.texto).toBe("tomar 1 cp");
    expect(r.ehNovo(criado.id)).toBe(true);
  });

  it("apara espaços sobrando", async () => {
    const r = await carregarModulo();
    r.criar(CATEGORIA, "  NOME  ", "  corpo  ");
    expect(achar(r.daCategoria(CATEGORIA), "NOME")).toMatchObject({ texto: "corpo" });
  });

  it("gera ids distintos", async () => {
    const r = await carregarModulo();
    r.criar(CATEGORIA, "A", "a");
    r.criar(CATEGORIA, "B", "b");
    const ids = r.daCategoria(CATEGORIA).filter((s) => r.ehNovo(s.id)).map((s) => s.id);
    expect(ids).toHaveLength(2);
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
    const id = achar(r.daCategoria(CATEGORIA), "ANTES")!.id;

    r.editar(id, "DEPOIS", "y");

    expect(achar(r.daCategoria(CATEGORIA), "DEPOIS")).toMatchObject({ id, texto: "y" });
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
    const id = achar(r.daCategoria(CATEGORIA), "TEMP")!.id;

    r.remover(id);

    expect(r.todos().find((s) => s.id === id)).toBeUndefined();
    expect(r.resumoCamada().novos).toBe(0);
  });
});

describe("ordem da lista", () => {
  const EM_ORDEM = ["anamnese", "cid", "receitas", "farmacos", "notas"] as const;
  const COMO_NO_PS = ["exame-fisico", "condutas", "reavaliacao", "encaminhamento"] as const;

  /** Mesma colação da lista: pt-BR e numérica, para "ALLEGRA 60" < "ALLEGRA 120". */
  const colar = (a: string, b: string) =>
    new Intl.Collator("pt-BR", { numeric: true }).compare(a, b);

  it.each(EM_ORDEM)("%s sai em ordem alfabética", async (cat) => {
    const r = await carregarModulo();
    const nomes = r.daCategoria(cat).map((s: { nome: string }) => s.nome);

    expect(nomes.length).toBeGreaterThan(0);
    expect(nomes).toEqual([...nomes].sort(colar));
  });

  it("dose maior não vem antes da menor: ALLEGRA 60 antes de ALLEGRA 120", async () => {
    const r = await carregarModulo();
    const nomes = r.daCategoria("farmacos").map((s: { nome: string }) => s.nome);
    expect(nomes.indexOf("ALLEGRA 60")).toBeLessThan(nomes.indexOf("ALLEGRA 120"));
  });

  it.each(COMO_NO_PS)("%s mantém a ordem do PS.py", async (cat) => {
    const r = await carregarModulo();
    const ordens = r.daCategoria(cat).map((s: { ordem: number }) => s.ordem);
    expect(ordens).toEqual([...ordens].sort((a, b) => a - b));
  });

  it("CEFALEIA vem antes de CERVICALGIA, que no PS.py estava trocado", async () => {
    const r = await carregarModulo();
    const nomes = r.daCategoria("cid").map((s: { nome: string }) => s.nome);
    expect(nomes.indexOf("CEFALEIA")).toBeLessThan(nomes.indexOf("CERVICALGIA"));
  });

  it("texto seu entra na ordem, não no topo", async () => {
    const r = await carregarModulo();
    r.criar(CATEGORIA, "ZZZ ULTIMA", "x");
    r.criar(CATEGORIA, "AAA PRIMEIRA", "y");

    const nomes = r.daCategoria(CATEGORIA).map((s: { nome: string }) => s.nome);
    expect(nomes[0]).toBe("AAA PRIMEIRA");
    expect(nomes[nomes.length - 1]).toBe("ZZZ ULTIMA");
  });

  it("renomear move o texto para o lugar certo", async () => {
    const r = await carregarModulo();
    r.criar(CATEGORIA, "AAA PRIMEIRA", "x");
    const id = achar(r.daCategoria(CATEGORIA), "AAA PRIMEIRA")!.id;

    r.editar(id, "ZZZ ULTIMA", "x");

    const nomes = r.daCategoria(CATEGORIA).map((s: { nome: string }) => s.nome);
    expect(nomes[nomes.length - 1]).toBe("ZZZ ULTIMA");
  });

  it("acento não joga o texto para o fim: ÓRQUITE fica entre os O", async () => {
    const r = await carregarModulo();
    r.criar("cid", "OBSTIPACAO ZZZ", "x");
    r.criar("cid", "ÓRQUITE", "y");
    r.criar("cid", "OTITE ZZZ", "z");

    const nomes = r.daCategoria("cid").map((s: { nome: string }) => s.nome);
    // Comparação de bytes mandaria "Ó" (U+00D3) para depois de todo o Z.
    expect(nomes.indexOf("OBSTIPACAO ZZZ")).toBeLessThan(nomes.indexOf("ÓRQUITE"));
    expect(nomes.indexOf("ÓRQUITE")).toBeLessThan(nomes.indexOf("OTITE ZZZ"));
    expect(nomes.indexOf("ÓRQUITE")).toBeLessThan(nomes.length - 1);
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
    expect(achar(r.daCategoria(CATEGORIA), "A")).toBeDefined();
  });

  it("ignora camada corrompida e mantém a base", async () => {
    const dados = instalarArmazenamento();
    dados.set("ps-japa:textos:v1", "{isso nao e json");
    const r = await carregarModulo();
    expect(r.todos()).toHaveLength(311);
  });
});
