export type CategoriaSlug =
  | "anamnese"
  | "exame-fisico"
  | "cid"
  | "condutas"
  | "reavaliacao"
  | "receitas"
  | "prescricoes"
  | "farmacos"
  | "encaminhamento"
  | "notas";

export interface Categoria {
  slug: CategoriaSlug;
  label: string;
  sigla: string;
  total: number;
}

export interface Snippet {
  id: string;
  categoria: CategoriaSlug;
  nome: string;
  texto: string;
  ordem: number;
  /** Preenchido só quando o snippet veio do Supabase (editado pelo usuário). */
  atualizadoEm?: string;
}
