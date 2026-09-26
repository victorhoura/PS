import { describe, expect, it } from "vitest";
import {
  cadastrar,
  descadastrar,
  dividirPlantao,
  duracao,
  foraDoCadastro,
  horaAtual,
  lerCadastrados,
  MAX_CADASTRADOS,
  mesmoNome,
  paraHora,
  paraMinutos,
  textoDaDivisao,
} from "@/lib/plantao";

describe("horas", () => {
  it("lê e escreve hora do relógio", () => {
    expect(paraMinutos("21:40")).toBe(1300);
    expect(paraMinutos("7:05")).toBe(425);
    expect(paraHora(1300)).toBe("21:40");
    expect(paraHora(1500)).toBe("01:00");
  });

  it("recusa o que não é hora", () => {
    expect(paraMinutos("24:00")).toBeNull();
    expect(paraMinutos("12:60")).toBeNull();
    expect(paraMinutos("")).toBeNull();
    expect(paraMinutos("abc")).toBeNull();
  });

  it("escreve duração do jeito que se fala", () => {
    expect(duracao(188)).toBe("3h08");
    expect(duracao(120)).toBe("2h");
    expect(duracao(45)).toBe("45min");
  });

  it("hora atual em HH:MM", () => {
    expect(horaAtual(new Date(2026, 8, 26, 3, 7))).toBe("03:07");
  });
});

describe("divisão", () => {
  it("atravessa a meia-noite: 22:00 às 07:00 entre três dá 3h cada", () => {
    const d = dividirPlantao("22:00", "07:00", ["ana", "bruno", "carla"])!;
    expect(d.total).toBe(9 * 60);
    expect(d.turnos.map((t) => [t.nome, t.inicio, t.fim, t.minutos])).toEqual([
      ["ANA", "22:00", "01:00", 180],
      ["BRUNO", "01:00", "04:00", 180],
      ["CARLA", "04:00", "07:00", 180],
    ]);
  });

  it("turnos contíguos, o último termina no fim e ninguém perde mais de um minuto", () => {
    const d = dividirPlantao("21:37", "07:00", ["", "", ""])!;
    expect(d.turnos[0].inicio).toBe("21:37");
    expect(d.turnos.at(-1)!.fim).toBe("07:00");
    for (let i = 1; i < d.turnos.length; i++) expect(d.turnos[i].inicio).toBe(d.turnos[i - 1].fim);
    const minutos = d.turnos.map((t) => t.minutos);
    expect(minutos.reduce((a, b) => a + b, 0)).toBe(d.total);
    expect(Math.max(...minutos) - Math.min(...minutos)).toBeLessThanOrEqual(1);
  });

  it("depois da meia-noite a conta continua no mesmo dia", () => {
    const d = dividirPlantao("02:00", "07:00", ["a", "b"])!;
    expect(d.total).toBe(300);
    expect(d.turnos[1].inicio).toBe("04:30");
  });

  it("nome em branco vira PLANTONISTA N", () => {
    const d = dividirPlantao("01:00", "07:00", ["", "  joão  "])!;
    expect(d.turnos.map((t) => t.nome)).toEqual(["PLANTONISTA 1", "JOÃO"]);
  });

  it("início igual ao fim, hora inválida ou ninguém: não divide", () => {
    expect(dividirPlantao("07:00", "07:00", ["a"])).toBeNull();
    expect(dividirPlantao("25:00", "07:00", ["a"])).toBeNull();
    expect(dividirPlantao("22:00", "07:00", [])).toBeNull();
  });

  it("texto para copiar, uma linha por turno", () => {
    const d = dividirPlantao("22:00", "07:00", ["ana", "bruno", "carla"])!;
    expect(textoDaDivisao(d)).toBe(
      [
        "DIVISÃO DE PLANTÃO — 22:00 ÀS 07:00 (9h)",
        "1. ANA — 22:00 ÀS 01:00 (3h)",
        "2. BRUNO — 01:00 ÀS 04:00 (3h)",
        "3. CARLA — 04:00 ÀS 07:00 (3h)",
      ].join("\n"),
    );
  });
});

describe("plantonistas cadastrados", () => {
  it("cadastra em maiúsculas, sem espaço sobrando e em ordem alfabética", () => {
    let lista: string[] = [];
    for (const nome of ["  victor ", "iza", "Ândrea  lima", "bruno"]) {
      const r = cadastrar(lista, nome);
      if ("erro" in r) throw new Error(r.erro);
      lista = r.lista;
    }
    expect(lista).toEqual(["ÂNDREA LIMA", "BRUNO", "IZA", "VICTOR"]);
  });

  it("a mesma pessoa não entra duas vezes, com ou sem acento", () => {
    expect(mesmoNome("João", "JOAO")).toBe(true);
    expect(cadastrar(["JOÃO"], "joao")).toEqual({ erro: "JOÃO já está cadastrado." });
    expect(cadastrar(["JOÃO"], "   ")).toEqual({ erro: "Escreva o nome do plantonista." });
  });

  it("tem limite", () => {
    const cheia = Array.from({ length: MAX_CADASTRADOS }, (_, i) => `NOME ${String(i).padStart(2, "0")}`);
    expect("erro" in cadastrar(cheia, "OUTRO")).toBe(true);
  });

  it("descadastra pelo nome, com ou sem acento", () => {
    expect(descadastrar(["BRUNO", "JOÃO"], "joao")).toEqual(["BRUNO"]);
  });

  it("o que vem da nuvem é conferido", () => {
    expect(lerCadastrados(undefined)).toEqual([]);
    expect(lerCadastrados("IZA")).toEqual([]);
    expect(lerCadastrados(["iza", 3, null, "IZA", " bruno "])).toEqual(["BRUNO", "IZA"]);
  });

  it("acha os nomes da divisão que ainda não estão cadastrados", () => {
    expect(foraDoCadastro(["japa", "", "Iza", "IZA", "bruno"], ["BRUNO"])).toEqual(["JAPA", "IZA"]);
  });
});
