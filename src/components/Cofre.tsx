"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  apagarCofre,
  buscarNaGrade,
  cifrar,
  COFRE_VAZIO,
  type Credencial,
  decifrar,
  existeCofre,
  type Grade,
  GRADE_PADRAO,
  gravarBlob,
  lerBlob,
  novaCredencial,
  type ConteudoCofre,
} from "@/lib/cofre";
import { copiar } from "@/lib/clipboard";
import { avisarCopia } from "./AvisoCopia";
import { IconeCadeado, IconeCopiar, IconeMais, IconeFechar } from "./Icones";

/** Sem interação por este tempo, o cofre se tranca sozinho. */
const MINUTOS_ATE_TRANCAR = 5;

type Estado =
  | { modo: "carregando" }
  | { modo: "sem-cofre" }
  | { modo: "trancado" }
  | { modo: "aberto"; conteudo: ConteudoCofre; editando: boolean };

export function Cofre() {
  const [estado, setEstado] = useState<Estado>({ modo: "carregando" });
  const [senha, setSenha] = useState("");
  const [senha2, setSenha2] = useState("");
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);

  /**
   * A senha-mestra fica só aqui, em memória, enquanto o cofre está aberto —
   * nunca em estado que possa vazar para o React DevTools nem no localStorage.
   */
  const mestraRef = useRef<string | null>(null);

  const trancar = useCallback(() => {
    mestraRef.current = null;
    setSenha("");
    setSenha2("");
    setErro("");
    setEstado({ modo: existeCofre() ? "trancado" : "sem-cofre" });
  }, []);

  useEffect(() => {
    setEstado({ modo: existeCofre() ? "trancado" : "sem-cofre" });
  }, []);

  // Tranca sozinho depois de um tempo parado: é um computador compartilhado.
  useEffect(() => {
    if (estado.modo !== "aberto") return;

    let timer: ReturnType<typeof setTimeout>;
    const rearmar = () => {
      clearTimeout(timer);
      timer = setTimeout(trancar, MINUTOS_ATE_TRANCAR * 60_000);
    };
    rearmar();

    const eventos = ["mousedown", "keydown", "touchstart"] as const;
    for (const e of eventos) window.addEventListener(e, rearmar);
    return () => {
      clearTimeout(timer);
      for (const e of eventos) window.removeEventListener(e, rearmar);
    };
  }, [estado.modo, trancar]);

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    if (senha.length < 8) return setErro("Use pelo menos 8 caracteres.");
    if (senha !== senha2) return setErro("As duas senhas não conferem.");

    setOcupado(true);
    const ok = gravarBlob(await cifrar(COFRE_VAZIO, senha));
    setOcupado(false);
    if (!ok) return setErro("O navegador recusou gravar.");

    mestraRef.current = senha;
    setSenha("");
    setSenha2("");
    setErro("");
    setEstado({ modo: "aberto", conteudo: COFRE_VAZIO, editando: true });
  }

  async function destrancar(e: React.FormEvent) {
    e.preventDefault();
    const blob = lerBlob();
    if (!blob) return trancar();

    setOcupado(true);
    const conteudo = await decifrar(blob, senha);
    setOcupado(false);

    if (!conteudo) {
      setErro("Senha-mestra incorreta.");
      setSenha("");
      return;
    }
    mestraRef.current = senha;
    setSenha("");
    setErro("");
    setEstado({ modo: "aberto", conteudo, editando: false });
  }

  async function salvar(conteudo: ConteudoCofre) {
    const mestra = mestraRef.current;
    if (!mestra) return trancar();

    setOcupado(true);
    const ok = gravarBlob(await cifrar(conteudo, mestra));
    setOcupado(false);
    avisarCopia(ok ? "Cofre salvo." : "O navegador recusou gravar.", ok);
    setEstado({ modo: "aberto", conteudo, editando: false });
  }

  if (estado.modo === "carregando") {
    return <Moldura><p className="text-[11px] text-inkDim">…</p></Moldura>;
  }

  if (estado.modo === "sem-cofre") {
    return (
      <Moldura>
        <p className="mb-3 text-[11px] leading-relaxed text-inkDim">
          O cofre guarda login, senha e o cartão de chave dinâmica <strong className="text-ink">
          cifrados neste navegador</strong>. Nada vai para o servidor nem para o repositório.
          Escolha uma senha-mestra <strong className="text-ink">diferente</strong> da senha do app.
        </p>
        <form onSubmit={criar} className="flex flex-col gap-2 sm:max-w-xs">
          <input
            type="password" value={senha} onChange={(e) => { setSenha(e.target.value); setErro(""); }}
            placeholder="Senha-mestra (mín. 8)" autoComplete="new-password"
            className="h-9 rounded-lg border border-edge bg-base px-3 text-[13px] text-ink outline-none focus:border-accent"
          />
          <input
            type="password" value={senha2} onChange={(e) => { setSenha2(e.target.value); setErro(""); }}
            placeholder="Repita a senha-mestra" autoComplete="new-password"
            className="h-9 rounded-lg border border-edge bg-base px-3 text-[13px] text-ink outline-none focus:border-accent"
          />
          {erro && <p role="alert" className="text-[11px] text-danger">{erro}</p>}
          <button
            type="submit" disabled={ocupado || !senha || !senha2}
            className="transicao h-9 rounded-lg bg-accent px-4 text-[12px] font-bold tracking-wide text-accentInk hover:brightness-110 disabled:opacity-40"
          >
            {ocupado ? "CIFRANDO…" : "CRIAR COFRE"}
          </button>
        </form>
      </Moldura>
    );
  }

  if (estado.modo === "trancado") {
    return (
      <Moldura>
        <form onSubmit={destrancar} className="flex flex-col gap-2 sm:max-w-xs">
          <input
            type="password" value={senha} onChange={(e) => { setSenha(e.target.value); setErro(""); }}
            placeholder="Senha-mestra" autoComplete="off"
            className="h-9 rounded-lg border border-edge bg-base px-3 text-[13px] text-ink outline-none focus:border-accent"
          />
          {erro && <p role="alert" className="text-[11px] text-danger">{erro}</p>}
          <button
            type="submit" disabled={ocupado || !senha}
            className="transicao h-9 rounded-lg bg-accent px-4 text-[12px] font-bold tracking-wide text-accentInk hover:brightness-110 disabled:opacity-40"
          >
            {ocupado ? "ABRINDO…" : "DESTRANCAR"}
          </button>
        </form>
      </Moldura>
    );
  }

  return estado.editando ? (
    <FormularioCofre
      conteudo={estado.conteudo}
      ocupado={ocupado}
      aoSalvar={salvar}
      aoCancelar={() => setEstado({ ...estado, editando: false })}
    />
  ) : (
    <VistaCofre
      conteudo={estado.conteudo}
      aoEditar={() => setEstado({ ...estado, editando: true })}
      aoTrancar={trancar}
    />
  );
}

