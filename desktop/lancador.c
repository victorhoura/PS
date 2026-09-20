/*
 * PS JAPA — lançador do pen drive.
 *
 * O mesmo trabalho do "PS JAPA.cmd", compilado: acha o Chrome ou o Edge da
 * máquina e abre o site numa janela de app, com o perfil inteiro — cookie,
 * histórico, cache — e os PDFs na pasta deste executável, ou seja, no pen
 * drive. Nada entra no navegador do computador.
 *
 * POR QUE ISTO EXISTE, TENDO O .cmd
 *
 * Faz a mesma coisa, mas é um programa: tem ícone, não pisca janela de
 * console, e passa onde a política da rede bloqueia script de lote e libera
 * executável. Onde for o contrário, o .cmd continua ali do lado.
 *
 * POR QUE ISTO EXISTE, TENDO A CASCA ELECTRON
 *
 * A casca carrega um Chromium próprio e ocupa 370 MB; isto ocupa 50 KB,
 * porque não carrega navegador nenhum — usa o que já está instalado. Em
 * troca, depende de existir Chrome ou Edge na máquina (o Edge vem no
 * Windows) e de a rede não forçar a pasta de perfil por política. Quando
 * qualquer uma das duas coisas falhar, a casca é a saída.
 *
 * Compilar:
 *   x86_64-w64-mingw32-gcc -municode -mwindows -O2 -s -o "PS JAPA.exe" lancador.c
 */

/* UNICODE e _UNICODE quem define é o -municode do compilador. */
#include <windows.h>
#include <stdio.h>
#include <wchar.h>

static const wchar_t *SITE = L"https://ps.victorhoura.com";

static void aviso(const wchar_t *texto) {
  MessageBoxW(NULL, texto, L"PS JAPA", MB_ICONWARNING | MB_OK);
}

static BOOL juntar(wchar_t *destino, size_t tam, const wchar_t *a, const wchar_t *b) {
  size_t la = wcslen(a), lb = wcslen(b);
  if (la + lb + 1 > tam) return FALSE;
  wcscpy(destino, a);
  wcscat(destino, b);
  return TRUE;
}

static BOOL ehArquivo(const wchar_t *caminho) {
  DWORD a = GetFileAttributesW(caminho);
  return a != INVALID_FILE_ATTRIBUTES && !(a & FILE_ATTRIBUTE_DIRECTORY);
}

/* A pasta onde este .exe está, com a barra final. É ela que define "o pen
   drive": tudo o que o navegador gravar vai pendurado aqui. */
static BOOL pastaDoExe(wchar_t *destino, DWORD tam) {
  DWORD n = GetModuleFileNameW(NULL, destino, tam);
  if (n == 0 || n >= tam) return FALSE;
  while (n > 0) {
    if (destino[n - 1] == L'\\') {
      destino[n] = L'\0';
      return TRUE;
    }
    n--;
  }
  return FALSE;
}

/* Chrome primeiro, Edge depois. O Edge vem com o Windows, então a última
   tentativa quase sempre existe mesmo numa máquina sem nada instalado. */
static BOOL acharNavegador(wchar_t *destino, size_t tam) {
  static const wchar_t *VARIAVEIS[] = {
      L"ProgramFiles", L"ProgramFiles(x86)", L"LocalAppData",
      L"ProgramFiles(x86)", L"ProgramFiles",
  };
  static const wchar_t *RESTOS[] = {
      L"\\Google\\Chrome\\Application\\chrome.exe",
      L"\\Google\\Chrome\\Application\\chrome.exe",
      L"\\Google\\Chrome\\Application\\chrome.exe",
      L"\\Microsoft\\Edge\\Application\\msedge.exe",
      L"\\Microsoft\\Edge\\Application\\msedge.exe",
  };

  wchar_t base[MAX_PATH];
  for (int i = 0; i < 5; i++) {
    DWORD n = GetEnvironmentVariableW(VARIAVEIS[i], base, MAX_PATH);
    if (n == 0 || n >= MAX_PATH) continue;
    if (!juntar(destino, tam, base, RESTOS[i])) continue;
    if (ehArquivo(destino)) return TRUE;
  }
  return FALSE;
}

/*
 * Na primeira vez, deixa o perfil do jeito que este uso pede: download no pen
 * drive e gerenciador de senhas desligado, para o app ter que pedir a senha
 * toda vez. Depois disso o próprio perfil lembra e este arquivo não é mais
 * tocado — inclusive se você mudar a pasta de downloads na mão.
 */
