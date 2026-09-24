import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * O agrupamento de escritas espera 1,2 s antes de gravar. O que estes testes
 * protegem é o que acontece DENTRO desse intervalo: a última alteração não
 * pode morrer com a página nem com o BLOQUEAR.
 */

type Pedido = { chave: string; conteudo: unknown; keepalive: boolean };
let pedidos: Pedido[] = [];

async function modulo() {
  vi.resetModules();
  return import("../nuvem");
}

beforeEach(() => {
  pedidos = [];
  vi.useFakeTimers();
  vi.stubGlobal("fetch", async (url: string, init?: { body?: string; keepalive?: boolean }) => {
    pedidos.push({
      chave: String(url).split("/").pop() ?? "",
      conteudo: JSON.parse(init?.body ?? "{}").conteudo,
      keepalive: init?.keepalive === true,
    });
    return { ok: true, status: 200, json: async () => ({}) };
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("agrupamento", () => {
  it("escritas seguidas viram uma só, com o conteúdo mais novo", async () => {
    const n = await modulo();
    const empurrar = n.comEspera<string>("textos");
    empurrar(() => "a");
    empurrar(() => "b");
    expect(pedidos).toHaveLength(0);

    await vi.advanceTimersByTimeAsync(1200);
    expect(pedidos).toEqual([{ chave: "textos", conteudo: "b", keepalive: false }]);
  });
});

describe("antes do BLOQUEAR", () => {
  it("descarregar manda na hora o que está esperando, sem esperar o intervalo", async () => {
    const n = await modulo();
    n.comEspera<string>("textos")(() => "apagado");
    n.comEspera<string>("links")(() => "link novo");

    expect(await n.descarregarPendentes()).toBe(true);
    expect(pedidos.map((p) => p.chave).sort()).toEqual(["links", "textos"]);

    // E o timer não grava de novo depois.
    await vi.advanceTimersByTimeAsync(5000);
    expect(pedidos).toHaveLength(2);
  });

  it("sem nada pendente, não pede nada", async () => {
    const n = await modulo();
    expect(await n.descarregarPendentes()).toBe(true);
    expect(pedidos).toHaveLength(0);
  });

  it("diz quando a gravação não chegou", async () => {
    const n = await modulo();
    vi.stubGlobal("fetch", async () => ({ ok: false, status: 502, json: async () => ({}) }));
    n.comEspera<string>("textos")(() => "x");
    expect(await n.descarregarPendentes()).toBe(false);
  });
});

describe("textos buscados já no <head>", () => {
  it("a leitura aproveita a resposta que já estava a caminho, uma vez só", async () => {
    const antecipada = {
      ok: true,
      status: 200,
      json: async () => ({ conteudo: { novos: ["do head"] }, atualizadoEm: null }),
    };
    vi.stubGlobal("window", { __psTextos: Promise.resolve(antecipada), addEventListener() {} });
    vi.stubGlobal("document", { addEventListener() {}, visibilityState: "visible" });
    const n = await modulo();

    const primeira = await n.lerDaNuvem<{ novos: string[] }>("textos");
    expect(primeira.conteudo).toEqual({ novos: ["do head"] });
    expect(pedidos).toHaveLength(0);

    // Um corpo só se lê uma vez: a segunda leitura vai à rede.
    await n.lerDaNuvem("textos");
    expect(pedidos).toHaveLength(1);
  });

  it("só para os textos: as outras chaves vão direto à rede", async () => {
    vi.stubGlobal("window", { __psTextos: Promise.resolve({}), addEventListener() {} });
    vi.stubGlobal("document", { addEventListener() {}, visibilityState: "visible" });
    const n = await modulo();
    await n.lerDaNuvem("links");
    expect(pedidos.map((p) => p.chave)).toEqual(["links"]);
  });

  it("falha do pedido antecipado vira erro da leitura, não silêncio", async () => {
    const falha = Promise.reject(new TypeError("rede"));
    falha.catch(() => {});
    vi.stubGlobal("window", { __psTextos: falha, addEventListener() {} });
    vi.stubGlobal("document", { addEventListener() {}, visibilityState: "visible" });
    const n = await modulo();
    await expect(n.lerDaNuvem("textos")).rejects.toThrow();
  });
});

describe("página indo embora", () => {
  it("REGRESSÃO: o que estava no intervalo sai na hora, com keepalive", async () => {
    // Antes: apagar um texto e recarregar a página em menos de 1,2 s perdia o
    // apagamento — o timer morria com a página e nada chegava ao banco.
    const n = await modulo();
    n.comEspera<{ removidos: string[] }>("textos")(() => ({ removidos: ["rec-1"] }));

    n.mandarAntesDeSair();
    await vi.advanceTimersByTimeAsync(0);
    expect(pedidos).toEqual([{ chave: "textos", conteudo: { removidos: ["rec-1"] }, keepalive: true }]);
  });

  it("conteúdo grande demais para o keepalive vai do jeito normal", async () => {
    const n = await modulo();
    n.comEspera<string>("textos")(() => "x".repeat(70_000));

    n.mandarAntesDeSair();
    await vi.advanceTimersByTimeAsync(0);
    expect(pedidos).toHaveLength(1);
    expect(pedidos[0].keepalive).toBe(false);
  });

  it("o teto conta bytes, não letras: acento pesa dois", async () => {
    const n = await modulo();
    // 35 mil "ç" são 35 mil letras, mas 70 mil bytes em UTF-8.
    n.comEspera<string>("textos")(() => "ç".repeat(35_000));

    n.mandarAntesDeSair();
    await vi.advanceTimersByTimeAsync(0);
    expect(pedidos[0].keepalive).toBe(false);
  });
});
