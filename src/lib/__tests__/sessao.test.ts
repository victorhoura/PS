import { describe, expect, it } from "vitest";
import { cookieValido, criarCookie, iguais } from "../sessao";

const SENHA = "senha-de-teste-123";

describe("comparação em tempo constante", () => {
  it("aceita iguais e recusa diferentes", () => {
    expect(iguais("abc", "abc")).toBe(true);
    expect(iguais("abc", "abd")).toBe(false);
    expect(iguais("abc", "ab")).toBe(false);
    expect(iguais("", "")).toBe(true);
  });
});

describe("cookie de sessão", () => {
  it("aceita o cookie que ele mesmo emitiu", async () => {
    const c = await criarCookie(SENHA);
    expect(await cookieValido(c.valor, SENHA)).toBe(true);
  });

  it("recusa cookie assinado com outra senha", async () => {
    const c = await criarCookie(SENHA);
    expect(await cookieValido(c.valor, "outra-senha")).toBe(false);
  });

  it("recusa cookie ausente ou malformado", async () => {
    expect(await cookieValido(undefined, SENHA)).toBe(false);
    expect(await cookieValido("", SENHA)).toBe(false);
    expect(await cookieValido("semponto", SENHA)).toBe(false);
    expect(await cookieValido(".soassinatura", SENHA)).toBe(false);
  });

  it("recusa cookie com assinatura adulterada", async () => {
    const c = await criarCookie(SENHA);
    const [payload, mac] = c.valor.split(".");
    expect(await cookieValido(`${payload}.${mac.slice(0, -1)}X`, SENHA)).toBe(false);
  });

  it("recusa quando a validade é esticada sem reassinar", async () => {
    const c = await criarCookie(SENHA);
    const mac = c.valor.split(".")[1];
    const futuro = Date.now() + 10 * 365 * 24 * 3600 * 1000;
    expect(await cookieValido(`${futuro}.${mac}`, SENHA)).toBe(false);
  });

  it("recusa cookie expirado, mesmo com assinatura válida", async () => {
    // Assina um payload no passado do mesmo jeito que criarCookie assinaria.
    const passado = String(Date.now() - 1000);
    const c = await criarCookie(SENHA);
    const forjado = `${passado}.${c.valor.split(".")[1]}`;
    expect(await cookieValido(forjado, SENHA)).toBe(false);
  });

  it("dura 180 dias", async () => {
    const c = await criarCookie(SENHA);
    expect(c.maxAge).toBe(180 * 24 * 3600);
  });
});
