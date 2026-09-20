/**
 * Casca de desktop do PS JAPA — o mesmo site, numa janela própria, para rodar
 * do pen drive.
 *
 * POR QUE ISTO EXISTE
 *
 * O app roda em computador de plantão, compartilhado, onde a janela anônima
 * às vezes está desligada por política da rede. Sem ela, o navegador da
 * máquina guarda histórico, cookie e cache de quem sentou antes. Esta casca
 * carrega o mesmo site, mas com o perfil inteiro — cookie, cache, histórico —
 * e os PDFs gerados na pasta do próprio executável, ou seja, no pen drive.
 *
 * O QUE ELA NÃO É
 *
 * Não é uma cópia do app. É o site de sempre, carregado da rede: sem internet
 * não abre, e não há nada aqui para atualizar quando o site muda. Também não
 * apaga o registro que o Windows faz por conta própria de qualquer programa
 * executado e de qualquer disco removível plugado — isso não está ao alcance
 * de nenhum programa.
 */

const { app, BrowserWindow, session, shell } = require("electron");
const path = require("node:path");
const fs = require("node:fs");

const SITE = "https://ps.victorhoura.com";
const ORIGEM = new URL(SITE).origin;

/**
 * A pasta onde o .exe está de verdade.
 *
 * Empacotadores que geram um executável único descompactam o programa no
 * %TEMP% da máquina e avisam por esta variável onde o arquivo original está.
 * Sem consultá-la, o perfil iria parar no disco do computador — exatamente o
 * rastro que esta casca existe para não deixar.
 */
function pastaDoExecutavel() {
  if (process.env.PORTABLE_EXECUTABLE_DIR) return process.env.PORTABLE_EXECUTABLE_DIR;
  if (app.isPackaged) return path.dirname(app.getPath("exe"));
  return __dirname;
}

const BASE = pastaDoExecutavel();
const PERFIL = path.join(BASE, "dados");
const PDFS = path.join(BASE, "PDFs");

// As pastas precisam existir antes de serem apontadas.
fs.mkdirSync(PERFIL, { recursive: true });
fs.mkdirSync(PDFS, { recursive: true });

/**
 * Tem que ser antes do app ficar pronto: depois disso o Electron já abriu o
 * perfil no lugar padrão, que é a pasta do usuário da máquina.
 *
 * "downloads" é redundante com o `will-download` mais abaixo, e é de
 * propósito: o PDF da APAC leva nome de paciente, e é a única coisa aqui que
 * sobrevive ao fechar a janela. Se um caminho de download escapar do
 * manipulador, o padrão ainda é o pen drive — não a pasta Downloads da
 * máquina.
 */
app.setPath("userData", PERFIL);
app.setPath("sessionData", PERFIL);
app.setPath("downloads", PDFS);

/** Duas janelas sobre o mesmo perfil brigam pelo arquivo de sessão. */
if (!app.requestSingleInstanceLock()) app.quit();

function doSite(url) {
  try {
    return new URL(url).origin === ORIGEM;
  } catch {
    return false;
  }
}

/** Não sobrescreve um PDF já gerado: "APAC (2).pdf" em vez de perder o primeiro. */
function caminhoLivre(nome) {
  const ext = path.extname(nome);
  const base = path.basename(nome, ext);
  let tentativa = path.join(PDFS, nome);
  for (let i = 2; fs.existsSync(tentativa); i++) {
    tentativa = path.join(PDFS, `${base} (${i})${ext}`);
  }
  return tentativa;
}

function criarJanela() {
  const janela = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    title: "PS JAPA",
    // A mesma cor de fundo do app, para não piscar branco enquanto carrega.
    backgroundColor: "#0b0f14",
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });

  janela.loadURL(SITE);

  /**
   * Só o site abre aqui dentro. Link para fora vai para o navegador da
   * máquina: numa janela sem barra de endereço você não teria como ver para
   * onde foi parar.
   */
  janela.webContents.setWindowOpenHandler(({ url }) => {
    if (!doSite(url)) void shell.openExternal(url);
    return { action: "deny" };
  });

  janela.webContents.on("will-navigate", (evento, url) => {
    if (doSite(url)) return;
    evento.preventDefault();
    void shell.openExternal(url);
  });

  janela.webContents.on("did-fail-load", (_evento, codigo, _descricao, _url, principal) => {
    // -3 é navegação cancelada, não falha de rede.
    if (!principal || codigo === -3) return;
    void janela.loadFile(path.join(__dirname, "sem-rede.html"));
  });

  return janela;
}

app.whenReady().then(() => {
  fs.mkdirSync(PDFS, { recursive: true });

  // O PDF da APAC e da SADT nasce no pen drive, sem passar pela pasta de
  // downloads da máquina nem perguntar onde salvar.
  session.defaultSession.on("will-download", (_evento, item) => {
    item.setSavePath(caminhoLivre(item.getFilename()));
  });

  criarJanela();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) criarJanela();
  });
});

app.on("second-instance", () => {
  const [janela] = BrowserWindow.getAllWindows();
  if (!janela) return;
  if (janela.isMinimized()) janela.restore();
  janela.focus();
});

app.on("window-all-closed", () => app.quit());
