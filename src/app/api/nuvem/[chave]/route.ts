import { NextResponse } from "next/server";
import { lerRegistro, gravarRegistro, nuvemConfigurada } from "@/lib/supabase";

/**
 * Estado do app na nuvem. O proxy já garantiu que só entra quem tem sessão.
 *
 * O cofre sobe CIFRADO: o que chega aqui é o blob que o navegador produziu,
 * e nem esta rota nem o Supabase têm como lê-lo. A senha-mestra não sai do
 * navegador.
 */

const CHAVES = new Set(["cofre", "textos", "preferencias", "contador"]);

/** Guarda contra um cliente confuso encher o banco. */
const LIMITE_BYTES = 512 * 1024;

function validar(chave: string) {
  if (!CHAVES.has(chave)) {
    return NextResponse.json({ erro: "chave_desconhecida" }, { status: 404 });
  }
  if (!nuvemConfigurada()) {
    return NextResponse.json({ erro: "nuvem_nao_configurada" }, { status: 503 });
  }
  return null;
}

export async function GET(_req: Request, ctx: { params: Promise<{ chave: string }> }) {
  const { chave } = await ctx.params;
  const problema = validar(chave);
  if (problema) return problema;

  try {
    const registro = await lerRegistro(chave);
    return NextResponse.json(registro ?? { conteudo: null, atualizadoEm: null });
  } catch {
    return NextResponse.json({ erro: "falha_ao_ler" }, { status: 502 });
  }
}

export async function PUT(req: Request, ctx: { params: Promise<{ chave: string }> }) {
  const { chave } = await ctx.params;
  const problema = validar(chave);
  if (problema) return problema;

  let corpo: string;
  try {
    corpo = await req.text();
  } catch {
    return NextResponse.json({ erro: "corpo_invalido" }, { status: 400 });
  }

  if (corpo.length > LIMITE_BYTES) {
    return NextResponse.json({ erro: "grande_demais" }, { status: 413 });
  }

  let conteudo: unknown;
  try {
    conteudo = (JSON.parse(corpo) as { conteudo: unknown }).conteudo;
  } catch {
    return NextResponse.json({ erro: "json_invalido" }, { status: 400 });
  }
  if (conteudo === undefined) {
    return NextResponse.json({ erro: "sem_conteudo" }, { status: 400 });
  }

  try {
    return NextResponse.json(await gravarRegistro(chave, conteudo));
  } catch {
    return NextResponse.json({ erro: "falha_ao_gravar" }, { status: 502 });
  }
}
