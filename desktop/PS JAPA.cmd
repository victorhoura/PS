@echo off
rem ======================================================================
rem  PS JAPA - abre o site numa janela propria, com TUDO no pen drive.
rem
rem  Nao instala nada e nao e um programa: usa o Chrome (ou o Edge) que ja
rem  existe na maquina, mas manda o perfil inteiro - cookie, historico,
rem  cache - para a pasta "dados" aqui do lado, e os PDFs para a pasta
rem  "PDFs". Nada do que voce fizer entra no navegador do computador.
rem
rem  Funciona onde a janela anonima esta desligada por politica da rede,
rem  porque isto nao e janela anonima: e um perfil separado, que por acaso
rem  mora no pen drive.
rem ======================================================================
setlocal EnableExtensions

set "BASE=%~dp0"
set "PERFIL=%BASE%dados"
set "PDFS=%BASE%PDFs"

if not exist "%PDFS%" mkdir "%PDFS%"

rem O nome da variavel de Program Files de 32 bits tem parenteses, e
rem parentese quebra o "for" logo abaixo. Por isso e copiada aqui antes.
set "PF=%ProgramFiles%"
set "PF86=%ProgramFiles(x86)%"

set "NAVEGADOR="
for %%C in (
  "%PF%\Google\Chrome\Application\chrome.exe"
  "%PF86%\Google\Chrome\Application\chrome.exe"
  "%LocalAppData%\Google\Chrome\Application\chrome.exe"
  "%PF86%\Microsoft\Edge\Application\msedge.exe"
  "%PF%\Microsoft\Edge\Application\msedge.exe"
) do if not defined NAVEGADOR if exist %%C set "NAVEGADOR=%%~C"

if not defined NAVEGADOR (
  echo.
  echo   Nao encontrei o Chrome nem o Edge nesta maquina.
  echo   Tente abrir o "PS JAPA.exe" que esta nesta mesma pasta.
  echo.
  pause
  exit /b 1
)

rem Na primeira vez ja deixa os downloads apontados para o pen drive, para o
rem navegador nao salvar o PDF na pasta Downloads da maquina. Depois disso o
rem proprio perfil lembra, e este arquivo nao e mais tocado.
if not exist "%PERFIL%\Default\Preferences" (
  mkdir "%PERFIL%\Default" 2>nul
  set "DESTINO=%PDFS:\=\\%"
  call :gravar_preferencias
)

start "" "%NAVEGADOR%" --user-data-dir="%PERFIL%" --app=https://ps.victorhoura.com --no-first-run --no-default-browser-check
exit /b 0

rem Subrotina porque dentro de um bloco "if (...)" o %DESTINO% seria lido
rem antes de existir - o cmd expande a linha toda de uma vez, na leitura.
:gravar_preferencias
> "%PERFIL%\Default\Preferences" echo {"download":{"default_directory":"%DESTINO%","prompt_for_download":false}}
exit /b 0
