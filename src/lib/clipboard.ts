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

/**
 * Imagem para a área de transferência — no computador, é o Ctrl V no
 * WhatsApp Web. Sem fallback: o truque do <textarea> só copia texto.
 */
export async function copiarImagem(imagem: Blob): Promise<boolean> {
  try {
    if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined" || !window.isSecureContext) {
      return false;
    }
    await navigator.clipboard.write([new ClipboardItem({ [imagem.type]: imagem })]);
    return true;
  } catch {
    return false;
  }
}

/** Busca sem acento e sem caixa — "cefaleia" acha "CEFALÉIA". */
export function normalizar(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}
