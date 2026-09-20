import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A virada para "só nuvem" apaga o que está na máquina. A regra que estes
 * testes protegem é uma só: o que existe local e não existe na nuvem SOBE
 * antes, e nada é apagado enquanto houver algo por subir.
 */

let naNuvem: Record<string, unknown> = {};
let gravadas: { chave: string; conteudo: unknown }[] = [];
let falharGravacao = false;
let falharLeitura = false;
let armazenamento: Map<string, string>;
let cachesApagados: string[];

function instalar() {
  naNuvem = {};
  gravadas = [];
  falharGravacao = false;
  falharLeitura = false;
  armazenamento = new Map();
  cachesApagados = [];

  vi.stubGlobal("localStorage", {
    get length() {
      return armazenamento.size;
    },
    key: (i: number) => [...armazenamento.keys()][i] ?? null,
    getItem: (k: string) => armazenamento.get(k) ?? null,
    setItem: (k: string, v: string) => armazenamento.set(k, v),
    removeItem: (k: string) => armazenamento.delete(k),
  });
  vi.stubGlobal("sessionStorage", { clear: () => {} });
  vi.stubGlobal("caches", {
    keys: async () => ["ps-japa-1", "ps-japa-estado"],
    delete: async (n: string) => {
      cachesApagados.push(n);
      return true;
    },
  });

  vi.stubGlobal("fetch", async (url: string, init?: { method?: string; body?: string }) => {
    const chave = String(url).split("/").pop() ?? "";
    if (init?.method === "PUT") {
      if (falharGravacao) return { ok: false, status: 502, json: async () => ({}) };
      const conteudo = JSON.parse(init.body ?? "{}").conteudo;
      gravadas.push({ chave, conteudo });
      naNuvem[chave] = conteudo;
      return { ok: true, status: 200, json: async () => ({}) };
    }
    if (falharLeitura) return { ok: false, status: 502, json: async () => ({}) };
    return {
      ok: true,
      status: 200,
      json: async () => ({ conteudo: naNuvem[chave] ?? null, atualizadoEm: null }),
    };
  });
}

async function carregar() {
  vi.resetModules();
  return import("../limpeza");
}

const CAMADA = JSON.stringify({
  versao: 1,
  editados: {},
  removidos: [],
  novos: [{ id: "novo:receitas:a", categoria: "receitas", nome: "MINHA", texto: "t", ordem: 0 }],
});

beforeEach(() => {
  vi.unstubAllGlobals();
  instalar();
});

describe("migração para a nuvem", () => {
  it("sobe o que só existia na máquina e depois apaga", async () => {
    armazenamento.set("ps-japa:textos:v1", CAMADA);
    armazenamento.set("ps-japa:cofre:v1", "BLOB-CIFRADO");

    const m = await carregar();
    const r = await m.migrarEApagarLocal();

    expect(r.falhou).toEqual([]);
    expect(gravadas.map((g) => g.chave).sort()).toEqual(["cofre", "textos"]);
    expect(naNuvem.cofre).toBe("BLOB-CIFRADO");
    expect(armazenamento.size).toBe(0);
  });

  it("NÃO apaga quando a subida falha — a máquina é a única cópia", async () => {
    armazenamento.set("ps-japa:cofre:v1", "BLOB-CIFRADO");
    falharGravacao = true;

    const m = await carregar();
    const r = await m.migrarEApagarLocal();

    expect(r.falhou).toContain("cofre");
    expect(armazenamento.get("ps-japa:cofre:v1")).toBe("BLOB-CIFRADO");
  });

  it("NÃO apaga quando nem dá para saber o que a nuvem tem", async () => {
    armazenamento.set("ps-japa:textos:v1", CAMADA);
    falharLeitura = true;

    const m = await carregar();
    await m.migrarEApagarLocal();

    expect(armazenamento.get("ps-japa:textos:v1")).toBe(CAMADA);
  });

  it("não sobrescreve o que a nuvem já tem", async () => {
    naNuvem.cofre = "BLOB-DA-NUVEM";
    armazenamento.set("ps-japa:cofre:v1", "BLOB-VELHO-LOCAL");

    const m = await carregar();
    await m.migrarEApagarLocal();

    expect(gravadas).toEqual([]);
    expect(naNuvem.cofre).toBe("BLOB-DA-NUVEM");
    // Subiu nada, mas também não havia nada por subir: pode apagar.
    expect(armazenamento.size).toBe(0);
  });

  it("camada local vazia não vira gravação inútil", async () => {
    armazenamento.set(
      "ps-japa:textos:v1",
      JSON.stringify({ versao: 1, editados: {}, removidos: [], novos: [] }),
    );

    const m = await carregar();
    await m.migrarEApagarLocal();

    expect(gravadas).toEqual([]);
    expect(armazenamento.size).toBe(0);
  });

  it("leva preferências e contador na mesma chave que a tela lê", async () => {
    armazenamento.set("ps-japa:tema", "claro");
    armazenamento.set("ps-japa:apac:medico", "VICTOR M. HOURA");
    armazenamento.set("ps-japa:contador", "17");

    const m = await carregar();
    await m.migrarEApagarLocal();

    const prefs = naNuvem.preferencias as { tema: string; medico: string; contador: number };
    expect(prefs.tema).toBe("claro");
    expect(prefs.medico).toBe("VICTOR M. HOURA");
    // Dentro de "preferencias", que é de onde a tela do contador lê.
    expect(prefs.contador).toBe(17);
    expect(naNuvem.contador).toBeUndefined();
  });
});

describe("chaves da nuvem", () => {
  it("só existem as três que o banco aceita", async () => {
    // O CHECK da coluna `id` no Supabase é
    //   id in ('cofre', 'textos', 'preferencias')
    // Acrescentar chave aqui sem acrescentar lá faz toda gravação voltar 502.
    const rota = await import("../../app/api/nuvem/[chave]/route");
    expect(typeof rota.GET).toBe("function");

    armazenamento.set("ps-japa:cofre:v1", "x");
    armazenamento.set("ps-japa:textos:v1", CAMADA);
    armazenamento.set("ps-japa:tema", "claro");

    const m = await carregar();
    await m.migrarEApagarLocal();

    for (const chave of gravadas.map((g) => g.chave)) {
      expect(["cofre", "textos", "preferencias"]).toContain(chave);
    }
  });
});

describe("apagar da máquina", () => {
  it("varre toda chave do app, inclusive as que não conhecemos", async () => {
    armazenamento.set("ps-japa:textos:v1", CAMADA);
    armazenamento.set("ps-japa:alguma-coisa-futura", "x");
    armazenamento.set("outro-app:dados", "preservar");

    const m = await carregar();
    m.apagarTudoDaMaquina();

    expect(armazenamento.has("ps-japa:textos:v1")).toBe(false);
    expect(armazenamento.has("ps-japa:alguma-coisa-futura")).toBe(false);
    expect(armazenamento.get("outro-app:dados")).toBe("preservar");
  });

  it("apaga os caches que o service worker antigo deixou", async () => {
    const m = await carregar();
    m.apagarTudoDaMaquina();
    await new Promise((r) => setTimeout(r, 0));
    expect(cachesApagados).toEqual(["ps-japa-1", "ps-japa-estado"]);
  });
});
