"use client";

import { useEffect, useId, useRef, useState } from "react";
import { normalizar } from "@/lib/clipboard";
import { IconeCheck, IconeSeta } from "./Icones";

export interface OpcaoSeletor {
  valor: string;
  texto: string;
  /** Linha de separação antes dela, e texto no acento: "+ criar um grupo novo…". */
  separada?: boolean;
  /** Marca curta à direita — o número do turno em que um nome já está. */
  selo?: string;
  /** O que o selo quer dizer, para o leitor de tela: "já no turno 2". */
  seloDescricao?: string;
}

/**
 * Lista de escolha desenhada pelo app, no lugar do <select> do navegador.
 *
 * A lista aberta de um <select> não é da página: é do sistema. Vinha com o
 * azul do Windows e a fonte do sistema, e com a largura do texto mais longo —
 * no painel lateral do Chrome ela passava para fora do app, por cima do
 * prontuário. Nenhum CSS alcança essa lista. Esta aqui é da página: tem a
 * largura do campo, o desenho das outras listas do app e o tom do acento na
 * opção escolhida, em qualquer largura de janela.
 *
 * O teclado é o do <select>: setas, Home/End, Enter ou espaço para escolher,
 * Esc para fechar sem mudar nada, e digitar o começo de um nome pula até ele.
 * Sair do campo (Tab, clique fora) fecha sem escolher — escolher um modelo
 * preenche o formulário, e isso nunca pode acontecer por acidente.
 */
export function Seletor({
  id,
  valor,
  opcoes,
  aoMudar,
  rotulo,
  vazio,
  className = "",
}: {
  id?: string;
  /** "" quando nada está escolhido. */
  valor: string;
  opcoes: OpcaoSeletor[];
  aoMudar: (valor: string) => void;
  /** Nome para o leitor de tela, quando não há <label> apontando para `id`. */
  rotulo?: string;
  /** O que aparece no campo enquanto nada está escolhido. */
  vazio: string;
  className?: string;
}) {
  const { gatilho, lista, aberto } = useListaSuspensa({ valor, opcoes, aoEscolher: aoMudar, rotulo });
  const escolhida = opcoes.find((o) => o.valor === valor);

  return (
    <div className={`relative min-w-0 ${className}`}>
      <button
        {...gatilho}
        id={id}
        aria-label={rotulo}
        disabled={!opcoes.length}
        className="campo flex cursor-pointer items-center gap-2 text-left disabled:cursor-default aria-expanded:border-accent/80 aria-expanded:shadow-[0_0_0_2px_rgb(var(--accent)/0.16)]"
      >
        <span className={`min-w-0 flex-1 truncate ${escolhida ? "text-ink" : "text-inkDim/70"}`}>
          {escolhida?.texto ?? vazio}
        </span>
        <IconeSeta aberto={aberto} tamanho={14} className="text-inkDim" />
      </button>
      {lista}
    </div>
  );
}

/**
 * A mesma lista, aberta por um botão pequeno em vez do campo inteiro — o +
 * no canto de cada nome da Divisão de Plantão. A lista abre com a largura de
 * `ancora` (o campo onde o botão mora), e não com a do botão, que tem 28px.
 */
