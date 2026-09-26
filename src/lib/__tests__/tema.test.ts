import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { COR_DA_BARRA, SCRIPT_TEMA, aplicarTema, lerTema, pintarTema, temaDoCookie } from "@/lib/tema";

/**
 * O que estes testes protegem é uma frase só: o tema escolhido sobrevive ao
 * BLOQUEAR. Ele sobrevive porque uma palavra fica no cookie — a preferência
 * da nuvem some junto com a sessão, e a tela de senha não tem como consultá-la.
 *
 * Por isso o alvo aqui é o script que roda no <head>, e não só as funções: é
 * ele quem pinta a tela de senha, antes do React e sem nuvem nenhuma.
 */

vi.mock("@/lib/preferencias", () => ({ definirPreferencia: vi.fn() }));

/** Um <html> e um `document.cookie` de mentira, com a semântica do de verdade. */
function fingirDocumento(cookieInicial = "") {
  const atributos = new Map<string, string>([["data-tema", "escuro"]]);
  const potes = new Map<string, string>();
  /** O <meta name="theme-color"> que o layout escreve com a cor do escuro. */
  const barra = new Map<string, string>([["content", COR_DA_BARRA.escuro]]);

  for (const parte of cookieInicial.split("; ").filter(Boolean)) {
    const i = parte.indexOf("=");
    potes.set(parte.slice(0, i), parte.slice(i + 1));
  }

  const doc = {
    documentElement: {
      setAttribute: (k: string, v: string) => atributos.set(k, v),
      getAttribute: (k: string) => atributos.get(k) ?? null,
    },
    querySelector: (seletor: string) =>
      seletor === 'meta[name="theme-color"]'
        ? { setAttribute: (k: string, v: string) => barra.set(k, v) }
        : null,
    get cookie() {
      return [...potes].map(([k, v]) => `${k}=${v}`).join("; ");
    },
    /** Escrever em `document.cookie` acrescenta um pote, não troca todos. */
    set cookie(bruto: string) {
      const [par, ...atributosDoPote] = bruto.split(";").map((s) => s.trim());
      const i = par.indexOf("=");
      potes.set(par.slice(0, i), par.slice(i + 1));
      escritos.push({ par, atributos: atributosDoPote });
    },
  };

  const escritos: { par: string; atributos: string[] }[] = [];
  vi.stubGlobal("document", doc);
  return { atributos, escritos, doc, barra };
}

function rodarScriptDoHead() {
  // O script vai para dentro do HTML como texto e executa no escopo global;
  // `new Function` é o mais perto disso que dá para fazer aqui.
  new Function(SCRIPT_TEMA)();
}

beforeEach(() => vi.stubGlobal("location", { protocol: "https:" }));
afterEach(() => vi.unstubAllGlobals());

describe("script do <head>", () => {
  it("pinta claro quando o cookie diz claro", () => {
    const { atributos } = fingirDocumento("ps_tema=claro");
    rodarScriptDoHead();
    expect(atributos.get("data-tema")).toBe("claro");
  });

  it("acha o cookie no meio de outros", () => {
    const { atributos } = fingirDocumento("ps_sessao=abc.def; ps_tema=claro; outro=1");
    rodarScriptDoHead();
    expect(atributos.get("data-tema")).toBe("claro");
  });

  it("máquina nova continua escura", () => {
    const { atributos } = fingirDocumento("");
    rodarScriptDoHead();
    expect(atributos.get("data-tema")).toBe("escuro");
  });

  it("ignora valor que não seja claro ou escuro", () => {
    const { atributos } = fingirDocumento("ps_tema=roxo");
    rodarScriptDoHead();
    expect(atributos.get("data-tema")).toBe("escuro");
  });

  it("a barra do sistema (status do iPhone) já nasce na cor do tema do cookie", () => {
    const claro = fingirDocumento("ps_tema=claro");
    rodarScriptDoHead();
    expect(claro.barra.get("content")).toBe(COR_DA_BARRA.claro);

    const novo = fingirDocumento("");
    rodarScriptDoHead();
    expect(novo.barra.get("content")).toBe(COR_DA_BARRA.escuro);
  });

  it("não se confunde com um cookie de nome parecido", () => {
    const { atributos } = fingirDocumento("xps_tema=claro");
    rodarScriptDoHead();
    expect(atributos.get("data-tema")).toBe("escuro");
  });
});

