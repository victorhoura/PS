"use client";

import { useEffect } from "react";
import { carregarPreferencias, inscreverPreferencias, preferenciasAtuais } from "@/lib/preferencias";
import { migrarEApagarLocal } from "@/lib/limpeza";
import { pintarTema } from "@/lib/tema";
import { useEstadoNuvem, useEstadoTextos } from "@/hooks/useTextos";

/**
 * A faixa que diz o que está acontecendo com a nuvem.
 *
 * Ela existe porque o app deixou de gravar qualquer coisa nesta máquina: o
 * Supabase não é mais espelho, é a única cópia. Antes, uma gravação que
 * falhasse era invisível e sem importância — o localStorage segurava. Agora
 * uma gravação que falha é uma edição que só existe na tela, e some no
 * recarregar. Por isso isto fica visível, e não num canto discreto.
 */
export function EstadoNuvem() {
  const nuvem = useEstadoNuvem();
  const { estado, motivo, recarregar } = useEstadoTextos();

  // Primeira coisa do carregamento: subir o que porventura ficou de versões
  // antigas nesta máquina e varrer o disco. Só então as preferências.
  useEffect(() => {
    void migrarEApagarLocal().then(() => carregarPreferencias());
  }, []);

  // O tema vem da nuvem; até chegar, vale o escuro do HTML.
  useEffect(() => {
    const aplicar = () => {
      const tema = preferenciasAtuais().tema;
      if (tema) pintarTema(tema);
    };
    aplicar();
    return inscreverPreferencias(aplicar);
  }, []);

  if (estado === "erro") {
    return (
      <Faixa tom="danger">
        <span>
          <strong>Sem acesso à nuvem.</strong> {motivo} Seus textos e o cofre moram lá e não ficam
          guardados nesta máquina — nada se perdeu, mas o app está mostrando só a base.
        </span>
        <button
          onClick={() => void recarregar()}
          className="transicao shrink-0 rounded border border-current px-2 py-0.5 font-bold"
        >
          TENTAR DE NOVO
        </button>
      </Faixa>
    );
  }

  if (nuvem.tipo === "erro") {
    return (
      <Faixa tom="danger">
        <span>
          <strong>Não salvo.</strong> {nuvem.motivo} O que você acabou de escrever está só na tela e
          some se recarregar. Verifique a conexão e edite de novo para tentar outra vez.
        </span>
      </Faixa>
    );
  }

  if (estado === "carregando") {
    return (
      <Faixa tom="inkDim">
        <span>Carregando seus textos da nuvem…</span>
      </Faixa>
    );
  }

  return null;
}

function Faixa({ tom, children }: { tom: "danger" | "inkDim"; children: React.ReactNode }) {
  const cor =
    tom === "danger"
      ? "border-danger/40 bg-danger/10 text-danger"
      : "border-edge bg-panel/60 text-inkDim";
  return (
    <div
      role="status"
      className={`flex items-center gap-3 border-b px-4 py-1.5 text-[11px] leading-relaxed ${cor}`}
    >
      {children}
    </div>
  );
}