function Moldura({ children }: { children: React.ReactNode }) {
  return (
    <section className="max-w-2xl rounded-lg border border-edge bg-panel p-4">
      <h2 className="mb-2 flex items-center gap-2 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-inkDim/70">
        <IconeCadeado tamanho={13} /> Cofre
      </h2>
      {children}
    </section>
  );
}

// ------------------------------------------------------------ cofre aberto

function VistaCofre({
  conteudo,
  aoEditar,
  aoTrancar,
}: {
  conteudo: ConteudoCofre;
  aoEditar: () => void;
  aoTrancar: () => void;
}) {
  const [combinacao, setCombinacao] = useState("");
  const [erroChave, setErroChave] = useState("");

  async function buscar(e: React.FormEvent) {
    e.preventDefault();
    const v = buscarNaGrade(conteudo.grade, combinacao);
    if (!v) {
      setErroChave("Combinação não encontrada no cartão.");
      return;
    }
    setErroChave("");
    avisarCopia(`Chave ${combinacao.toUpperCase()}`, await copiar(v));
    setCombinacao("");
  }

  const temGrade =
    conteudo.grade?.valores.some((l) => l.some((v) => v.trim() !== "")) ?? false;

  return (
    <section className="max-w-2xl rounded-lg border border-accent/40 bg-panel p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-accent">
          <IconeCadeado tamanho={13} /> Cofre aberto
        </h2>
        <div className="flex gap-2">
          <button
            onClick={aoEditar}
            className="transicao rounded-md border border-edge px-3 py-1.5 text-[11px] font-bold tracking-wide text-inkDim hover:bg-panelHover hover:text-ink"
          >
            EDITAR
          </button>
          <button
            onClick={aoTrancar}
            className="transicao rounded-md border border-edge px-3 py-1.5 text-[11px] font-bold tracking-wide text-inkDim hover:bg-panelHover hover:text-ink"
          >
            TRANCAR
          </button>
        </div>
      </div>

      {conteudo.credenciais.length === 0 && !temGrade && (
        <p className="text-[11px] text-inkDim">Cofre vazio. Use EDITAR para preencher.</p>
      )}

      <div className="space-y-2">
        {conteudo.credenciais.map((c) => (
          <LinhaCredencial key={c.id} credencial={c} />
        ))}
      </div>

      {temGrade && (
        <form onSubmit={buscar} className="mt-4 border-t border-edge pt-3">
          <label
            htmlFor="combinacao"
            className="mb-1.5 block font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-inkDim/70"
          >
            Chave dinâmica
          </label>
          <div className="flex gap-2">
            <input
              id="combinacao"
              value={combinacao}
              onChange={(e) => { setCombinacao(e.target.value); setErroChave(""); }}
              placeholder="Ex.: 3A"
              maxLength={4}
              autoComplete="off"
              className="h-9 w-24 rounded-lg border border-edge bg-base px-3 text-center font-mono text-[13px] uppercase tracking-widest text-ink outline-none focus:border-accent"
            />
            <button
              type="submit"
              disabled={combinacao.length < 2}
              className="transicao flex h-9 items-center gap-1.5 rounded-lg bg-accent px-4 text-[11px] font-bold tracking-wide text-accentInk hover:brightness-110 disabled:opacity-40"
            >
              <IconeCopiar tamanho={14} /> COPIAR
            </button>
          </div>
          {erroChave && <p role="alert" className="mt-1.5 text-[11px] text-danger">{erroChave}</p>}
          <p className="mt-1.5 text-[10px] text-inkDim/70">
            O valor vai direto para a área de transferência e nunca aparece na tela.
          </p>
        </form>
      )}
    </section>
  );
}