export function BotaoDeLista({
  valor,
  opcoes,
  aoEscolher,
  rotulo,
  ancora,
  disabled,
  className = "",
  children,
}: {
  valor: string;
  opcoes: OpcaoSeletor[];
  aoEscolher: (valor: string) => void;
  rotulo: string;
  ancora: React.RefObject<HTMLElement | null>;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const { gatilho, lista } = useListaSuspensa({ valor, opcoes, aoEscolher, rotulo, ancora });
  return (
    <>
      <button {...gatilho} aria-label={rotulo} title={rotulo} disabled={disabled} className={className}>
        {children}
      </button>
      {lista}
    </>
  );
}

/**
 * O comportamento da lista, separado de quem a abre: o Seletor abre pelo
 * campo inteiro, o BotaoDeLista por um ícone. O foco fica sempre no botão
 * que abriu — é nele que o teclado continua funcionando.
 */
function useListaSuspensa({
  valor,
  opcoes,
  aoEscolher,
  rotulo,
  ancora,
}: {
  valor: string;
  opcoes: OpcaoSeletor[];
  aoEscolher: (valor: string) => void;
  rotulo?: string;
  /** De onde a lista mede posição e largura; sem ela, do próprio botão. */
  ancora?: React.RefObject<HTMLElement | null>;
}) {
  const idLista = useId();
  const botao = useRef<HTMLButtonElement>(null);
  const lista = useRef<HTMLUListElement>(null);
  const [aberto, setAberto] = useState(false);
  const [ativo, setAtivo] = useState(-1);
  const [lugar, setLugar] = useState<React.CSSProperties>({});
  const busca = useRef({ texto: "", ate: 0 });

  const idOpcao = (i: number) => `${idLista}-op${i}`;

  /**
   * A lista é `fixed`, medida a partir do campo: assim nenhum pai com rolagem
   * a recorta (a janela de link rola por dentro). Abre para cima quando não
   * cabe embaixo.
   */
  function abrir(indice?: number) {
    const alvo = ancora?.current ?? botao.current;
    if (!alvo || !opcoes.length) return;
    const r = alvo.getBoundingClientRect();
    const abaixo = window.innerHeight - r.bottom - 8;
    const acima = r.top - 8;
    const paraCima = abaixo < 220 && acima > abaixo;
    const altura = Math.max(120, Math.min(288, (paraCima ? acima : abaixo) - 4));
    setLugar({
      position: "fixed",
      left: r.left,
      width: r.width,
      maxHeight: altura,
      ...(paraCima ? { bottom: window.innerHeight - r.top + 4 } : { top: r.bottom + 4 }),
    });
    const atual = opcoes.findIndex((o) => o.valor === valor);
    setAtivo(indice ?? (atual >= 0 ? atual : 0));
    setAberto(true);
  }

  function escolher(i: number) {
    const o = opcoes[i];
    setAberto(false);
    if (o) aoEscolher(o.valor);
  }

  // A opção ativa sempre à vista, inclusive andando pelas setas.
  useEffect(() => {
    if (aberto && ativo >= 0) {
      document.getElementById(`${idLista}-op${ativo}`)?.scrollIntoView({ block: "nearest" });
    }
  }, [aberto, ativo, idLista]);

  // Presa à tela, a lista fecha se a página rolar ou a janela mudar de
  // tamanho — senão ficaria parada enquanto o campo sai de baixo dela.
  useEffect(() => {
    if (!aberto) return;
    const aoRolar = (e: Event) => {
      if (lista.current?.contains(e.target as Node)) return;
      setAberto(false);
    };
    const aoRedimensionar = () => setAberto(false);
    window.addEventListener("scroll", aoRolar, true);
    window.addEventListener("resize", aoRedimensionar);
    return () => {
      window.removeEventListener("scroll", aoRolar, true);
      window.removeEventListener("resize", aoRedimensionar);
    };
  }, [aberto]);

  // Tocar ou clicar fora fecha. O blur sozinho não bastava: o Safari (Mac e
  // iPhone) não dá foco a um botão tocado, e sem foco não há blur — a lista
  // ficava aberta por cima da tela até alguém escolher alguma coisa.
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: PointerEvent) => {
      const alvo = e.target as Node;
      if (lista.current?.contains(alvo) || botao.current?.contains(alvo)) return;
      setAberto(false);
    };
    document.addEventListener("pointerdown", fora, true);
    return () => document.removeEventListener("pointerdown", fora, true);
  }, [aberto]);

  function procurar(tecla: string) {
    const agora = Date.now();
    const b = busca.current;
    b.texto = (agora < b.ate ? b.texto : "") + normalizar(tecla);
    b.ate = agora + 700;
    return opcoes.findIndex((o) => normalizar(o.texto).startsWith(b.texto));
  }

  function teclas(e: React.KeyboardEvent<HTMLButtonElement>) {
    const ultimo = opcoes.length - 1;

    if (!aberto) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        abrir();
      } else if (e.key === "Home" || e.key === "End") {
        e.preventDefault();
        abrir(e.key === "Home" ? 0 : ultimo);
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const i = procurar(e.key);
        if (i >= 0) abrir(i);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setAtivo((i) => Math.min(i + 1, ultimo));
        break;
      case "ArrowUp":
        e.preventDefault();
        setAtivo((i) => Math.max(i - 1, 0));
        break;
      case "Home":
        e.preventDefault();
        setAtivo(0);
        break;
      case "End":
        e.preventDefault();
        setAtivo(ultimo);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        escolher(ativo);
        break;
      case "Escape":
        // Fecha só a lista: sem isto o Esc seguia adiante e fechava a janela
        // de link ou voltava para o início, levando o formulário junto.
        e.preventDefault();
        e.stopPropagation();
        setAberto(false);
        break;
      case "Tab":
        setAberto(false);
        break;
      default:
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          const i = procurar(e.key);
          if (i >= 0) setAtivo(i);
        }
    }
  }

  const gatilho = {
    ref: botao,
    type: "button" as const,
    role: "combobox",
    "aria-haspopup": "listbox" as const,
    "aria-expanded": aberto,
    "aria-controls": aberto ? idLista : undefined,
    "aria-activedescendant": aberto && ativo >= 0 ? idOpcao(ativo) : undefined,
    onClick: () => (aberto ? setAberto(false) : abrir()),
    onKeyDown: teclas,
    onBlur: () => setAberto(false),
  };

  const elemento = aberto ? (
    <ul
      ref={lista}
      id={idLista}
      role="listbox"
      aria-label={rotulo}
      style={lugar}
      // Clicar na lista não pode tirar o foco do campo: é por ele que o
      // teclado continua funcionando, e o foco saindo fecha a lista.
      onMouseDown={(e) => e.preventDefault()}
      className="surgir z-[60] overflow-y-auto overscroll-contain rounded-xl border border-edge bg-panel p-1 shadow-painel"
    >
      {opcoes.map((o, i) => {
        const marcada = o.valor === valor;
        return (
          <li
            key={o.valor}
            id={idOpcao(i)}
            role="option"
            aria-selected={marcada}
            // O selo é só um número na tela; para o leitor, a frase inteira.
            aria-label={o.seloDescricao ? `${o.texto}, ${o.seloDescricao}` : undefined}
            onMouseEnter={() => setAtivo(i)}
            onClick={() => escolher(i)}
            className={`relative flex cursor-pointer items-start gap-2 rounded-lg px-2.5 py-[7px] text-[12px] leading-snug toque:py-[11px] ${
              o.separada
                ? "mt-2 before:absolute before:-top-1 before:left-1 before:right-1 before:border-t before:border-edge"
                : ""
            } ${i === ativo ? "bg-panelHover" : ""} ${
              marcada
                ? "font-semibold text-accent"
                : o.separada
                  ? "text-accent"
                  : "text-ink"
            }`}
          >
            {/* Quebra em vez de cortar: "TC DE CRÂNIO - CEFALEIA C/ RED
                FLAGS" num painel de 268px só se distingue inteiro. */}
            <span className="min-w-0 flex-1 break-words">{o.texto}</span>
            {o.selo && (
              <span
                aria-hidden="true"
                className="tabular mt-px flex h-4 min-w-[16px] shrink-0 items-center justify-center rounded-full bg-inkDim/15 px-1 text-[10px] font-semibold text-inkDim"
              >
                {o.selo}
              </span>
            )}
            {marcada && <IconeCheck tamanho={13} className="mt-px shrink-0" />}
          </li>
        );
      })}
    </ul>
  ) : null;

  return { gatilho, lista: elemento, aberto };
}
