"use client";

import Link from "next/link";
import { Secao } from "@/components/Cartao";
import { BotaoBloquear } from "@/components/BotaoBloquear";
import { IconeLua, IconeSol } from "@/components/Icones";
import { useTema } from "@/hooks/useTema";
import { TOPICOS_CONFIGURACOES } from "@/lib/configuracoes";
import { aplicarTema, type Tema } from "@/lib/tema";

/**
 * Tudo que é ajuste do app, num lugar só.
 *
 * Soltos aqui ficam só os dois de um toque: o tema e o BLOQUEAR. O resto é
 * tópico com página própria — SEGURANÇA, BACKUP e DOWNLOAD —, porque são
 * formulários e explicações que se abrem de vez em quando e, empilhados
 * nesta tela, a transformavam num corredor.
 *
 * Antes BACKUP e o DOWNLOAD (que se chamava PEN DRIVE) ficavam no menu ao
 * lado de APLICATIVOS e LINKS, que são o trabalho do plantão. Não são a
 * mesma coisa — estes aqui você abre de vez em quando, e aqueles o tempo todo.
 */

const TEMAS: { valor: Tema; nome: string; Icone: typeof IconeSol }[] = [
  { valor: "escuro", nome: "ESCURO", Icone: IconeLua },
  { valor: "claro", nome: "CLARO", Icone: IconeSol },
];

export default function Configuracoes() {
  const { tema } = useTema();

  return (
    <div className="p-3 sm:p-4 lg:px-7 lg:py-6">
      <h1 className="mb-5 titulo-pagina">CONFIGURAÇÕES</h1>

      <Secao titulo="Tema">
        <div className="inline-flex gap-0.5 rounded-lg border border-edge bg-panel p-0.5 shadow-cartao">
          {TEMAS.map(({ valor, nome, Icone }) => {
            const ativo = tema === valor;
            return (
              <button
                key={valor}
                onClick={() => aplicarTema(valor)}
                aria-pressed={ativo}
                className={`transicao flex h-7 items-center gap-2 rounded-[6px] px-3.5 text-[11px] font-semibold tracking-wide ${
                  ativo
                    ? "bg-accent/15 text-accent"
                    : "text-inkDim hover:bg-panelHover hover:text-ink"
                }`}
              >
                <Icone tamanho={14} />
                {nome}
              </button>
            );
          })}
        </div>
        <p className="mt-2 max-w-2xl text-[10px] leading-relaxed text-inkDim/70">
          O tema escolhido vale para este computador e é lembrado nele, inclusive depois de
          bloquear. Num computador novo vale o último que você escolheu em qualquer um.
        </p>
      </Secao>

      <Secao titulo="Sessão">
        <BotaoBloquear destaque />
        <p className="mt-2 max-w-2xl text-[10px] leading-relaxed text-inkDim/70">
          Tranca o app e volta para a tela de senha. Use ao levantar da mesa — o login vale 12
          horas, e é isso que a próxima pessoa a sentar herdaria.
        </p>
      </Secao>

      <Secao titulo="Mais">
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
          {TOPICOS_CONFIGURACOES.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="transicao block min-w-0 rounded-xl border border-edge bg-panel px-3 py-2 shadow-cartao hover:border-accent/50 hover:bg-panelHover"
            >
              <span className="block text-[12.5px] font-semibold text-ink">{a.nome}</span>
              <span className="mt-0.5 block text-[11px] leading-snug text-inkDim">{a.nota}</span>
            </Link>
          ))}
        </div>
      </Secao>
    </div>
  );
}
