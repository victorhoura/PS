import { notFound, redirect } from "next/navigation";
import { CALCULADORAS, acharCalculadora } from "@/lib/calculadoras";

/**
 * Endereço antigo dos escores. Eles moravam em APLICATIVOS (/apps/curb-65)
 * e passaram a ter seção própria, ESCORES / CALCULADORAS (/escores/curb-65).
 * Favorito, atalho da tela de início ou link colado no grupo continuam
 * chegando: o endereço velho manda para o novo.
 *
 * As ferramentas (/apps/apac, /apps/plantao…) não passam por aqui — rota
 * fixa vence a dinâmica —, então não há lista de exceções para manter.
 */
export function generateStaticParams() {
  return CALCULADORAS.map((c) => ({ slug: c.slug }));
}

export default async function EnderecoAntigo({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!acharCalculadora(slug)) notFound();
  redirect(`/escores/${slug}`);
}
