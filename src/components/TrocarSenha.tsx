"use client";

import { useEffect, useState } from "react";
import { copiar } from "@/lib/clipboard";
import { avisarCopia } from "./AvisoCopia";
import { IconeCopiar } from "./Icones";

async function copiarSegredo(segredo: string) {
  avisarCopia("Código do autenticador", await copiar(segredo));
}

/**
 * Trocar a senha do app.
 *
 * São dois passos, e o primeiro só acontece uma vez na vida: combinar o
 * autenticador. Depois disso, trocar a senha é senha nova, confirmação e o
 * código de seis dígitos.
 *
 * Não pede a senha atual: para chegar até aqui você já entrou com ela. O que
 * o código do autenticador cobre é o outro caso — a sua sessão aberta num
 * computador do plantão, onde qualquer um que sentasse poderia trocar a senha
 * e tomar o app para si.
 */

type Estado = { temAutenticador: boolean; temSenhaPropria: boolean } | null;

export function TrocarSenha() {
  const [estado, setEstado] = useState<Estado>(null);
  const [indisponivel, setIndisponivel] = useState("");

  const [nova, setNova] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [codigo, setCodigo] = useState("");

  /** O QR e o segredo da primeira configuração, enquanto não são gravados. */
  const [preparo, setPreparo] = useState<{ segredo: string; svg: string } | null>(null);

  const [erro, setErro] = useState("");
  const [ok, setOk] = useState("");
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch("/api/senha", { cache: "no-store" });
        if (!r.ok) {
          const c = (await r.json().catch(() => ({}))) as { mensagem?: string };
          setIndisponivel(c.mensagem ?? "Não foi possível falar com o servidor.");
          return;
        }
        setEstado((await r.json()) as Estado);
      } catch {
        setIndisponivel("Não foi possível falar com o servidor.");
      }
    })();
  }, []);

  async function preparar() {
    setOcupado(true);
    setErro("");
    try {
      const r = await fetch("/api/senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao: "preparar" }),
      });
      const c = (await r.json()) as { segredo?: string; svg?: string; mensagem?: string };
      if (!r.ok || !c.segredo || !c.svg) {
        setErro(c.mensagem ?? "Não foi possível gerar o código.");
        return;
      }
      setPreparo({ segredo: c.segredo, svg: c.svg });
    } catch {
      setErro("Não foi possível falar com o servidor.");
    } finally {
      setOcupado(false);
    }
  }

  async function trocar(e: React.FormEvent) {
    e.preventDefault();
    setOcupado(true);
    setErro("");
    setOk("");
    try {
      const r = await fetch("/api/senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nova, confirmacao, codigo, segredo: preparo?.segredo }),
      });
      const c = (await r.json().catch(() => ({}))) as { mensagem?: string };
      if (!r.ok) {
        setErro(c.mensagem ?? "Não foi possível trocar a senha.");
        return;
      }
      setNova("");
      setConfirmacao("");
      setCodigo("");
      setPreparo(null);
      setEstado({ temAutenticador: true, temSenhaPropria: true });
      setOk("Senha trocada. Ela vale a partir de agora, em todos os computadores.");
    } catch {
      setErro("Não foi possível falar com o servidor.");
    } finally {
      setOcupado(false);
    }
  }

  if (indisponivel) {
    return <p className="max-w-2xl text-[11px] leading-relaxed text-danger">{indisponivel}</p>;
  }
  if (!estado) {
    return <p className="text-[11px] text-inkDim">…</p>;
  }

  const campo =
    "h-8 w-full rounded-lg border border-edge bg-base px-3 text-[13px] text-ink outline-none focus:border-accent";

  // Ainda sem autenticador: o primeiro passo é combinar um.
  if (!estado.temAutenticador && !preparo) {
    return (
      <div className="max-w-2xl">
        <p className="mb-3 text-[11px] leading-relaxed text-inkDim">
          Para trocar a senha é preciso um aplicativo autenticador no seu celular — o Google
          Authenticator ou o Authy, por exemplo. Você escaneia um QR uma única vez; depois é só o
          código de seis dígitos, pedido também para entrar e para desbloquear o app. Vale a pena que seja um app separado do que guarda as suas
          senhas: é ter os dois em lugares diferentes que faz do segundo fator um segundo fator.
        </p>
        <button
          onClick={() => void preparar()}
          disabled={ocupado}
          className="transicao h-8 rounded-lg bg-accent px-4 text-[11px] font-bold tracking-wide text-accentInk hover:brightness-110 disabled:opacity-40"
        >
          {ocupado ? "GERANDO…" : "CONFIGURAR AUTENTICADOR"}
        </button>
        {erro && <p className="mt-2 text-[11px] text-danger">{erro}</p>}
      </div>
    );
  }

  return (
    <form onSubmit={trocar} className="max-w-2xl">
      {preparo && (
        <div className="mb-4 rounded-lg border border-accent/40 bg-panel p-3">
          <p className="mb-2 text-[11px] leading-relaxed text-inkDim">
            <strong className="text-ink">Abra o autenticador no celular e escaneie de dentro
            dele</strong> — no Google Authenticator, no Authy ou no 1Password, procure por
            “escanear código QR”. Serve qualquer um: todos leem este mesmo código.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            {/* O SVG vem do nosso próprio servidor, desenhado a partir do
                segredo que ele acabou de sortear. */}
            <span
              className="inline-block h-36 w-36 shrink-0 rounded bg-white p-1.5 [&>svg]:h-full [&>svg]:w-full"
              dangerouslySetInnerHTML={{ __html: preparo.svg }}
            />
            <div className="min-w-0 flex-1">
              <span className="mb-1 block font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-inkDim">
                ou digite este código no app
              </span>
              <code className="block select-all break-all font-mono text-[11px] leading-relaxed tracking-wider text-accent">
                {preparo.segredo}
              </code>
              <button
                type="button"
                onClick={() => void copiarSegredo(preparo.segredo)}
                className="transicao mt-2 flex items-center gap-1.5 rounded-md border border-edge px-2.5 py-1 text-[10px] font-semibold tracking-wide text-inkDim hover:bg-panelHover hover:text-accent"
              >
                <IconeCopiar tamanho={12} /> COPIAR CÓDIGO
              </button>
            </div>
          </div>
          {/*
            Escanear pela câmera do iPhone abre o app Senhas numa tela de
            "Nova Senha", pedindo usuário e senha — o iOS é dono desse tipo de
            link e quer criar uma entrada para pendurar o código nela. Não é
            defeito, mas parece, e é por isso que o caminho recomendado ali em
            cima é escanear de dentro do autenticador.
          */}
          <p className="mt-3 border-t border-edge pt-2 text-[10px] leading-relaxed text-inkDim/70">
            <strong>No iPhone, pela câmera é diferente:</strong> abre o app Senhas numa tela de
            “Nova Senha” pedindo usuário e senha. Ele está criando uma entrada para guardar o
            código dentro dela — funciona, mas aí a sua senha e o segundo fator passam a morar no
            mesmo cofre, que é justamente o que o segundo fator existe para evitar. Prefira
            escanear de dentro do autenticador, ou colar o código acima nele.
          </p>
          <p className="mt-2 text-[10px] leading-relaxed text-inkDim/70">
            Guarde o código escrito num lugar seguro: é com ele que você reconfigura o autenticador
            se trocar de celular. O autenticador só fica valendo quando você concluir a troca aqui
            embaixo.
          </p>
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-inkDim">
            Senha nova
          </span>
          <input
            type="password"
            value={nova}
            onChange={(e) => { setNova(e.target.value); setErro(""); }}
            autoComplete="new-password"
            className={campo}
          />
        </label>
        <label className="block">
          <span className="mb-1 block font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-inkDim">
            Repita a senha nova
          </span>
          <input
            type="password"
            value={confirmacao}
            onChange={(e) => { setConfirmacao(e.target.value); setErro(""); }}
            autoComplete="new-password"
            className={campo}
          />
        </label>
      </div>

      <label className="mt-2 block sm:max-w-[12rem]">
        <span className="mb-1 block font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-inkDim">
          Código do autenticador
        </span>
        <input
          value={codigo}
          onChange={(e) => { setCodigo(e.target.value); setErro(""); }}
          inputMode="numeric"
          maxLength={7}
          placeholder="000000"
          autoComplete="one-time-code"
          className={`${campo} text-center font-mono tracking-[0.3em]`}
        />
      </label>

      {erro && <p role="alert" className="mt-2 text-[11px] text-danger">{erro}</p>}
      {ok && <p role="status" className="mt-2 text-[11px] text-ok">{ok}</p>}

      <button
        type="submit"
        disabled={ocupado || !nova || !confirmacao || codigo.length < 6}
        className="transicao mt-3 h-8 rounded-lg bg-accent px-4 text-[11px] font-bold tracking-wide text-accentInk hover:brightness-110 disabled:opacity-40"
      >
        {ocupado ? "TROCANDO…" : "TROCAR SENHA"}
      </button>

      <p className="mt-2 text-[10px] leading-relaxed text-inkDim/70">
        Trocar a senha derruba a sessão em todos os computadores onde o app estiver aberto,
        inclusive num pen drive esquecido na máquina do hospital. Aqui você continua dentro.
        O código do autenticador também é pedido para entrar e para desbloquear, e cada código
        vale uma vez só.
      </p>
    </form>
  );
}
