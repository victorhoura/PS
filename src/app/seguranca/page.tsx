import { Secao } from "@/components/Cartao";
import { TrocarSenha } from "@/components/TrocarSenha";

/**
 * Senha do app e o código do autenticador.
 *
 * Era uma seção de CONFIGURAÇÕES e virou tópico próprio, como BACKUP e
 * DOWNLOAD: é coisa de vez em quando, e é o formulário mais comprido de lá —
 * no meio do tema e do BLOQUEAR, empurrava o botão de trancar para baixo.
 */
export default function Seguranca() {
  return (
    <div className="p-3 lg:p-4">
      <h1 className="mb-4 font-mono text-base font-bold tracking-[0.16em] text-ink">SEGURANÇA</h1>

      <Secao titulo="Senha do app">
        <TrocarSenha />
      </Secao>
    </div>
  );
}
