/**
 * Acesso ao Supabase — SÓ do servidor.
 *
 * A chave de serviço ignora RLS, então ela nunca pode chegar ao navegador:
 * mora em variável de ambiente sem prefixo NEXT_PUBLIC_, e este módulo só é
 * importado por rotas de API. A porta é a sessão do app, verificada no proxy
 * antes de qualquer rota daqui rodar.
 */

const URL_SUPABASE = process.env.SUPABASE_URL;
const CHAVE_SERVICO = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TABELA = "ps_japa_estado";

export function nuvemConfigurada(): boolean {
  return Boolean(URL_SUPABASE && CHAVE_SERVICO);
}

function cabecalhos(): HeadersInit {
  return {
    apikey: CHAVE_SERVICO!,
    Authorization: `Bearer ${CHAVE_SERVICO!}`,
    "Content-Type": "application/json",
  };
}

export interface Registro {
  conteudo: unknown;
  atualizadoEm: string;
}

export async function lerRegistro(id: string): Promise<Registro | null> {
  const url = `${URL_SUPABASE}/rest/v1/${TABELA}?id=eq.${encodeURIComponent(id)}&select=conteudo,atualizado_em`;
  const r = await fetch(url, { headers: cabecalhos(), cache: "no-store" });
  if (!r.ok) throw new Error(`supabase ${r.status}`);

  const linhas = (await r.json()) as { conteudo: unknown; atualizado_em: string }[];
  const linha = linhas[0];
  return linha ? { conteudo: linha.conteudo, atualizadoEm: linha.atualizado_em } : null;
}

export async function gravarRegistro(id: string, conteudo: unknown): Promise<Registro> {
  const url = `${URL_SUPABASE}/rest/v1/${TABELA}?on_conflict=id`;
  const agora = new Date().toISOString();

  const r = await fetch(url, {
    method: "POST",
    headers: {
      ...cabecalhos(),
      // upsert: cria na primeira vez, sobrescreve depois
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify([{ id, conteudo, atualizado_em: agora }]),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`supabase ${r.status}: ${await r.text()}`);

  const linhas = (await r.json()) as { atualizado_em: string }[];
  return { conteudo, atualizadoEm: linhas[0]?.atualizado_em ?? agora };
}
