"use client";

import { Navegacao } from "@/components/Navegacao";
import { contagens } from "@/lib/repositorio";
import { useEstadoTextos, useTextos } from "@/hooks/useTextos";

/**
 * A tela inicial é o menu principal — o mesmo da barra lateral, com a mesma
 * peça desenhando os dois.
 *
 * Antes ela era um catálogo à parte: cartões das categorias, dos 21 escores e
 * das ferramentas. Era um segundo menu, diferente do primeiro, para os mesmos
 * destinos — e o menu de verdade é a barra. Escores e ferramentas continuam a
 * um toque, em APLICATIVOS, e em qualquer lugar pelo Ctrl K.
 */
export default function Home() {
  const textos = useTextos();
  const { estado } = useEstadoTextos();
  // Sem número enquanto os seus textos chegam: o da base mudaria na sua frente.
  const totais = estado === "carregando" ? null : contagens(textos);

  return (
    <>
      <h1 className="sr-only">Menu principal</h1>
      <Navegacao totais={totais} variante="cheia" />
    </>
  );
}
