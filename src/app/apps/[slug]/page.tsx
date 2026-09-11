import { notFound } from "next/navigation";
import { CALCULADORAS, acharCalculadora } from "@/lib/calculadoras";
import { Calculadora } from "@/components/Calculadora";

export function generateStaticParams() {
  return CALCULADORAS.map((c) => ({ slug: c.slug }));
}

export default async function Pagina({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // A definição do escore carrega funções (laudo/resumo), que não atravessam a
  // fronteira servidor→cliente. Passa só o slug; o componente resolve o resto.
  if (!acharCalculadora(slug)) notFound();
  return <Calculadora slug={slug} />;
}
