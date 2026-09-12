import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buscarNaGrade,
  cifrar,
  COFRE_VAZIO,
  decifrar,
  type ConteudoCofre,
  type Grade,
} from "../cofre";

const MESTRA = "frase-longa-de-teste-do-cofre";

const CONTEUDO: ConteudoCofre = {
  versao: 1,
  credenciais: [
    { id: "c1", rotulo: "SISS", usuario: "usuario-ficticio", senha: "senha-ficticia", nota: "" },
  ],
  grade: {
    colunas: ["A", "B", "C", "D"],
    linhas: ["1", "2", "3", "4"],
    valores: [
      ["a1", "b1", "c1", "d1"],
      ["a2", "b2", "c2", "d2"],
      ["a3", "b3", "c3", "d3"],
      ["a4", "b4", "c4", "d4"],
    ],
  },
};

describe("ida e volta", () => {
  it("decifra com a senha certa", async () => {
    const blob = await cifrar(CONTEUDO, MESTRA);
    expect(await decifrar(blob, MESTRA)).toEqual(CONTEUDO);
  });

  it("o blob não contém os segredos em claro", async () => {
    const blob = await cifrar(CONTEUDO, MESTRA);
    expect(blob).not.toContain("senha-ficticia");
    expect(blob).not.toContain("usuario-ficticio");
    expect(blob).not.toContain("SISS");
    expect(blob).not.toContain(MESTRA);
  });

  it("cada cifragem usa sal e IV novos", async () => {
    const a = JSON.parse(await cifrar(CONTEUDO, MESTRA));
    const b = JSON.parse(await cifrar(CONTEUDO, MESTRA));
    expect(a.sal).not.toBe(b.sal);
    expect(a.iv).not.toBe(b.iv);
    expect(a.ct).not.toBe(b.ct);
  });
});

describe("recusa", () => {
  it("senha errada devolve null, não lixo", async () => {
    const blob = await cifrar(CONTEUDO, MESTRA);
    expect(await decifrar(blob, "senha-errada")).toBeNull();
    expect(await decifrar(blob, "")).toBeNull();
    expect(await decifrar(blob, MESTRA + " ")).toBeNull();
  });

  it("blob adulterado devolve null (AES-GCM detecta)", async () => {
    const blob = JSON.parse(await cifrar(CONTEUDO, MESTRA));
    const mexido = { ...blob, ct: blob.ct.slice(0, -4) + "AAAA" };
    expect(await decifrar(JSON.stringify(mexido), MESTRA)).toBeNull();
  });

  it("sal trocado devolve null", async () => {
    const a = JSON.parse(await cifrar(CONTEUDO, MESTRA));
    const b = JSON.parse(await cifrar(CONTEUDO, MESTRA));
    expect(await decifrar(JSON.stringify({ ...a, sal: b.sal }), MESTRA)).toBeNull();
  });

  it("entrada que não é blob devolve null", async () => {
    expect(await decifrar("nao e json", MESTRA)).toBeNull();
    expect(await decifrar("{}", MESTRA)).toBeNull();
    expect(await decifrar('{"v":2}', MESTRA)).toBeNull();
  });

  it("cofre vazio também faz ida e volta", async () => {
    expect(await decifrar(await cifrar(COFRE_VAZIO, MESTRA), MESTRA)).toEqual(COFRE_VAZIO);
  });
});

describe("chave dinâmica", () => {
  const grade = CONTEUDO.grade as Grade;

  it("acha nas duas ordens e ignorando caixa/espaço", () => {
    expect(buscarNaGrade(grade, "3A")).toBe("a3");
    expect(buscarNaGrade(grade, "a3")).toBe("a3");
    expect(buscarNaGrade(grade, "3 a")).toBe("a3");
    expect(buscarNaGrade(grade, "2D")).toBe("d2");
    expect(buscarNaGrade(grade, "D2")).toBe("d2");
  });

  it("devolve null para entrada inválida", () => {
    expect(buscarNaGrade(grade, "")).toBeNull();
    expect(buscarNaGrade(grade, "9Z")).toBeNull();
    expect(buscarNaGrade(grade, "3")).toBeNull();
    expect(buscarNaGrade(grade, "3AB")).toBeNull();
    expect(buscarNaGrade(null, "3A")).toBeNull();
  });

  it("célula em branco conta como ausente", () => {
    const vazia: Grade = { ...grade, valores: grade.valores.map((l) => l.map(() => "")) };
    expect(buscarNaGrade(vazia, "3A")).toBeNull();
  });
});
