# Casca de desktop

O PS JAPA roda em computador de plantão, compartilhado, onde a janela anônima
às vezes está desligada por política da rede. Sem ela, o navegador da máquina
guarda cookie, histórico e cache de quem sentou antes — e o PDF da APAC, com
nome de paciente, cai na pasta Downloads.

Esta pasta resolve isso levando o perfil e os PDFs para o pen drive. São duas
formas de abrir o **mesmo site**, porque numa máquina com restrição não dá para
saber de antemão qual vai passar:

| | o que é | quando serve |
|---|---|---|
| `PS JAPA.cmd` | abre o Chrome/Edge da máquina com `--user-data-dir` apontando para o pen drive | quase sempre: o programa que roda é o navegador que a TI já aprovou |
| `PS JAPA.exe` | casca Electron (`main.js`), janela própria | quando não há Chrome nem Edge, ou quando a política força a pasta de perfil |

Nenhuma das duas é uma cópia do app: as duas carregam `ps.victorhoura.com` da
rede. Não há o que atualizar no pen drive quando o site muda.

## Gerar o executável

O `.exe` tem ~370 MB (é o Chromium do Electron), então não mora no repositório.
Quem monta é o workflow `.github/workflows/executavel.yml`, a cada push que
toque em `desktop/`, ou acionado à mão em **Actions → Executável do pen drive →
Run workflow**. O resultado sai como artefato `PS-JAPA-pendrive`, já com o
`.cmd` e o `LEIA-ME.txt` dentro: baixar, descompactar, copiar a pasta para o pen
drive.

Para gerar localmente, com Node instalado:

```sh
cd desktop
npm install
npm run empacotar      # dist/PS JAPA-win32-x64/
```

O empacotamento para Windows funciona a partir de Linux e de macOS também — o
empacotador só baixa o binário do Electron para win32 e copia os arquivos por
cima.

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
