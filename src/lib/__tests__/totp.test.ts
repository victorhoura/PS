import { describe, expect, it } from "vitest";
import {
  conferirCodigo,
  deBase32,
  enderecoOtpauth,
  gerarCodigo,
  novoSegredoTotp,
  paraBase32,
  passoDoCodigo,
} from "@/lib/totp";

/**
 * Os vetores de teste do próprio RFC 6238.
 *
 * Não adianta o código "parecer certo": ou ele produz exatamente o mesmo
 * número que o Google Authenticator produziria, ou o segundo fator não abre
 * — e quem descobre isso é você, na hora de trocar a senha, sem ter como
 * entrar. Estes vetores são a única prova que vale.
 *
 * O RFC publica oito dígitos; o app usa seis, que são os seis últimos.
 */
const SEGREDO_RFC = paraBase32(new TextEncoder().encode("12345678901234567890"));

const VETORES: [segundos: number, oitoDigitos: string][] = [
  [59, "94287082"],
  [1111111109, "07081804"],
  [1111111111, "14050471"],
  [1234567890, "89005924"],
  [2000000000, "69279037"],
  [20000000000, "65353130"],
];

describe("contra o RFC 6238", () => {
  it.each(VETORES)("em T=%i o código é %s", async (segundos, oito) => {
    expect(await gerarCodigo(SEGREDO_RFC, segundos * 1000)).toBe(oito.slice(-6));
  });

  it("o segredo do RFC em base32 é o que os autenticadores esperam", () => {
    expect(SEGREDO_RFC).toBe("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ");
  });
});

describe("base32", () => {
  it("ida e volta preserva os bytes", () => {
    const bytes = new Uint8Array([0, 1, 127, 128, 255, 42, 7]);
    expect([...deBase32(paraBase32(bytes))]).toEqual([...bytes]);
  });

  it("aceita o segredo digitado na mão, com espaço e minúscula", () => {
    const limpo = "GEZDGNBVGY3TQOJQ";
    const bagunçado = "gezd gnbv gy3t qojq";
    expect([...deBase32(bagunçado)]).toEqual([...deBase32(limpo)]);
  });

  it("o segredo novo tem 20 bytes, como manda o RFC 4226", () => {
    expect(deBase32(novoSegredoTotp()).length).toBe(20);
  });

  it("dois segredos novos não se repetem", () => {
    expect(novoSegredoTotp()).not.toBe(novoSegredoTotp());
  });
});

describe("conferência", () => {
  const agora = 1_700_000_000_000;

  it("aceita o código do momento", async () => {
    expect(await conferirCodigo(SEGREDO_RFC, await gerarCodigo(SEGREDO_RFC, agora), agora)).toBe(
      true,
    );
  });

  it("aceita a janela anterior e a seguinte: relógio de celular adianta", async () => {
    const anterior = await gerarCodigo(SEGREDO_RFC, agora - 30_000);
    const seguinte = await gerarCodigo(SEGREDO_RFC, agora + 30_000);
    expect(await conferirCodigo(SEGREDO_RFC, anterior, agora)).toBe(true);
    expect(await conferirCodigo(SEGREDO_RFC, seguinte, agora)).toBe(true);
  });

  it("recusa um código de dois minutos atrás", async () => {
    const velho = await gerarCodigo(SEGREDO_RFC, agora - 120_000);
    expect(await conferirCodigo(SEGREDO_RFC, velho, agora)).toBe(false);
  });

  it("recusa o código certo de outro segredo", async () => {
    const outro = novoSegredoTotp();
    expect(await conferirCodigo(SEGREDO_RFC, await gerarCodigo(outro, agora), agora)).toBe(false);
  });

  it("recusa lixo e tamanho errado", async () => {
    for (const ruim of ["", "12345", "1234567", "abcdef", "  "]) {
      expect(await conferirCodigo(SEGREDO_RFC, ruim, agora)).toBe(false);
    }
  });

  it("diz qual janela de 30 s o código era, para poder recusar repetição", async () => {
    const passo = Math.floor(agora / 30_000);
    expect(await passoDoCodigo(SEGREDO_RFC, await gerarCodigo(SEGREDO_RFC, agora), agora)).toBe(passo);
    const anterior = await gerarCodigo(SEGREDO_RFC, agora - 30_000);
    expect(await passoDoCodigo(SEGREDO_RFC, anterior, agora)).toBe(passo - 1);
    expect(await passoDoCodigo(SEGREDO_RFC, "000000", agora)).toBeNull();
  });

  it("ignora espaço no meio do código digitado", async () => {
    const codigo = await gerarCodigo(SEGREDO_RFC, agora);
    const comEspaco = `${codigo.slice(0, 3)} ${codigo.slice(3)}`;
    expect(await conferirCodigo(SEGREDO_RFC, comEspaco, agora)).toBe(true);
  });
});

describe("endereço do QR", () => {
  it("traz segredo, emissor e os parâmetros que o autenticador lê", () => {
    const url = new URL(enderecoOtpauth("ABC234"));
    expect(url.protocol).toBe("otpauth:");
    expect(url.searchParams.get("secret")).toBe("ABC234");
    expect(url.searchParams.get("issuer")).toBe("PS JAPA");
    expect(url.searchParams.get("digits")).toBe("6");
    expect(url.searchParams.get("period")).toBe("30");
    expect(url.searchParams.get("algorithm")).toBe("SHA1");
  });

  it("o rótulo é Emissor:conta, que é o que separa o serviço da conta", () => {
    // O pathname vem com a barra da frente.
    const caminho = decodeURIComponent(new URL(enderecoOtpauth("ABC234")).pathname);
    expect(caminho).toBe("/PS JAPA:ps.victorhoura.com");
  });

  it("é o mesmo endereço para qualquer autenticador — o padrão é um só", () => {
    // Nada aqui é específico de um aplicativo: se um dia aparecer algo do
    // tipo, este teste é o lugar de barrar.
    const endereco = enderecoOtpauth("ABC234");
    expect(endereco.startsWith("otpauth://totp/")).toBe(true);
    expect(endereco.toLowerCase()).not.toContain("google");
    expect(endereco.toLowerCase()).not.toContain("apple");
  });
});
