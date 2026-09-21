"use client";

/**
 * Peças de tela compartilhadas pelos geradores de laudo (APAC e SADT): o
 * bloco em grade de seis colunas, o campo com rótulo e o aviso de erro.
 */

export function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-lg border border-edge bg-panel/40 p-3">
      <legend className="px-1 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-inkDim/70">
        {titulo}
      </legend>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-6">{children}</div>
    </fieldset>
  );
}

/** Quantas das seis colunas o campo ocupa a partir de 640px. */
const COLUNAS: Record<number, string> = {
  1: "sm:col-span-1",
  2: "sm:col-span-2",
  3: "sm:col-span-3",
  4: "sm:col-span-4",
  5: "sm:col-span-5",
  6: "sm:col-span-6",
};

export function Campo({
  id,
  rotulo,
  valor,
  aoMudar,
  largura = 6,
  dica,
  erro,
  inputMode,
  autoFocus,
}: {
  /** Id do input, único na página: sem ele rótulos repetidos (QTDE., LINHA)
      dividem o mesmo id e um foca o campo do outro. */
  id: string;
  rotulo: string;
  valor: string;
  aoMudar: (v: string) => void;
  largura?: number;
  dica?: string;
  erro?: string;
  inputMode?: "numeric";
  autoFocus?: boolean;
}) {
  return (
    /*
     * Coluna flex com o campo empurrado para o fim.
     *
     * Rótulo de coluna estreita quebra em duas linhas — "CID PRINCIPAL" numa
     * coluna de um sexto —, e num empilhamento simples isso descia só aquele
     * campo, deixando a linha desalinhada. Aqui os campos terminam na mesma
     * altura, quebre o rótulo ou não.
     */
    <div className={`flex h-full flex-col ${COLUNAS[largura]}`}>
      <label
        htmlFor={id}
        className="mb-1 block font-mono text-[9px] font-bold uppercase leading-tight tracking-[0.14em] text-inkDim"
      >
        {rotulo}
        {dica && (
          <span className="ml-1.5 font-normal normal-case tracking-normal text-inkDim/60">
            {dica}
          </span>
        )}
      </label>
      <input
        id={id}
        value={valor}
        onChange={(e) => aoMudar(e.target.value)}
        inputMode={inputMode}
        autoFocus={autoFocus}
        autoComplete="off"
        spellCheck={false}
        aria-invalid={Boolean(erro)}
        className={`mt-auto h-8 w-full rounded-lg border bg-panel px-3 text-[12px] text-ink outline-none transition-colors ${
          erro ? "border-danger" : "border-edge focus:border-accent"
        }`}
      />
      {erro && <Erro texto={erro} />}
    </div>
  );
}

export function Erro({ texto }: { texto: string }) {
  return (
    <p role="alert" className="mt-1 text-[10px] text-danger">
      {texto}
    </p>
  );
}

/**
 * Campo de assinalar: os "(  )" do formulário viram botões.
 *
 * Clicar no que já está escolhido desmarca — são campos opcionais, e sem isso
 * não haveria como voltar atrás depois de marcar por engano.
 */
export function Opcoes<T extends string>({
  rotulo,
  valor,
  opcoes,
  aoMudar,
  largura = 6,
}: {
  rotulo: string;
  valor: T | "";
  opcoes: readonly { valor: T; texto: string }[];
  aoMudar: (v: T | "") => void;
  largura?: number;
}) {
  return (
    <div className={COLUNAS[largura]}>
      <span
        id={`rot-${rotulo.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
        className="mb-1 block font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-inkDim"
      >
        {rotulo}
        <span className="ml-1.5 font-normal normal-case tracking-normal text-inkDim/60">
          opcional
        </span>
      </span>
      <div
        role="group"
        aria-labelledby={`rot-${rotulo.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
        className="flex flex-wrap gap-1.5"
      >
        {opcoes.map((o) => {
          const escolhido = valor === o.valor;
          return (
            <button
              key={o.valor}
              type="button"
              aria-pressed={escolhido}
              onClick={() => aoMudar(escolhido ? "" : o.valor)}
              className={`transicao h-8 flex-1 rounded-lg border px-3 text-[11px] font-bold tracking-wide ${
                escolhido
                  ? "border-accent bg-accent/15 text-accent"
                  : "border-edge bg-panel text-inkDim hover:bg-panelHover hover:text-ink"
              }`}
            >
              {o.texto}
            </button>
          );
        })}
      </div>
    </div>
  );
}
