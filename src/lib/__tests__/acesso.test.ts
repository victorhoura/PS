import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A senha do app: o que vai para o banco e o que decide quem entra.
 *
 * O que estes testes seguram, em ordem de importância:
 *   1. a senha em si nunca é gravada — só o hash;
 *   2. uma falha do banco não vale como "ainda não tem senha própria", senão
 *      bastaria esperar o Supabase piscar para a senha antiga voltar a valer;
 *   3. trocar a senha troca a chave que assina o cookie, que é o que derruba
 *      as sessões abertas nos outros computadores.
 */

const banco = vi.hoisted(() => ({
  registro: null as unknown,
  quebrado: false,
  configurado: true,
  gravado: [] as unknown[],
}));

vi.mock("@/lib/supabase", () => ({
  nuvemConfigurada: () => banco.configurado,
  lerRegistro: async () => {
    if (banco.quebrado) throw new Error("supabase 503");
    return banco.registro ? { conteudo: banco.registro, atualizadoEm: "agora" } : null;
  },
  gravarRegistro: async (_id: string, conteudo: unknown) => {
    banco.gravado.push(conteudo);
    banco.registro = conteudo;
    return { conteudo, atualizadoEm: "agora" };
  },
}));

async function modulo() {
  vi.resetModules();
  banco.registro = null;
  banco.quebrado = false;
  banco.configurado = true;
  banco.gravado = [];
  return import("@/lib/acesso");
}

beforeEach(() => {
  process.env.PS_SENHA = "daVercel123";
});
afterEach(() => {
  delete process.env.PS_SENHA;
});

/** Monta um registro como o da troca de senha, sem repetir a rota inteira. */
async function comSenha(a: Awaited<ReturnType<typeof modulo>>, senha: string, versao = 1) {
  const sal = a.novoSal();
  await a.gravarAcesso({ versao, sal, hash: await a.derivar(senha, sal), totp: "ABC234" });
}

describe("enquanto não há senha própria", () => {
  it("vale a senha da Vercel, como sempre valeu", async () => {
    const a = await modulo();
    expect(await a.conferirSenha("daVercel123")).toBe(true);
    expect(await a.conferirSenha("outra")).toBe(false);
  });

  it("a chave que assina o cookie é a da Vercel", async () => {
    const a = await modulo();
    expect(await a.segredoDeAssinatura()).toBe("daVercel123");
  });
});

describe("depois de trocar", () => {
  it("a senha nova entra e a da Vercel para de valer", async () => {
    const a = await modulo();
    await comSenha(a, "minhaSenhaNova");

    expect(await a.conferirSenha("minhaSenhaNova")).toBe(true);
    expect(await a.conferirSenha("daVercel123")).toBe(false);
  });

  it("o que foi para o banco é o hash, nunca a senha", async () => {
    const a = await modulo();
    await comSenha(a, "minhaSenhaNova");

    const gravado = JSON.stringify(banco.gravado);
    expect(gravado).not.toContain("minhaSenhaNova");
    expect(gravado).toContain("hash");
  });

  it("o mesmo texto com sal diferente dá hash diferente", async () => {
    const a = await modulo();
    const um = await a.derivar("igual", a.novoSal());
    const dois = await a.derivar("igual", a.novoSal());
    expect(um).not.toBe(dois);
  });

  it("a chave do cookie muda, que é o que derruba as outras sessões", async () => {
    const a = await modulo();
    const antes = await a.segredoDeAssinatura();
    await comSenha(a, "minhaSenhaNova");
    const depois = await a.segredoDeAssinatura();

    expect(depois).not.toBe(antes);
    expect(depois).toContain("v1:");
  });

  it("e muda de novo a cada troca seguinte", async () => {
    const a = await modulo();
    await comSenha(a, "primeira", 1);
    const primeira = await a.segredoDeAssinatura();
    await comSenha(a, "segunda", 2);
    expect(await a.segredoDeAssinatura()).not.toBe(primeira);
  });
});

describe("com o banco fora do ar", () => {
  it("NÃO aceita a senha antiga da Vercel de volta", async () => {
    const a = await modulo();
    await comSenha(a, "minhaSenhaNova");

    banco.quebrado = true;
    expect(await a.conferirSenha("daVercel123")).toBe(false);
    expect(await a.conferirSenha("minhaSenhaNova")).toBe(false);
  });

  it("a chave do cookie deixa de conferir, então o app tranca", async () => {
    const a = await modulo();
    await comSenha(a, "minhaSenhaNova");
    const valendo = await a.segredoDeAssinatura();

    banco.quebrado = true;
    const comBancoFora = await a.segredoDeAssinatura();

    expect(comBancoFora).not.toBe(valendo);
    // e não é nulo, que faria o proxy liberar o app inteiro sem senha
    expect(comBancoFora).toBe("daVercel123");
  });

  it("sem PS_SENHA e sem banco, não devolve chave nenhuma", async () => {
    const a = await modulo();
    delete process.env.PS_SENHA;
    banco.quebrado = true;
    expect(await a.segredoDeAssinatura()).toBeNull();
  });
});

describe("comparação", () => {
  it("é em tempo constante e não confunde tamanhos", async () => {
    const a = await modulo();
    expect(a.iguais("abc", "abc")).toBe(true);
    expect(a.iguais("abc", "abd")).toBe(false);
    expect(a.iguais("abc", "abcd")).toBe(false);
    expect(a.iguais("", "")).toBe(true);
  });
});
