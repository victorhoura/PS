import { Secao } from "@/components/Cartao";

/**
 * DOWNLOAD: onde pegar o app para o pen drive. O tópico se chamava PEN
 * DRIVE; o nome mudou para dizer o que se faz aqui, que é baixar.
 *
 * Os arquivos moram num Release do GitHub, de tag fixa: o endereço não muda
 * de uma compilação para a outra, então esta página aponta para lá e não
 * precisa ser reescrita a cada build. Artefato do Actions não serviria —
 * o GitHub o apaga sozinho depois de algumas semanas.
 */

const RELEASE = "https://github.com/victorhoura/PS/releases/download/executavel";

const OPCOES = [
  {
    nome: "PARA O PEN DRIVE",
    arquivo: "PS-JAPA-pendrive.zip",
    tamanho: "cerca de 50 KB",
    destaque: true,
    linhas: [
      "Comece por aqui. Abre o Chrome ou o Edge que já existe na máquina, numa janela sem barra de endereço, com o perfil e os PDFs no pen drive.",
      "Vem com o “PS JAPA.cmd” junto: faz exatamente o mesmo, em script em vez de programa, para onde executável é bloqueado e script não é.",
    ],
  },
  {
    nome: "COM NAVEGADOR PRÓPRIO",
    arquivo: "PS-JAPA-completo.zip",
    tamanho: "cerca de 160 MB, 370 MB depois de abrir",
    destaque: false,
    linhas: [
      "Só se a máquina não tiver Chrome nem Edge, ou se a rede forçar a pasta de perfil por política e o de cima não conseguir gravar no pen drive.",
      "Carrega o próprio navegador — é daí que vem o tamanho. Abre mais devagar na primeira vez.",
    ],
  },
];

export default function Baixar() {
  return (
    <div className="p-3 lg:p-4">
      <header className="mb-4">
        <h1 className="font-mono text-base font-bold tracking-[0.16em] text-ink">DOWNLOAD</h1>
        <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-inkDim">
          Para usar o app em computador do hospital sem deixar rastro nele: o cookie, o histórico,
          o cache e os PDFs ficam no pen drive, não na máquina. Precisa de internet — nenhum dos
          dois guarda cópia do app.
        </p>
      </header>

      <Secao titulo="Baixar">
        <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
          {OPCOES.map((o) => (
            <div
              key={o.arquivo}
              className={`flex flex-col rounded-lg border bg-panel p-3 ${
                o.destaque ? "border-accent/50" : "border-edge"
              }`}
            >
              <span className="text-[12px] font-bold tracking-wide text-ink">{o.nome}</span>
              <span className="mt-0.5 font-mono text-[10px] text-inkDim">{o.tamanho}</span>
              {o.linhas.map((l) => (
                <p key={l} className="mt-2 text-[11px] leading-relaxed text-inkDim">
                  {l}
                </p>
              ))}
              <a
                href={`${RELEASE}/${o.arquivo}`}
                className={`transicao mt-3 block rounded-lg px-4 py-2 text-center text-[11px] font-bold tracking-wide ${
                  o.destaque
                    ? "bg-accent text-accentInk hover:brightness-110"
                    : "border border-edge text-inkDim hover:bg-panelHover hover:text-ink"
                }`}
              >
                BAIXAR
              </a>
            </div>
          ))}
        </div>
      </Secao>

      <Secao titulo="Depois de baixar">
        <ol className="max-w-2xl list-decimal space-y-1 pl-5 text-[11px] leading-relaxed text-inkDim marker:text-inkDim/60">
          <li>Descompacte o .zip e copie a pasta inteira para o pen drive.</li>
          <li>Dê duplo clique em “PS JAPA.exe”.</li>
          <li>
            Se a política da rede ou o antivírus barrarem, tente o “PS JAPA.cmd” da mesma pasta.
          </li>
        </ol>
        <p className="mt-3 max-w-2xl text-[11px] leading-relaxed text-inkDim">
          O passo a passo completo, com o que isto resolve e o que não resolve, está no
          “LEIA-ME.txt” dentro do .zip.
        </p>
      </Secao>

      <Secao titulo="Quando baixar de novo">
        <p className="max-w-2xl text-[11px] leading-relaxed text-inkDim">
          Quase nunca. Os dois abrem este mesmo site, então toda mudança no app já vale no pen
          drive sem baixar nada. Refazer o download só é preciso quando o próprio lançador mudar —
          e o endereço acima é sempre o da versão mais nova.
        </p>
      </Secao>
    </div>
  );
}
