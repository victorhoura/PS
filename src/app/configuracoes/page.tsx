"use client";

import Link from "next/link";
import { Secao } from "@/components/Cartao";
import { BotaoBloquear } from "@/components/BotaoBloquear";
import { TrocarSenha } from "@/components/TrocarSenha";
import { IconeLua, IconeSol } from "@/components/Icones";
import { useTema } from "@/hooks/useTema";
import { aplicarTema, type Tema } from "@/lib/tema";

/**
 * Tudo que é ajuste do app, num lugar só: tema, trancar a tela, a cópia de
 * segurança e o app do pen drive.
 *
 * Antes BACKUP e PEN DRIVE ficavam no menu ao lado de APLICATIVOS e LINKS,
 * que são o trabalho do plantão. Não são a mesma coisa — estes aqui você abre
 * de vez em quando, e aqueles o tempo todo.
 */

const TEMAS: { valor: Tema; nome: string; Icone: typeof IconeSol }[] = [
  { valor: "escuro", nome: "ESCURO", Icone: IconeLua },
  { valor: "claro", nome: "CLARO", Icone: IconeSol },
];

const ATALHOS = [
  {
    href: "/backup",
    nome: "BACKUP",
    nota: "Baixar uma cópia dos seus textos, ou restaurar a partir de uma.",
  },
  {
    href: "/baixar",
    nome: "PEN DRIVE",
    nota: "O app para usar em computador do hospital sem deixar rastro nele.",
  },
];

export default function Configuracoes() {
  const { tema } = useTema();

  return (
    <div className="p-3 lg:p-4">
      <h1 className="mb-4 font-mono text-base font-bold tracking-[0.16em] text-ink">
        CONFIGURAÇÕES
      </h1>

      <Secao titulo="Tema">
        <div className="flex gap-2">
          {TEMAS.map(({ valor, nome, Icone }) => {
            const ativo = tema === valor;
            return (
              <button
                key={valor}
                onClick={() => aplicarTema(valor)}
                aria-pressed={ativo}
                className={`transicao flex h-8 items-center gap-2 rounded-lg border px-4 text-[11px] font-bold tracking-wide ${
                  ativo
                    ? "border-accent bg-accent/15 text-accent"
                    : "border-edge bg-panel text-inkDim hover:bg-panelHover hover:text-ink"
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

      <Secao titulo="Senha do app">
        <TrocarSenha />
      </Secao>

      <Secao titulo="Sessão">
        <BotaoBloquear destaque />
        <p className="mt-2 max-w-2xl text-[10px] leading-relaxed text-inkDim/70">
          Tranca o app e volta para a tela de senha. Use ao levantar da mesa — o login vale 12
          horas, e é isso que a próxima pessoa a sentar herdaria.
        </p>
      </Secao>

      <Secao titulo="Mais">
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
          {ATALHOS.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="transicao block min-w-0 rounded-lg border border-edge bg-panel px-2.5 py-1.5 hover:border-accent/60 hover:bg-panelHover"
            >
              <span className="block text-[12px] font-bold tracking-wide text-ink">{a.nome}</span>
              <span className="mt-0.5 block text-[10px] leading-snug text-inkDim">{a.nota}</span>
            </Link>
          ))}
        </div>
      </Secao>
    </div>
  );
}
