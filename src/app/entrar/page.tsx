import { Suspense } from "react";
import { lerAcesso, pedeCodigoNaEntrada } from "@/lib/acesso";
import { FormularioEntrada } from "./FormularioEntrada";

/**
 * Renderizada a cada requisição, não no build: a senha e o autenticador são
 * lidos em tempo de execução. Prerenderizada, a página congelava o estado do
 * build e nunca mostrava o que está valendo.
 */
export const dynamic = "force-dynamic";

export default async function Entrar() {
  const pedirCodigo = await pedeCodigoNaEntrada();
  // "Sem senha" só quando não há nem a da Vercel nem uma própria no banco.
  const senhaPropria = await lerAcesso().then(Boolean, () => true);
  return (
    <Suspense>
      <FormularioEntrada
        semSenhaConfigurada={!process.env.PS_SENHA && !senhaPropria}
        pedirCodigo={pedirCodigo}
      />
    </Suspense>
  );
}
