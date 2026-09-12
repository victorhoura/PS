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

  const alternar = useCallback(() => {
    setTema((atual) => {
      const proximo: Tema = atual === "escuro" ? "claro" : "escuro";
      aplicarTema(proximo);
      return proximo;
    });
  }, []);

  return { tema, alternar, montado };
}