describe("gravação", () => {
  it("pintar grava o atributo e o cookie", () => {
    const { atributos, escritos } = fingirDocumento();
    pintarTema("claro");
    expect(atributos.get("data-tema")).toBe("claro");
    expect(escritos[0].par).toBe("ps_tema=claro");
  });

  it("o cookie dura um ano e vale no site inteiro", () => {
    const { escritos } = fingirDocumento();
    pintarTema("claro");
    expect(escritos[0].atributos).toContain("path=/");
    expect(escritos[0].atributos).toContain("max-age=31536000");
    expect(escritos[0].atributos).toContain("samesite=lax");
  });

  it("secure no site, mas não no executável (http://localhost)", () => {
    vi.stubGlobal("location", { protocol: "https:" });
    const emSite = fingirDocumento();
    pintarTema("claro");
    expect(emSite.escritos[0].atributos).toContain("secure");

    vi.stubGlobal("location", { protocol: "http:" });
    const emLocalhost = fingirDocumento();
    pintarTema("claro");
    expect(emLocalhost.escritos[0].atributos).not.toContain("secure");
  });

  it("trocar o tema troca junto a cor da barra do sistema", () => {
    const { barra } = fingirDocumento("ps_tema=claro");
    pintarTema("escuro");
    expect(barra.get("content")).toBe(COR_DA_BARRA.escuro);
    pintarTema("claro");
    expect(barra.get("content")).toBe(COR_DA_BARRA.claro);
  });

  it("escolher o tema também deixa o rastro que sobrevive ao bloqueio", () => {
    const { escritos } = fingirDocumento();
    aplicarTema("claro");
    expect(escritos[0].par).toBe("ps_tema=claro");
  });
});

describe("a escolha desta máquina", () => {
  it("máquina nova não tem escolha — aí a nuvem decide", () => {
    fingirDocumento("");
    expect(temaDoCookie()).toBeNull();
  });

  it("máquina que já escolheu manda, e a nuvem não repinta por cima", () => {
    fingirDocumento("ps_tema=claro");
    expect(temaDoCookie()).toBe("claro");
  });

  it("valor estragado não conta como escolha", () => {
    fingirDocumento("ps_tema=roxo");
    expect(temaDoCookie()).toBeNull();
  });
});

describe("a volta inteira", () => {
  it("claro, bloqueia, e a tela de senha nasce clara", () => {
    // Dentro do app: escolhe claro.
    const dentro = fingirDocumento();
    aplicarTema("claro");
    const cookieQueFicou = dentro.doc.cookie;

    // BLOQUEAR apaga a sessão e recarrega o documento do zero: <html> volta a
    // nascer escuro e não há nuvem para consultar. Só o cookie atravessa.
    const naTelaDeSenha = fingirDocumento(cookieQueFicou);
    expect(naTelaDeSenha.atributos.get("data-tema")).toBe("escuro");

    rodarScriptDoHead();
    expect(naTelaDeSenha.atributos.get("data-tema")).toBe("claro");
    expect(lerTema()).toBe("claro");
  });

  it("quem usa escuro segue escuro", () => {
    const dentro = fingirDocumento("ps_tema=claro");
    aplicarTema("escuro");

    const naTelaDeSenha = fingirDocumento(dentro.doc.cookie);
    rodarScriptDoHead();
    expect(naTelaDeSenha.atributos.get("data-tema")).toBe("escuro");
  });
});
