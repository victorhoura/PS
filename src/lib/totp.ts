/**
 * Código de seis dígitos do aplicativo autenticador (TOTP, RFC 6238).
 *
 * É o mesmo mecanismo do Google Authenticator, do Authy e do gerenciador de
 * senhas do celular: um segredo combinado uma vez, e daí em diante os dois
 * lados calculam o mesmo número a cada 30 segundos, sem trocar nada. Por
 * isso funciona no plantão — não depende de rede, de SMS nem de e-mail.
 *
 * Escrito aqui, com Web Crypto, em vez de vir de uma biblioteca: são poucas
 * linhas, é o caminho que autoriza a troca da senha do app, e uma dependência
 * a mais neste ponto é uma dependência que eu teria de auditar a cada
 * atualização. O HMAC-SHA1 é exigência do padrão — os autenticadores não
 * falam outra coisa —, e aqui ele não protege sigilo nenhum: só prova posse
 * do segredo dentro de uma janela de 30 segundos.
 */

const DIGITOS = 6;
const JANELA_SEGUNDOS = 30;

/** Alfabeto base32 do RFC 4648, que é o que os autenticadores leem. */
const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** Segredo novo, aleatório. 20 bytes é o tamanho recomendado pelo RFC 4226. */
export function novoSegredoTotp(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  return paraBase32(bytes);
}

export function paraBase32(bytes: Uint8Array): string {
  let bits = 0;
  let valor = 0;
  let saida = "";
  for (const b of bytes) {
    valor = (valor << 8) | b;
    bits += 8;
    while (bits >= 5) {
      saida += BASE32[(valor >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) saida += BASE32[(valor << (5 - bits)) & 31];
  return saida;
}

export function deBase32(texto: string): Uint8Array {
  // Quem digita o segredo na mão erra espaço, minúscula e o "=" do final.
  const limpo = texto.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let valor = 0;
  const bytes: number[] = [];
  for (const c of limpo) {
    const i = BASE32.indexOf(c);
    if (i < 0) continue;
    valor = (valor << 5) | i;
    bits += 5;
    if (bits >= 8) {
      bytes.push((valor >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return new Uint8Array(bytes);
}

/** O contador de 8 bytes, big-endian, que o padrão manda assinar. */
function contador(passo: number): Uint8Array {
  const buf = new Uint8Array(8);
  // `passo` cabe com folga em 2^53, mas não em 32 bits: os quatro bytes de
  // cima têm de ser calculados à parte, senão o código quebra em 2038.
  let alto = Math.floor(passo / 2 ** 32);
  let baixo = passo >>> 0;
  for (let i = 3; i >= 0; i--) {
    buf[i] = alto & 255;
    alto = Math.floor(alto / 256);
    buf[i + 4] = baixo & 255;
    baixo = Math.floor(baixo / 256);
  }
  return buf;
}

async function codigoDoPasso(segredo: string, passo: number): Promise<string> {
  const bruto = deBase32(segredo);
  const chave = await crypto.subtle.importKey(
    "raw",
    bruto.slice().buffer as ArrayBuffer,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const assinatura = new Uint8Array(
    await crypto.subtle.sign("HMAC", chave, contador(passo).slice().buffer as ArrayBuffer),
  );

  // Truncamento dinâmico do RFC 4226: o último nibble diz onde ler.
  const deslocamento = assinatura[assinatura.length - 1] & 0x0f;
  const numero =
    ((assinatura[deslocamento] & 0x7f) << 24) |
    (assinatura[deslocamento + 1] << 16) |
    (assinatura[deslocamento + 2] << 8) |
    assinatura[deslocamento + 3];

  return String(numero % 10 ** DIGITOS).padStart(DIGITOS, "0");
}

export function gerarCodigo(segredo: string, agora = Date.now()): Promise<string> {
  return codigoDoPasso(segredo, Math.floor(agora / 1000 / JANELA_SEGUNDOS));
}

/**
 * Confere o código digitado.
 *
 * Aceita a janela anterior e a seguinte além da atual: o relógio do celular
 * quase nunca bate com o do servidor no segundo exato, e sem essa folga o
 * código recusaria bem na virada dos 30 segundos — que é exatamente quando
 * alguém com pressa digita.
 */
export async function conferirCodigo(
  segredo: string,
  digitado: string,
  agora = Date.now(),
): Promise<boolean> {
  return (await passoDoCodigo(segredo, digitado, agora)) !== null;
}

/**
 * Como `conferirCodigo`, mas diz QUAL janela de 30 segundos o código era — ou
 * null se não confere. É o que permite recusar um código já usado: guardado
 * o passo aceito, qualquer código daquele passo ou de antes não entra mais.
 */
export async function passoDoCodigo(
  segredo: string,
  digitado: string,
  agora = Date.now(),
): Promise<number | null> {
  const limpo = digitado.replace(/\D/g, "");
  if (limpo.length !== DIGITOS) return null;

  const passo = Math.floor(agora / 1000 / JANELA_SEGUNDOS);
  for (const d of [0, -1, 1]) {
    const esperado = await codigoDoPasso(segredo, passo + d);
    // Comparação em tempo constante: não vaza por quanto tempo de resposta
    // quantos dígitos do começo estavam certos.
    let dif = 0;
    for (let i = 0; i < DIGITOS; i++) dif |= esperado.charCodeAt(i) ^ limpo.charCodeAt(i);
    if (dif === 0) return passo + d;
  }
  return null;
}

const EMISSOR = "PS JAPA";

/**
 * O endereço `otpauth://` que vira o QR code.
 *
 * O rótulo vai no formato "Emissor:conta", que é a convenção que os
 * autenticadores leem para separar o nome do serviço do nome da conta. Sem
 * os dois, a entrada aparece na lista do celular só como "PS JAPA", sem
 * dizer de onde veio — e no meio de uma lista de logins isso é ruim.
 *
 * Note que este endereço é o mesmo para qualquer autenticador: o padrão é um
 * só. O Google Authenticator, o Authy, o 1Password e o app Senhas do iPhone
 * leem exatamente este QR. Qual deles o celular abre ao escanear pela câmera
 * é escolha do sistema, não daqui.
 */
export function enderecoOtpauth(segredo: string, conta = "ps.victorhoura.com"): string {
  // As partes são codificadas separadamente para o ":" ficar literal, que é
  // como a convenção pede.
  const rotulo = `${encodeURIComponent(EMISSOR)}:${encodeURIComponent(conta)}`;
  return (
    `otpauth://totp/${rotulo}?secret=${segredo}&issuer=${encodeURIComponent(EMISSOR)}` +
    `&algorithm=SHA1&digits=${DIGITOS}&period=${JANELA_SEGUNDOS}`
  );
}
