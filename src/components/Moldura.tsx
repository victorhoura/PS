"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { emConfiguracoes } from "@/lib/configuracoes";
import { contagens } from "@/lib/repositorio";
import { useEstadoTextos, useTextos } from "@/hooks/useTextos";
import { Navegacao } from "./Navegacao";
import { PaletaComandos } from "./PaletaComandos";
import { AvisoCopia } from "./AvisoCopia";
import { RegistrarSW } from "./RegistrarSW";
import { EstadoNuvem } from "./EstadoNuvem";
import { BotaoBloquear } from "./BotaoBloquear";
import { BotaoTema } from "./BotaoTema";
import { Logo } from "./Logo";
import { IconeBusca, IconeEngrenagem, IconeFechar, IconeMenu } from "./Icones";

/**
 * Duas formas para o mesmo app:
 *
 *  - tela larga (>= 1024px): barra lateral fixa, como um app de desktop;
 *  - janela estreita: barra de topo curta e, no ☰, um menu que toma a
 *    janela inteira — numa janela de 400px uma gaveta de 240px sobre fundo
 *    escurecido só desperdiça o espaço que existe.
 */
export function Moldura({ children }: { children: React.ReactNode }) {
  const [paletaAberta, setPaletaAberta] = useState(false);
  const [gavetaAberta, setGavetaAberta] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Contagem viva: o número ao lado da categoria acompanha o que você cria
  // e apaga, em vez de repetir o total que veio do PS.py. Enquanto os seus
  // textos não chegam, não há número — o da base mudaria logo em seguida.
  const textos = useTextos();
  const { estado } = useEstadoTextos();
  const totais = estado === "carregando" ? null : contagens(textos);

  // Os listeners globais vivem fora do ciclo de render; leem o estado por ref
  // para não decidir com base num valor de uma renderização anterior.
  const paletaRef = useRef(paletaAberta);
  paletaRef.current = paletaAberta;
  const gavetaRef = useRef(gavetaAberta);
  gavetaRef.current = gavetaAberta;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletaAberta((v) => !v);
        return;
      }
      if (e.key !== "Escape") return;

      // Esc fecha o que estiver por cima antes de navegar: menu, depois
      // paleta (que trata o próprio Esc), e só então volta ao início.
      if (gavetaRef.current) {
        setGavetaAberta(false);
        return;
      }
      if (!paletaRef.current && pathname !== "/") router.push("/");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pathname, router]);

  // Trocar de página fecha o menu, inclusive quando a navegação veio da
  // paleta ou do botão voltar do navegador.
  useEffect(() => setGavetaAberta(false), [pathname]);

  // A tela de entrada é anterior ao app: sem barra lateral, sem paleta.
  if (pathname === "/entrar") return <>{children}</>;

  /**
   * "JAPA", e não "PS JAPA": o "PS" já está escrito por extenso ao lado, em
   * "Pronto socorro". Repetir a sigla e o significado no mesmo bloco gasta a
   * largura que falta numa janela estreita.
   */
  const marca = (
    <Link href="/" className="flex min-w-0 items-center gap-2 overflow-hidden">
      <Logo tamanho={20} className="hidden shrink-0 min-[230px]:block" />
      {/*
        A marca vai sumindo de trás para frente conforme a janela aperta, e a
        logo é a última a sair — ela sozinha ainda identifica o app e leva
        para o início.

        Sem isto os dois nomes não encolhiam (a logo não encolhe, e o texto
        não tem onde quebrar) e passavam POR BAIXO do botão Ctrl K, que é
        largura fixa: em vez de cortar, sobrepunha.

        Os cortes vêm de medir a barra com os quatro botões da direita
        (Ctrl K, engrenagem, tema, cadeado): o JAPA pede 74px de caixa e só
        os tem a partir de 326px de janela; abaixo de 230px nem a logo cabe.
      */}
      <span className="hidden shrink-0 text-[14px] font-bold tracking-[0.16em] text-accent min-[330px]:inline">
        JAPA
      </span>
      <span className="hidden truncate text-[10px] font-medium uppercase tracking-[0.08em] text-inkDim min-[440px]:inline">
        Pronto socorro
      </span>
    </Link>
  );

  /**
   * Abaixo de 280px o "Ctrl K" sai e fica só a lupa: com a engrenagem ao
   * lado da lua, a barra não comporta tudo, e a dica de teclado é o que
   * menos falta faz — o atalho continua valendo.
   */
  const botaoBusca = (
    <button
      onClick={() => setPaletaAberta(true)}
      aria-label="Buscar"
      className="transicao flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-edge bg-base/40 px-2.5 text-[11px] text-inkDim hover:border-accent/40 hover:text-ink toque:h-10 toque:w-10 toque:justify-center toque:px-0"
    >
      <IconeBusca tamanho={14} />
      {/* No toque não há teclado físico: a dica do atalho sai. */}
      <kbd className="hidden font-mono text-[10px] text-inkDim min-[280px]:inline toque:!hidden">Ctrl K</kbd>
    </button>
  );

  const botaoConfiguracoes = (
    <Link
      href="/configuracoes"
      aria-label="Configurações"
      title="Configurações"
      aria-current={pathname === "/configuracoes" ? "page" : undefined}
      className={`transicao flex h-8 w-8 shrink-0 items-center justify-center rounded-lg toque:h-10 toque:w-10 ${
        emConfiguracoes(pathname)
          ? "bg-accent/15 text-accent"
          : "text-inkDim hover:bg-panelHover hover:text-ink"
      }`}
    >
      <IconeEngrenagem />
    </Link>
  );

  /**
   * Engrenagem, tema e cadeado: o mesmo trio, na mesma ordem, nas duas
   * formas do app. Antes a janela estreita punha CONFIGURAÇÕES no fim do
   * menu, e o mesmo destino mudava de lugar conforme a largura.
   */
  const barraTopo = (fechando: boolean) => (
    <div className="flex items-center gap-1.5 border-b border-edge bg-panel/95 px-2 py-1.5 backdrop-blur">
      <button
        onClick={() => setGavetaAberta(!fechando)}
        aria-label={fechando ? "Fechar menu" : "Abrir menu"}
        aria-expanded={fechando}
        className="transicao flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink hover:bg-panelHover toque:h-10 toque:w-10"
      >
        {fechando ? <IconeFechar /> : <IconeMenu />}
      </button>
      <div className="min-w-0 flex-1">{marca}</div>
      {botaoBusca}
      {botaoConfiguracoes}
      <BotaoTema compacto />
      <BotaoBloquear compacto />
    </div>
  );

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <RegistrarSW />

      {/* ---------- janela estreita: barra de topo ---------- */}
      <header className="lg:hidden">{barraTopo(false)}</header>

      {/* ---------- janela estreita: menu ocupando a janela toda ---------- */}
      {gavetaAberta && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          className="esmaecer fixed inset-0 z-40 flex flex-col bg-base lg:hidden"
        >
          {/* Mesma altura da barra de topo, para abrir e fechar o menu não
              deslocar nada na tela. */}
          {barraTopo(true)}
          <div className="min-h-0 flex-1 overflow-y-auto">
            <Navegacao
              totais={totais}
              variante="cheia"
              aoNavegar={() => setGavetaAberta(false)}
            />
          </div>
        </div>
      )}

      {/* ---------- tela larga: barra lateral fixa ---------- */}
      <aside className="hidden shrink-0 border-r border-edge bg-panel lg:flex lg:h-dvh lg:w-56 lg:flex-col">
        <div className="px-4 pb-3 pt-5">
          <Link href="/" className="flex items-center gap-2.5 rounded-lg">
            <Logo tamanho={26} className="shrink-0" />
            <span className="min-w-0">
              <span className="block text-[15px] font-bold leading-none tracking-[0.16em] text-accent">
                JAPA
              </span>
              <span className="mt-1 block text-[10px] font-medium uppercase leading-none tracking-[0.08em] text-inkDim">
                Pronto socorro
              </span>
            </span>
          </Link>
          <button
            onClick={() => setPaletaAberta(true)}
            className="transicao mt-4 flex h-9 w-full items-center gap-2 rounded-lg border border-edge bg-base/40 px-3 text-[12px] text-inkDim hover:border-accent/40 hover:text-ink"
          >
            <IconeBusca tamanho={14} />
            <span>Buscar</span>
            <kbd className="ml-auto rounded border border-edge bg-panel px-1.5 py-px font-mono text-[10px] text-inkDim toque:hidden">
              Ctrl K
            </kbd>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <Navegacao totais={totais} />
        </div>

        {/*
          Rodapé em ícones, numa linha só: engrenagem, tema e cadeado.
          Em duas linhas de texto isto custava o dobro da altura para dizer o
          mesmo, e altura é o que falta quando o app roda na lateral do
          Chrome. O BLOQUEAR continua a um clique, que é o que importa numa
          máquina compartilhada — ele não foi para dentro das configurações.
        */}
        <div className="flex items-center gap-1 border-t border-edge px-3 py-2.5">
          {botaoConfiguracoes}
          <BotaoTema compacto />
          <BotaoBloquear compacto />
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col lg:h-dvh lg:overflow-y-auto">
        <EstadoNuvem />
        <div className="min-h-0 flex-1">{children}</div>
      </main>

      <PaletaComandos aberta={paletaAberta} aoFechar={() => setPaletaAberta(false)} />
      <AvisoCopia />
    </div>
  );
}
