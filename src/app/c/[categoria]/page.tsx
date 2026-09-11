import { notFound } from "next/navigation";
import { CATEGORIAS, SNIPPETS } from "@/data/snippets";
import { ListaSnippets } from "@/components/ListaSnippets";

export function generateStaticParams() {
  return CATEGORIAS.map((c) => ({ categoria: c.slug }));
}

export default async function Pagina({ params }: { params: Promise<{ categoria: string }> }) {
  const { categoria } = await params;
  const cat = CATEGORIAS.find((c) => c.slug === categoria);
  if (!cat) notFound();

  const itens = SNIPPETS.filter((s) => s.categoria === cat.slug);
  return <ListaSnippets titulo={cat.label} itens={itens} />;
}
