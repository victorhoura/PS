import { Suspense } from "react";
import { FormularioEntrada } from "./FormularioEntrada";

/**
 * Renderizada a cada requisição, não no build: PS_SENHA é lida em tempo de
 * execução. Prerenderizada, a página congelava o estado "sem senha" do build
 * e nunca mostrava o formulário.
 */
export const dynamic = "force-dynamic";

export default function Entrar() {
  return (
    <Suspense>
      <FormularioEntrada semSenhaConfigurada={!process.env.PS_SENHA} />
    </Suspense>
  );
}
