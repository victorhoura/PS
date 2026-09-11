/**
 * Copiar é a operação central do app: quase todo clique termina aqui.
 * O caminho moderno exige contexto seguro (HTTPS), que temos em produção;
 * o fallback cobre navegador antigo e o caso de a permissão ser negada.
 */
export async function copiar(texto: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(texto);
      return true;
    }
  } catch {
    // cai no fallback
  }

  try {
    const ta = document.createElement("textarea");
    ta.value = texto;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/** Busca sem acento e sem caixa — "cefaleia" acha "CEFALÉIA". */
export function normalizar(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}