static void semearPreferencias(const wchar_t *perfil, const wchar_t *pdfs) {
  wchar_t pastaPadrao[1024], arquivo[1024];
  if (!juntar(pastaPadrao, 1024, perfil, L"\\Default")) return;
  if (!juntar(arquivo, 1024, pastaPadrao, L"\\Preferences")) return;
  if (ehArquivo(arquivo)) return;

  CreateDirectoryW(pastaPadrao, NULL);

  char utf8[1024];
  if (WideCharToMultiByte(CP_UTF8, 0, pdfs, -1, utf8, sizeof utf8, NULL, NULL) <= 0) return;

  /* JSON quer a barra invertida dobrada; o caminho do Windows vem com uma. */
  char escapado[2048];
  size_t j = 0;
  for (size_t i = 0; utf8[i] && j + 2 < sizeof escapado; i++) {
    if (utf8[i] == '\\') escapado[j++] = '\\';
    escapado[j++] = utf8[i];
  }
  escapado[j] = '\0';

  char json[4096];
  int tamanho = snprintf(json, sizeof json,
                         "{\"download\":{\"default_directory\":\"%s\","
                         "\"prompt_for_download\":false},"
                         "\"credentials_enable_service\":false,"
                         "\"credentials_enable_autosignin\":false,"
                         "\"autofill\":{\"profile_enabled\":false,"
                         "\"credit_card_enabled\":false}}",
                         escapado);
  /* Truncado seria JSON pela metade, e o Chrome descartaria o arquivo
     inteiro — melhor não gravar nada e deixar o padrão dele valer. */
  if (tamanho < 0 || (size_t)tamanho >= sizeof json) return;

  HANDLE h = CreateFileW(arquivo, GENERIC_WRITE, 0, NULL, CREATE_ALWAYS,
                         FILE_ATTRIBUTE_NORMAL, NULL);
  if (h == INVALID_HANDLE_VALUE) return;
  DWORD escrito;
  WriteFile(h, json, (DWORD)tamanho, &escrito, NULL);
  CloseHandle(h);
}

int WINAPI wWinMain(HINSTANCE inst, HINSTANCE anterior, PWSTR linhaCmd, int mostrar) {
  (void)inst;
  (void)anterior;
  (void)linhaCmd;
  (void)mostrar;

  wchar_t base[1024], perfil[1024], pdfs[1024];
  if (!pastaDoExe(base, 1024)) {
    aviso(L"Não consegui descobrir de que pasta este programa está sendo aberto.");
    return 1;
  }
  if (!juntar(perfil, 1024, base, L"dados") || !juntar(pdfs, 1024, base, L"PDFs")) {
    aviso(L"O caminho até esta pasta é longo demais.\n\n"
          L"Mova a pasta para a raiz do pen drive e tente de novo.");
    return 1;
  }

  CreateDirectoryW(perfil, NULL);
  CreateDirectoryW(pdfs, NULL);
  semearPreferencias(perfil, pdfs);

  wchar_t navegador[1024];
  if (!acharNavegador(navegador, 1024)) {
    aviso(L"Não encontrei o Chrome nem o Edge nesta máquina.\n\n"
          L"Use a pasta \"completo\", que traz o navegador junto.");
    return 1;
  }

  wchar_t linha[4096];
  int n = _snwprintf(linha, 4096,
                     L"\"%s\" --user-data-dir=\"%s\" --app=%s"
                     L" --no-first-run --no-default-browser-check",
                     navegador, perfil, SITE);
  if (n < 0) {
    aviso(L"O caminho até esta pasta é longo demais.");
    return 1;
  }
  linha[4095] = L'\0';

  STARTUPINFOW inicio = {0};
  inicio.cb = sizeof inicio;
  PROCESS_INFORMATION processo;
  if (!CreateProcessW(NULL, linha, NULL, NULL, FALSE, 0, NULL, NULL, &inicio, &processo)) {
    aviso(L"Encontrei o navegador, mas o Windows não deixou abri-lo.\n\n"
          L"Provavelmente é política da rede. Tente o \"PS JAPA.cmd\".");
    return 1;
  }
  CloseHandle(processo.hThread);
  CloseHandle(processo.hProcess);
  return 0;
}
