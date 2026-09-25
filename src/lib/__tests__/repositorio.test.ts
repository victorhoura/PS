import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * O repositório não grava mais nada na máquina: a camada mora no Supabase e
 * em memória. O que se finge aqui é a rede, não o localStorage.
 */
type Resposta = { conteudo: unknown; atualizadoEm: string | null };

let respostaDaNuvem: Resposta | Error = { conteudo: null, atualizadoEm: null };
let gravacoes: { chave: string; conteudo: unknown }[] = [];

function instalarNuvem() {
  gravacoes = [];
  vi.stubGlobal("fetch", async (url: string, init?: { method?: string; body?: string }) => {
    const chave = String(url).split("/").pop() ?? "";
    if (init?.method === "PUT") {
      gravacoes.push({ chave, conteudo: JSON.parse(init.body ?? "{}").conteudo });
      return { ok: true, status: 200, json: async () => ({}) };
    }
    if (respostaDaNuvem instanceof Error) return { ok: false, status: 502, json: async () => ({}) };
    return { ok: true, status: 200, json: async () => respostaDaNuvem };
  });
}

async function carregarModulo() {
  vi.resetModules();
  return import("../repositorio");
}

/** O estado de uso normal: a camada já chegou da nuvem. */
async function carregarPronto() {
  const r = await carregarModulo();
  await r.sincronizarTextos();
  return r;
}

const CATEGORIA = "receitas" as const;

beforeEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  respostaDaNuvem = { conteudo: null, atualizadoEm: null };
  instalarNuvem();
});

describe("base intocada", () => {
  it("começa com os 311 textos do PS.py", async () => {
    const r = await carregarPronto();
    expect(r.todos()).toHaveLength(311);
  });

  it("o snapshot do servidor nasce carregando: sem lista, nem a da base", async () => {
    const r = await carregarPronto();
    r.criar(CATEGORIA, "MEU", "texto");
    expect(r.todosNoServidor()).toHaveLength(0);
    expect(r.todos()).toHaveLength(312);
  });
});

/** Acha pelo nome: a posição na lista depende da ordem da categoria. */
function achar<T extends { nome: string }>(lista: T[], nome: string): T | undefined {
  return lista.find((s) => s.nome === nome);
}

describe("criar", () => {
  it("acrescenta o texto na categoria", async () => {
    const r = await carregarPronto();
    expect(r.criar(CATEGORIA, "MINHA RECEITA", "tomar 1 cp")).toBe(true);

    const criado = achar(r.daCategoria(CATEGORIA), "MINHA RECEITA")!;
    expect(criado.texto).toBe("tomar 1 cp");
    expect(r.ehNovo(criado.id)).toBe(true);
  });

  it("apara espaços sobrando", async () => {
    const r = await carregarPronto();
    r.criar(CATEGORIA, "  NOME  ", "  corpo  ");
    expect(achar(r.daCategoria(CATEGORIA), "NOME")).toMatchObject({ texto: "corpo" });
  });

  it("gera ids distintos", async () => {
    const r = await carregarPronto();
    r.criar(CATEGORIA, "A", "a");
    r.criar(CATEGORIA, "B", "b");
    const ids = r.daCategoria(CATEGORIA).filter((s) => r.ehNovo(s.id)).map((s) => s.id);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
  });
});

describe("editar", () => {
  it("sobrescreve um texto original sem alterar a base", async () => {
    const r = await carregarPronto();
    const alvo = r.daCategoria(CATEGORIA).find((s) => !r.ehNovo(s.id))!;

    r.editar(alvo.id, "NOVO NOME", "novo corpo");

    const depois = r.todos().find((s) => s.id === alvo.id)!;
    expect(depois.nome).toBe("NOVO NOME");
    expect(r.resumoCamada()).toMatchObject({ editados: 1, removidos: 0 });
  });

  it("edita um texto seu no lugar", async () => {
    const r = await carregarPronto();
    r.criar(CATEGORIA, "ANTES", "x");
    const id = achar(r.daCategoria(CATEGORIA), "ANTES")!.id;

    r.editar(id, "DEPOIS", "y");

    expect(achar(r.daCategoria(CATEGORIA), "DEPOIS")).toMatchObject({ id, texto: "y" });
    expect(r.daCategoria(CATEGORIA).filter((s) => r.ehNovo(s.id))).toHaveLength(1);
  });
});

