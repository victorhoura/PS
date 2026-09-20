# Casca de desktop

O PS JAPA roda em computador de plantão, compartilhado, onde a janela anônima
às vezes está desligada por política da rede. Sem ela, o navegador da máquina
guarda cookie, histórico e cache de quem sentou antes — e o PDF da APAC, com
nome de paciente, cai na pasta Downloads.

Esta pasta resolve isso levando o perfil e os PDFs para o pen drive. São três
formas de abrir o **mesmo site**, porque numa máquina com restrição não dá para
saber de antemão qual vai passar:

| | o que é | tamanho | quando serve |
|---|---|---|---|
| `PS JAPA.exe` | lançador nativo (`lancador.c`): acha o Chrome/Edge da máquina e abre com `--user-data-dir` no pen drive | 43 KB | o padrão — o Edge vem no Windows, então há sempre um navegador para usar |
| `PS JAPA.cmd` | o mesmo, em script | 2 KB | onde executável é bloqueado e script não é |
| casca Electron (`main.js`) | janela própria, com um Chromium embutido | 370 MB | sem Chrome nem Edge, ou quando a política da rede força a pasta de perfil e as outras duas não conseguem isolar |

Nenhuma das três é cópia do app: todas carregam `ps.victorhoura.com` da rede.
Não há o que atualizar no pen drive quando o site muda.

A ordem importa. As duas primeiras não carregam navegador porque **já existe um
na máquina**, e um navegador instalado é um navegador que a TI já aprovou. A
casca só ganha quando a premissa das outras duas cai.

## Gerar

Quem monta é o workflow `.github/workflows/executavel.yml`, a cada push que
toque em `desktop/`, ou à mão em **Actions → Executável do pen drive → Run
workflow**. Saem dois artefatos separados de propósito — `PS-JAPA-pendrive`
(~50 KB) e `PS-JAPA-completo` (370 MB) — porque baixar 370 MB para usar 50 KB
é o caminho errado por padrão.

Localmente:

```sh
cd desktop
x86_64-w64-mingw32-gcc -municode -mwindows -O2 -s \
  -Wall -Wextra -Werror -o "PS JAPA.exe" lancador.c   # o lançador
npm install && npm run empacotar                       # a casca
```

Os dois cruzam de Linux para Windows: o empacotador do Electron só baixa o
binário de win32, e o lançador sai do mingw. O `-Werror` não é zelo: um aviso
ali é um executável que falha na mão do usuário, no plantão, de um jeito que
ninguém consegue depurar.

## Conferir o lançador sem Windows

Com `wine` e `mingw`, dá para exercitar os três caminhos. Compile um
`chrome.exe` de mentira que grave a própria linha de comando num arquivo,
ponha-o em `C:\Program Files\Google\Chrome\Application\` do prefixo, e rode o
lançador de uma pasta qualquer. O que tem que ser verdade:

- nasceram `dados\` e `PDFs\` ao lado do executável;
- o navegador foi chamado com `--user-data-dir` apontando para `dados\`;
- `dados\Default\Preferences` saiu com o download no pen drive e
  `credentials_enable_service` falso;
- **numa segunda abertura**, um `Preferences` já existente não é sobrescrito —
  senão a pasta de download que o usuário escolher na mão seria desfeita toda
  vez;
- **sem o `chrome.exe` de mentira**, ele avisa e não tenta abrir nada.

## Conferir que nada escapa para a máquina

A casca inteira existe por causa de uma afirmação — "o perfil e os PDFs ficam no
pen drive" — e essa afirmação se verifica rodando, não lendo. Em Linux, com
`xvfb` e o Electron do npm:

```sh
cp desktop/main.js desktop/sem-rede.html /tmp/casca/
sed -i 's|https://ps.victorhoura.com|http://localhost:3222|' /tmp/casca/main.js
# servir uma página que gera um blob e clica num <a download>, como a APAC faz
cd /tmp/casca && xvfb-run -a electron --no-sandbox .
```

O que tem que ser verdade depois:

- `dados/Cookies` e `dados/Cache` existem ao lado do app;
- o PDF caiu em `PDFs/`, com o nome que a página pediu;
- `~/.config/Electron` e `~/Downloads` **não** foram criados.

O terceiro item é o que importa. Os dois primeiros só dizem que o app funcionou.

## Detalhes que não são óbvios

- **`PORTABLE_EXECUTABLE_DIR`** (em `main.js`): empacotadores que geram um
  executável único descompactam o programa no `%TEMP%` da máquina. Sem consultar
  essa variável, `app.getPath("exe")` aponta para o temporário e o perfil iria
  parar no disco do computador — exatamente o rastro que esta casca existe para
  não deixar.
- **`app.setPath` antes do `whenReady`**: depois disso o Electron já abriu o
  perfil no lugar padrão.
- **A subrotina no `.cmd`**: dentro de um bloco `if (...)` o `cmd` expande a
  linha inteira na leitura, então uma variável definida ali dentro ainda não
  existe quando é lida. Por isso a gravação do `Preferences` sai por `call`.
