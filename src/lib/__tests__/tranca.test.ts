import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  conferirOffline,
  esquecerVerificador,
  guardarVerificador,
  temVerificador,
} from "../tranca";

const CHAVE = "ps-japa:verificador:v1";
const SENHA = "456";

/** localStorage de mentira: o verificador só precisa de get/set/remove. */
function instalarArmazenamento(falhar = false) {
  const dados = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => dados.get(k) ?? null,
    setItem: (k: string, v: string) => {
      if (falhar) throw new DOMException("QuotaExceededError");
      dados.set(k, v);
    },
    removeItem: (k: string) => dados.delete(k),
  });
  return dados;
}

let dados: Map<string, string>;

beforeEach(() => {
  dados = instalarArmazenamento();
});

describe("verificador offline", () => {
  it("não existe antes da primeira entrada com rede", async () => {
    expect(temVerificador()).toBe(false);
    expect(await conferirOffline(SENHA)).toBe(false);
  });

  it("aceita a senha certa depois de gravado", async () => {
    await guardarVerificador(SENHA);
    expect(temVerificador()).toBe(true);
    expect(await conferirOffline(SENHA)).toBe(true);
  });

  it("recusa qualquer outra senha", async () => {
    await guardarVerificador(SENHA);
    expect(await conferirOffline("457")).toBe(false);
    expect(await conferirOffline("")).toBe(false);
    expect(await conferirOffline("456 ")).toBe(false);
  });

  it("não guarda a senha, só o PBKDF2 dela", async () => {
    await guardarVerificador(SENHA);
    const bruto = dados.get(CHAVE)!;
    const { sal, hash, it: iteracoes } = JSON.parse(bruto);
    expect(iteracoes).toBe(250_000);
    // O hash é base64 de 32 bytes; a senha não pode aparecer em lugar nenhum.
    expect(atob(hash)).toHaveLength(32);
    expect(atob(sal)).toHaveLength(16);
    expect(atob(hash)).not.toContain(SENHA);
    expect(atob(sal)).not.toContain(SENHA);
  });

  it("sorteia um sal novo a cada gravação", async () => {
    await guardarVerificador(SENHA);
    const primeiro = JSON.parse(dados.get(CHAVE)!);
    await guardarVerificador(SENHA);
    const segundo = JSON.parse(dados.get(CHAVE)!);

    expect(segundo.sal).not.toBe(primeiro.sal);
    expect(segundo.hash).not.toBe(primeiro.hash);
    // Sal diferente, mas a mesma senha continua valendo.
    expect(await conferirOffline(SENHA)).toBe(true);
  });

  it("esquecer fecha a entrada sem rede", async () => {
    await guardarVerificador(SENHA);
    esquecerVerificador();
    expect(temVerificador()).toBe(false);
    expect(await conferirOffline(SENHA)).toBe(false);
  });

  it("ignora conteúdo corrompido em vez de quebrar a tela de senha", async () => {
    dados.set(CHAVE, "{não é json}");
    expect(temVerificador()).toBe(false);
    expect(await conferirOffline(SENHA)).toBe(false);

    dados.set(CHAVE, JSON.stringify({ v: 1, sal: "", hash: "", it: 0 }));
    expect(temVerificador()).toBe(false);
    expect(await conferirOffline(SENHA)).toBe(false);
  });

  it("sem armazenamento, não trava — apenas não confere nada", async () => {
    instalarArmazenamento(true);
    await expect(guardarVerificador(SENHA)).resolves.toBeUndefined();
    expect(temVerificador()).toBe(false);
  });
});