describe("remover", () => {
  it("apaga um original: some da lista e fica uma lápide na camada", async () => {
    const r = await carregarPronto();
    const alvo = r.daCategoria(CATEGORIA).find((s) => !r.ehNovo(s.id))!;

    r.remover(alvo.id);

    expect(r.todos().find((s) => s.id === alvo.id)).toBeUndefined();
    expect(r.resumoCamada()).toMatchObject({ removidos: 1 });
  });

  it("apagar um original editado leva a edição junto", async () => {
    // Guardar o texto de algo apagado seria peso morto na camada e no backup.
    const r = await carregarPronto();
    const alvo = r.daCategoria(CATEGORIA).find((s) => !r.ehNovo(s.id))!;

    r.editar(alvo.id, "EDITADO", "corpo editado");
    r.remover(alvo.id);

    expect(r.todos().find((s) => s.id === alvo.id)).toBeUndefined();
    expect(r.resumoCamada()).toMatchObject({ editados: 0, removidos: 1 });
  });

  it("apaga um texto seu de vez", async () => {
    const r = await carregarPronto();
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
    const r = await carregarPronto();
    const nomes = r.daCategoria(cat).map((s: { nome: string }) => s.nome);

    expect(nomes.length).toBeGreaterThan(0);
    expect(nomes).toEqual([...nomes].sort(colar));
  });

  it("dose maior não vem antes da menor: ALLEGRA 60 antes de ALLEGRA 120", async () => {
    const r = await carregarPronto();
    const nomes = r.daCategoria("farmacos").map((s: { nome: string }) => s.nome);
    expect(nomes.indexOf("ALLEGRA 60")).toBeLessThan(nomes.indexOf("ALLEGRA 120"));
  });

  it.each(COMO_NO_PS)("%s mantém a ordem do PS.py", async (cat) => {
    const r = await carregarPronto();
    const ordens = r.daCategoria(cat).map((s: { ordem: number }) => s.ordem);
    expect(ordens).toEqual([...ordens].sort((a, b) => a - b));
  });

  it("CEFALEIA vem antes de CERVICALGIA, que no PS.py estava trocado", async () => {
    const r = await carregarPronto();
    const nomes = r.daCategoria("cid").map((s: { nome: string }) => s.nome);
    expect(nomes.indexOf("CEFALEIA")).toBeLessThan(nomes.indexOf("CERVICALGIA"));
  });

  it("PRESCRIÇÕES começa vazia e fica logo abaixo de RECEITAS", async () => {
    const r = await carregarPronto();
    const { CATEGORIAS } = await import("@/data/snippets");
    const slugs = CATEGORIAS.map((c) => c.slug);
    expect(slugs.indexOf("prescricoes")).toBe(slugs.indexOf("receitas") + 1);
    expect(r.daCategoria("prescricoes")).toHaveLength(0);
    expect(r.contagens().prescricoes).toBe(0);
  });

  it("prescrição criada entra na categoria, em ordem alfabética", async () => {
    const r = await carregarPronto();
    r.criar("prescricoes", "SEPSE - PRESCRIÇÃO INICIAL", "x");
    r.criar("prescricoes", "ASMA - CRISE", "y");

    const nomes = r.daCategoria("prescricoes").map((s: { nome: string }) => s.nome);
    expect(nomes).toEqual(["ASMA - CRISE", "SEPSE - PRESCRIÇÃO INICIAL"]);
    expect(r.contagens().prescricoes).toBe(2);
    // e não vaza para as receitas
    expect(achar(r.daCategoria("receitas"), "ASMA - CRISE")).toBeUndefined();
  });

  it("texto seu entra na ordem, não no topo", async () => {
    const r = await carregarPronto();
    r.criar(CATEGORIA, "ZZZ ULTIMA", "x");
    r.criar(CATEGORIA, "AAA PRIMEIRA", "y");

    const nomes = r.daCategoria(CATEGORIA).map((s: { nome: string }) => s.nome);
    expect(nomes[0]).toBe("AAA PRIMEIRA");
    expect(nomes[nomes.length - 1]).toBe("ZZZ ULTIMA");
  });

  it("renomear move o texto para o lugar certo", async () => {
    const r = await carregarPronto();
    r.criar(CATEGORIA, "AAA PRIMEIRA", "x");
    const id = achar(r.daCategoria(CATEGORIA), "AAA PRIMEIRA")!.id;

    r.editar(id, "ZZZ ULTIMA", "x");

    const nomes = r.daCategoria(CATEGORIA).map((s: { nome: string }) => s.nome);
    expect(nomes[nomes.length - 1]).toBe("ZZZ ULTIMA");
  });

  it("acento não joga o texto para o fim: ÓRQUITE fica entre os O", async () => {
    const r = await carregarPronto();
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
    const r = await carregarPronto();
    const antes = r.contagens()[CATEGORIA];

    r.criar(CATEGORIA, "A", "a");
    expect(r.contagens()[CATEGORIA]).toBe(antes + 1);

    const original = r.daCategoria(CATEGORIA).find((s) => !r.ehNovo(s.id))!;
    r.remover(original.id);
    expect(r.contagens()[CATEGORIA]).toBe(antes);
  });
});

