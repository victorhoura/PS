"use client";

import { useCallback, useEffect, useState } from "react";
import { aplicarTema, lerTema, type Tema } from "@/lib/tema";

/**
 * O estado inicial é "escuro" tanto no servidor quanto na primeira renderização
 * do cliente; o valor real entra depois da montagem. É o que mantém o HTML do
 * servidor e o do cliente idênticos na hidratação.
 */
export function useTema(): { tema: Tema; alternar: () => void; montado: boolean } {
  const [tema, setTema] = useState<Tema>("escuro");
  const [montado, setMontado] = useState(false);

  useEffect(() => {
    setTema(lerTema());
    setMontado(true);
  }, []);

  /**
   * O efeito colateral fica FORA do atualizador do setTema.
   *
   * O React roda o atualizador durante a renderização, e desde que o tema
   * passou a ser gravado na nuvem o `aplicarTema` avisa os assinantes do
   * estado da nuvem — ou seja, mexia no estado de outro componente no meio da
   * renderização deste. Aqui é um manipulador de evento: ler `tema` do
   * fechamento é o valor desta renderização, que é o certo.
   */
  const alternar = useCallback(() => {
    const proximo: Tema = tema === "escuro" ? "claro" : "escuro";
    setTema(proximo);
    aplicarTema(proximo);
  }, [tema]);

  return { tema, alternar, montado };
}
