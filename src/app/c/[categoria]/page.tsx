import { notFound } from "next/navigation";
import { CATEGORIAS } from "@/data/snippets";
import { ListaSnippets } from "@/components/ListaSnippets";

export function generateStaticParams() {
  return CATEGORIAS.map((c) => ({ categoria: c.slug }));
}

export default async function Pagina({ params }: { params: Promise<{ categoria: string }> }) {
  const { categoria } = await params;
  const cat = CATEGORIAS.find((c) => c.slug === categoria);
  if (!cat) notFound();

  // A lista lê os textos do repositório no cliente, para enxergar o que você
  // criou ou editou. Aqui só passa qual categoria é.
  return <ListaSnippets slug={cat.slug} titulo={cat.label} />;
}