describe("backup", () => {
  it("exporta e reimporta a camada inteira, numa sessão nova", async () => {
    const r = await carregarPronto();
    r.criar(CATEGORIA, "MEU TEXTO", "corpo");
    const [original, apagado] = r.daCategoria(CATEGORIA).filter((s) => !r.ehNovo(s.id));
    r.editar(original.id, "MUDADO", "outro corpo");
    r.remover(apagado.id);
    const json = r.exportar();

    // Outro computador, ou o banco zerado: a camada começa vazia.
    const outra = await carregarPronto();
    expect(outra.resumoCamada()).toEqual({ novos: 0, editados: 0, removidos: 0 });

    expect(outra.importar(json).ok).toBe(true);
    expect(outra.resumoCamada()).toEqual({ novos: 1, editados: 1, removidos: 1 });
    expect(outra.todos().find((s) => s.id === original.id)!.nome).toBe("MUDADO");
    expect(outra.todos().some((s) => s.id === apagado.id)).toBe(false);
  });

  it("recusa arquivo que não é backup do app", async () => {
    const r = await carregarPronto();
    expect(r.importar('{"app":"outra-coisa"}').ok).toBe(false);
    expect(r.importar("nao e json").ok).toBe(false);
    expect(r.importar('{"novos":[]}').ok).toBe(false);
  });

  it("descarta entradas malformadas do arquivo", async () => {
    const r = await carregarPronto();
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

describe("a nuvem é a única cópia", () => {
  it("REGRESSÃO: antes de a camada chegar não há lista — nem a base", async () => {
    // Antes a base aparecia aqui e, um instante depois, a sua versão: o texto
    // novo surgindo e o apagado sumindo na frente de quem já estava lendo.
    const r = await carregarModulo();
    expect(r.estadoDosTextos()).toBe("carregando");
    expect(r.todos()).toHaveLength(0);
    expect(r.contagens().receitas).toBe(0);
    expect(r.resumoCamada()).toEqual({ novos: 0, editados: 0, removidos: 0 });
  });

  it("REGRESSÃO: gravar antes de a camada chegar é recusado e nada sobe", async () => {
    // A camada em memória ainda é a vazia: gravar dali mandava para a nuvem
    // uma camada com só este texto, por cima de todos os outros.
    vi.useFakeTimers();
    const r = await carregarModulo();
    expect(r.criar(CATEGORIA, "CEDO DEMAIS", "x")).toBe(false);
    expect(r.editar("qualquer", "X", "y")).toBe(false);
    expect(r.remover("qualquer")).toBe(false);
    expect(r.importar(JSON.stringify({ app: "ps-japa", novos: [] })).ok).toBe(false);
    expect(r.motivoParaNaoGravar()).toMatch(/chegando da nuvem/);

    await vi.advanceTimersByTimeAsync(5000);
    vi.useRealTimers();
    expect(gravacoes).toHaveLength(0);
  });

  it("REGRESSÃO: com o banco fora, editar é recusado — a base é só para copiar", async () => {
    respostaDaNuvem = new Error("502");
    vi.useFakeTimers();
    const r = await carregarModulo();
    await r.sincronizarTextos();
    const alvo = r.daCategoria(CATEGORIA)[0];

    expect(r.editar(alvo.id, "X", "y")).toBe(false);
    expect(r.criar(CATEGORIA, "NOVO", "z")).toBe(false);
    expect(r.motivoParaNaoGravar()).toMatch(/sem acesso à nuvem/);

    await vi.advanceTimersByTimeAsync(5000);
    vi.useRealTimers();
    expect(gravacoes).toHaveLength(0);
  });

  it("com o banco fora, restaurar um backup ainda vale — é o socorro", async () => {
    respostaDaNuvem = new Error("502");
    const r = await carregarModulo();
    await r.sincronizarTextos();

    const json = JSON.stringify({
      app: "ps-japa",
      novos: [{ id: "novo:receitas:b", categoria: "receitas", nome: "DO BACKUP", texto: "t", ordem: 0 }],
    });
    expect(r.importar(json).ok).toBe(true);
    expect(r.estadoDosTextos()).toBe("pronto");
    expect(achar(r.daCategoria(CATEGORIA), "DO BACKUP")).toBeDefined();
  });

  it("sincronizar traz a camada do banco", async () => {
    respostaDaNuvem = {
      conteudo: {
        versao: 1,
        editados: {},
        removidos: [],
        novos: [
          { id: "novo:receitas:x", categoria: "receitas", nome: "DA NUVEM", texto: "t", ordem: 0 },
        ],
      },
      atualizadoEm: null,
    };

    const r = await carregarModulo();
    await r.sincronizarTextos();

    expect(r.estadoDosTextos()).toBe("pronto");
    expect(achar(r.daCategoria(CATEGORIA), "DA NUVEM")).toBeDefined();
    expect(r.todos()).toHaveLength(312);
  });

  it("banco fora vira estado de erro, não uma lista silenciosamente vazia", async () => {
    respostaDaNuvem = new Error("502");
    const r = await carregarModulo();
    await r.sincronizarTextos();

    expect(r.estadoDosTextos()).toBe("erro");
    expect(r.motivoDoErro()).not.toBe("");
    // A base continua servindo; o que não aparece é a camada.
    expect(r.todos()).toHaveLength(311);
  });

  it("recarregar tenta de novo depois do erro", async () => {
    respostaDaNuvem = new Error("502");
    const r = await carregarModulo();
    await r.sincronizarTextos();
    expect(r.estadoDosTextos()).toBe("erro");

    respostaDaNuvem = { conteudo: null, atualizadoEm: null };
    await r.recarregarTextos();
    expect(r.estadoDosTextos()).toBe("pronto");
  });

  it("criar empurra a camada para o banco", async () => {
    vi.useFakeTimers();
    const r = await carregarPronto();
    r.criar(CATEGORIA, "MINHA", "corpo");

    await vi.advanceTimersByTimeAsync(2000);
    vi.useRealTimers();

    const ultima = gravacoes.at(-1);
    expect(ultima?.chave).toBe("textos");
    expect((ultima?.conteudo as { novos: { nome: string }[] }).novos[0].nome).toBe("MINHA");
  });

  it("não grava nada no armazenamento da máquina", async () => {
    const escritas: string[] = [];
    vi.stubGlobal("localStorage", {
      getItem: () => null,
      setItem: (k: string) => escritas.push(k),
      removeItem: () => {},
    });
    instalarNuvem();

    const r = await carregarPronto();
    r.criar(CATEGORIA, "A", "a");
    const original = r.daCategoria(CATEGORIA).find((x) => !r.ehNovo(x.id))!;
    r.editar(original.id, "B", "b");
    r.remover(original.id);

    expect(escritas).toEqual([]);
  });
});