function LinhaCredencial({ credencial }: { credencial: Credencial }) {
  const [revelada, setRevelada] = useState(false);

  return (
    <div className="rounded-lg border border-edge bg-base px-3 py-2.5">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="truncate text-[12px] font-bold tracking-wide text-ink">
          {credencial.rotulo || "(sem nome)"}
        </span>
        {credencial.nota && (
          <span className="shrink-0 text-[10px] text-inkDim">{credencial.nota}</span>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {credencial.usuario && (
          <BotaoCopiar rotulo="USUÁRIO" valor={credencial.usuario} nome={`Usuário ${credencial.rotulo}`} />
        )}
        {credencial.senha && (
          <>
            <BotaoCopiar rotulo="SENHA" valor={credencial.senha} nome={`Senha ${credencial.rotulo}`} />
            <button
              onClick={() => setRevelada((v) => !v)}
              className="transicao rounded-md border border-edge px-2.5 py-1 text-[10px] font-semibold tracking-wide text-inkDim hover:bg-panelHover hover:text-ink"
            >
              {revelada ? "OCULTAR" : "VER"}
            </button>
          </>
        )}
      </div>

      {revelada && (
        <p className="mt-2 break-all rounded border border-edge bg-panel px-2 py-1.5 font-mono text-[12px] text-ink">
          {credencial.senha}
        </p>
      )}
    </div>
  );
}

function BotaoCopiar({ rotulo, valor, nome }: { rotulo: string; valor: string; nome: string }) {
  return (
    <button
      onClick={async () => avisarCopia(nome, await copiar(valor))}
      className="transicao flex items-center gap-1.5 rounded-md border border-edge px-2.5 py-1 text-[10px] font-semibold tracking-wide text-inkDim hover:bg-panelHover hover:text-accent"
    >
      <IconeCopiar tamanho={12} /> {rotulo}
    </button>
  );
}

// ------------------------------------------------------------ edição

function FormularioCofre({
  conteudo,
  ocupado,
  aoSalvar,
  aoCancelar,
}: {
  conteudo: ConteudoCofre;
  ocupado: boolean;
  aoSalvar: (c: ConteudoCofre) => void;
  aoCancelar: () => void;
}) {
  const [credenciais, setCredenciais] = useState<Credencial[]>(
    conteudo.credenciais.length ? conteudo.credenciais : [novaCredencial()],
  );
  const [grade, setGrade] = useState<Grade>(conteudo.grade ?? GRADE_PADRAO);

  function atualizar(id: string, campo: keyof Credencial, valor: string) {
    setCredenciais((cs) => cs.map((c) => (c.id === id ? { ...c, [campo]: valor } : c)));
  }

  function celula(i: number, j: number, valor: string) {
    setGrade((g) => ({
      ...g,
      valores: g.valores.map((l, y) => (y === i ? l.map((v, x) => (x === j ? valor : v)) : l)),
    }));
  }

  return (
    <section className="max-w-2xl rounded-lg border border-accent/40 bg-panel p-4">
      <h2 className="mb-3 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-accent">
        Editando o cofre
      </h2>

      <div className="space-y-3">
        {credenciais.map((c) => (
          <div key={c.id} className="rounded-lg border border-edge bg-base p-3">
            <div className="mb-2 flex gap-2">
              <input
                value={c.rotulo}
                onChange={(e) => atualizar(c.id, "rotulo", e.target.value)}
                placeholder="Nome (ex.: SISS)"
                className="h-8 min-w-0 flex-1 rounded-md border border-edge bg-panel px-2.5 text-[12px] text-ink outline-none focus:border-accent"
              />
              <button
                onClick={() => setCredenciais((cs) => cs.filter((x) => x.id !== c.id))}
                aria-label="Remover"
                className="transicao flex h-8 w-8 items-center justify-center rounded-md border border-danger/40 text-danger hover:bg-danger/10"
              >
                <IconeFechar tamanho={14} />
              </button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                value={c.usuario}
                onChange={(e) => atualizar(c.id, "usuario", e.target.value)}
                placeholder="Usuário"
                autoComplete="off"
                className="h-8 rounded-md border border-edge bg-panel px-2.5 text-[12px] text-ink outline-none focus:border-accent"
              />
              <input
                type="password"
                value={c.senha}
                onChange={(e) => atualizar(c.id, "senha", e.target.value)}
                placeholder="Senha"
                autoComplete="new-password"
                className="h-8 rounded-md border border-edge bg-panel px-2.5 text-[12px] text-ink outline-none focus:border-accent"
              />
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => setCredenciais((cs) => [...cs, novaCredencial()])}
        className="transicao mt-2 flex items-center gap-1.5 rounded-md border border-edge px-3 py-1.5 text-[11px] font-bold tracking-wide text-inkDim hover:bg-panelHover hover:text-ink"
      >
        <IconeMais tamanho={13} /> CREDENCIAL
      </button>

      <div className="mt-5 border-t border-edge pt-3">
        <h3 className="mb-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-inkDim/70">
          Cartão de chave dinâmica
        </h3>
        <p className="mb-2.5 text-[10px] leading-relaxed text-inkDim">
          Transcreva o cartão. Deixe em branco se preferir manter o cartão só no papel — é a
          opção mais segura, já que ele é o seu segundo fator.
        </p>
        <div className="inline-block overflow-x-auto">
          <table className="border-collapse">
            <tbody>
              <tr>
                <td />
                {grade.colunas.map((c) => (
                  <td key={c} className="px-1 pb-1 text-center font-mono text-[10px] text-inkDim">
                    {c}
                  </td>
                ))}
              </tr>
              {grade.linhas.map((l, i) => (
                <tr key={l}>
                  <td className="pr-1.5 text-right font-mono text-[10px] text-inkDim">{l}</td>
                  {grade.colunas.map((_, j) => (
                    <td key={j} className="p-0.5">
                      <input
                        value={grade.valores[i][j]}
                        onChange={(e) => celula(i, j, e.target.value)}
                        maxLength={4}
                        aria-label={`Célula ${l}${grade.colunas[j]}`}
                        autoComplete="off"
                        className="h-9 w-12 rounded-md border border-edge bg-base text-center font-mono text-[13px] text-ink outline-none focus:border-accent"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 flex gap-2 border-t border-edge pt-3">
        <button
          onClick={() =>
            aoSalvar({
              versao: 1,
              credenciais: credenciais.filter((c) => c.rotulo.trim() || c.senha || c.usuario),
              grade,
            })
          }
          disabled={ocupado}
          className="transicao rounded-lg bg-accent px-5 py-2 text-[12px] font-bold tracking-wide text-accentInk hover:brightness-110 disabled:opacity-40"
        >
          {ocupado ? "CIFRANDO…" : "SALVAR"}
        </button>
        <button
          onClick={aoCancelar}
          className="transicao rounded-md border border-edge px-4 py-2 text-[12px] font-bold tracking-wide text-inkDim hover:bg-panelHover hover:text-ink"
        >
          CANCELAR
        </button>
        <button
          onClick={() => {
            apagarCofre();
            location.reload();
          }}
          className="transicao ml-auto rounded-md border border-danger/50 px-3 py-2 text-[11px] font-bold tracking-wide text-danger hover:bg-danger/10"
        >
          APAGAR COFRE
        </button>
      </div>
    </section>
  );
}
