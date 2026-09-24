import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { gerarCodigo } from "@/lib/totp";

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
  gravacaoQuebrada: false,
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
    if (banco.gravacaoQuebrada) throw new Error("supabase 503");
    banco.gravado.push(conteudo);
    banco.registro = conteudo;
    return { conteudo, atualizadoEm: "agora" };
  },
}));

async function modulo() {
  vi.resetModules();
  banco.registro = null;
  banco.quebrado = false;
  banco.gravacaoQuebrada = false;
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
async function comSenha(
  a: Awaited<ReturnType<typeof modulo>>,
  senha: string,
  versao = 1,
  totp: string | null = SEGREDO,
) {
  const sal = a.novoSal();
  await a.gravarAcesso({ versao, sal, hash: await a.derivar(senha, sal), totp, ultimoPasso: 0 });
}

/** Um segredo de autenticador qualquer, e o relógio parado num instante conhecido. */
const SEGREDO = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP";
const AGORA = 1_800_000_000_000;

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

describe("entrada com o código do autenticador", () => {
  beforeEach(() => {
    // Só o relógio é falso: o PBKDF2 do Web Crypto não depende de timer.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(AGORA);
  });
  afterEach(() => vi.useRealTimers());

  it("senha certa e código certo entram", async () => {
    const a = await modulo();
    await comSenha(a, "minhaSenhaNova");
    expect(await a.conferirEntrada("minhaSenhaNova", await gerarCodigo(SEGREDO))).toBe(true);
  });

  it("falta qualquer um dos dois, não entra", async () => {
    const a = await modulo();
    await comSenha(a, "minhaSenhaNova");
    const codigo = await gerarCodigo(SEGREDO);
    expect(await a.conferirEntrada("minhaSenhaNova", "")).toBe(false);
    expect(await a.conferirEntrada("minhaSenhaNova", "000000")).toBe(false);
    expect(await a.conferirEntrada("errada", codigo)).toBe(false);
  });

  it("REGRESSÃO de segurança: o mesmo código não entra duas vezes", async () => {
    // Numa máquina pública, quem capturou senha e código não repete a entrada.
    const a = await modulo();
    await comSenha(a, "minhaSenhaNova");
    const codigo = await gerarCodigo(SEGREDO);

    expect(await a.conferirEntrada("minhaSenhaNova", codigo)).toBe(true);
    expect(await a.conferirEntrada("minhaSenhaNova", codigo)).toBe(false);

    // Nem o código da janela anterior, que a folga de relógio aceitaria.
    const anterior = await gerarCodigo(SEGREDO, AGORA - 30_000);
    expect(await a.conferirEntrada("minhaSenhaNova", anterior)).toBe(false);

    // O próximo código, sim.
    vi.setSystemTime(AGORA + 30_000);
    expect(await a.conferirEntrada("minhaSenhaNova", await gerarCodigo(SEGREDO))).toBe(true);
  });

  it("entrar não troca a chave do cookie: as outras sessões seguem abertas", async () => {
    const a = await modulo();
    await comSenha(a, "minhaSenhaNova");
    const antes = await a.segredoDeAssinatura();
    await a.conferirEntrada("minhaSenhaNova", await gerarCodigo(SEGREDO));
    expect(await a.segredoDeAssinatura()).toBe(antes);
  });

  it("sem conseguir gravar que o código foi usado, recusa a entrada", async () => {
    const a = await modulo();
    await comSenha(a, "minhaSenhaNova");
    banco.gravacaoQuebrada = true;
    expect(await a.conferirEntrada("minhaSenhaNova", await gerarCodigo(SEGREDO))).toBe(false);
  });

  it("sem autenticador configurado, basta a senha", async () => {
    const a = await modulo();
    await comSenha(a, "minhaSenhaNova", 1, null);
    expect(await a.conferirEntrada("minhaSenhaNova", "")).toBe(true);
    expect(await a.pedeCodigoNaEntrada()).toBe(false);
  });

  it("sem senha própria, vale a da Vercel e o código não é pedido", async () => {
    const a = await modulo();
    expect(await a.conferirEntrada("daVercel123", "")).toBe(true);
    expect(await a.pedeCodigoNaEntrada()).toBe(false);
  });

  it("a tela pede o código com autenticador — e também com o banco fora", async () => {
    const a = await modulo();
    await comSenha(a, "minhaSenhaNova");
    expect(await a.pedeCodigoNaEntrada()).toBe(true);
    banco.quebrado = true;
    expect(await a.pedeCodigoNaEntrada()).toBe(true);
    expect(await a.conferirEntrada("minhaSenhaNova", await gerarCodigo(SEGREDO))).toBe(false);
  });

  it("gastarCodigo recusa o passo já usado e aceita o seguinte", async () => {
    const a = await modulo();
    const passo = Math.floor(AGORA / 30_000);
    const codigo = await gerarCodigo(SEGREDO);
    expect(await a.gastarCodigo(SEGREDO, codigo, passo - 1)).toBe(passo);
    expect(await a.gastarCodigo(SEGREDO, codigo, passo)).toBeNull();
  });
});
