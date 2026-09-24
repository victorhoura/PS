"use client";

import { useEffect } from "react";
import {
  carregarPreferencias,
  definirPreferencia,
  inscreverPreferencias,
  preferenciasAtuais,
} from "@/lib/preferencias";
import { migrarEApagarLocal } from "@/lib/limpeza";
import { pintarTema, temaDoCookie } from "@/lib/tema";
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

  /**
   * Quem decide o tema é esta máquina; a nuvem só opina quando ela ainda não
   * tem escolha nenhuma.
   *
   * Era o contrário, e desfazia a escolha de duas formas. Clicar em CLARO
   * enquanto a leitura das preferências ainda estava em voo: a resposta
   * chegava depois e repintava de escuro, deixando a nuvem com "claro" e a
   * tela com "escuro". E trocar o tema na tela de senha: ali não há sessão
   * para gravar, então a nuvem chegava logo depois do login e desfazia.
   *
   * Agora o tema é preferência DA MÁQUINA — cada uma lembra a sua. A nuvem
   * guarda a última escolhida só para servir de padrão num computador novo,
   * e se alinha ao que esta máquina diz, o que também faz subir a escolha
   * feita na tela de senha, assim que existe sessão para gravá-la.
   */
  useEffect(() => {
    const aplicar = () => {
      const daMaquina = temaDoCookie();
      const daNuvem = preferenciasAtuais().tema;

      if (daMaquina) {
        if (daNuvem && daNuvem !== daMaquina) definirPreferencia("tema", daMaquina);
        return;
      }
      if (daNuvem) pintarTema(daNuvem);
    };
    aplicar();
    return inscreverPreferencias(aplicar);
  }, []);

  if (estado === "erro") {
    return (
      <Faixa>
        <span>
          <strong>Sem acesso à nuvem.</strong> {motivo} Seus textos e o cofre moram lá e não ficam
          guardados nesta máquina — nada se perdeu, mas o app está mostrando só a base, e editar
          fica travado até a nuvem voltar, para não gravar por cima dos seus textos.
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
      <Faixa>
        <span>
          <strong>Não salvo.</strong> {nuvem.motivo} O que você acabou de escrever está só na tela e
          some se recarregar. Verifique a conexão e edite de novo para tentar outra vez.
        </span>
      </Faixa>
    );
  }

  // Carregando não ganha faixa: ela aparecia no alto e sumia um instante
  // depois, empurrando a página para baixo e de volta. Quem mostra que os
  // textos estão chegando é o lugar onde eles vão aparecer (a lista, os
  // números do menu).
  return null;
}

/** A faixa de problema: só existe para o que precisa da sua atenção. */
function Faixa({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="status"
      className="flex items-center gap-3 border-b border-danger/40 bg-danger/10 px-4 py-1.5 text-[11px] leading-relaxed text-danger"
    >
      {children}
    </div>
  );
}
