/**
 * Os tópicos de CONFIGURAÇÕES que têm página própria.
 *
 * Mora fora da página porque a moldura também precisa dele: a engrenagem
 * fica acesa em qualquer um destes, que são parte de CONFIGURAÇÕES — sem
 * isso, abrir o BACKUP apagava a engrenagem e parecia outra seção do app.
 */
export const TOPICOS_CONFIGURACOES = [
  {
    href: "/seguranca",
    nome: "SEGURANÇA",
    nota: "Trocar a senha do app e configurar o código do autenticador.",
  },
  {
    href: "/backup",
    nome: "BACKUP",
    nota: "Baixar uma cópia dos seus textos, ou restaurar a partir de uma.",
  },
  {
    href: "/baixar",
    nome: "DOWNLOAD",
    nota: "O app para usar em computador do hospital sem deixar rastro nele.",
  },
] as const;

export function emConfiguracoes(pathname: string): boolean {
  return pathname === "/configuracoes" || TOPICOS_CONFIGURACOES.some((t) => t.href === pathname);
}
