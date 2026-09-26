# PS JAPA

Apoio ao atendimento em pronto socorro. Porte para web do programa desktop em
Python (tkinter) que rodava de pendrive.

**Não guarda dado de paciente.** São textos-modelo, escores clínicos e um
formatador de laudos. Nada do que é digitado no formatador é persistido.

## O que tem

| Parte | Conteúdo |
|---|---|
| Textos | 311 modelos em 10 categorias (anamnese, exame físico, CID, condutas, reavaliação, receitas, prescrições, fármacos, encaminhamento, notas); prescrições começa vazia, para os seus textos |
| Escores | 21 escores e calculadoras: Alvarado, Atlanta, cefaleia (ICHD-3 e protocolo), Charcot/Reynolds, Cincinnati, CURB-65, Glasgow, Hinchey, hipo/hipercalemia, hipo/hipernatremia, NIHSS, qSOFA, sequência rápida IOT, SOFA, Tokyo (colangite e colecistite), Wells (TEP e TVP) |
| Ferramentas | Formatador de exames (SHIFT/AFIP), conversor de letras, contador, divisão de plantão (turnos iguais de agora até as 07:00) |

## Criar e editar textos

Cada categoria tem um **+** ao lado da busca, e cada item um **✎** para
editar. Os 311 textos originais vêm embutidos no bundle e nunca são alterados:

| Ação | O que acontece |
|---|---|
| Criar | Entra na lista na hora: em ordem alfabética nas categorias grandes (anamnese, CID, receitas, prescrições, fármacos, notas), no topo nas outras |
| Editar um original | Grava a sua versão por cima; a base não muda. Não há "restaurar original": voltar atrás é restaurar um backup |
| Apagar um original | **Apagar**, como um texto seu: some da lista. Por baixo grava uma lápide; só volta restaurando um backup de antes |
| Apagar um texto seu | Some de vez |

As criações aparecem no `Ctrl+K` e nas contagens da barra lateral na hora.

A caixa de edição **não fecha com clique fora** — só por Salvar, Cancelar ou
`Esc`. E se houver texto não salvo, Cancelar e `Esc` pedem confirmação antes de
descartar; o cabeçalho marca "não salvo" enquanto houver alteração pendente.

### Onde isso é guardado

Só no Supabase: nada fica gravado no computador. Abrir o app em outro
computador traz tudo junto. A tela **BACKUP** faz duas coisas, baixar uma cópia
em arquivo e restaurar a partir dela: é a rede de segurança se o banco falhar.
Não há "voltar ao original" — os textos do PS.py foram o ponto de partida, e a
medicina muda.

## Nuvem

| Peça | Papel |
|---|---|
| `src/lib/supabase.ts` | acesso ao banco, **só do servidor** — a chave de serviço nunca vai ao navegador |
| `src/app/api/nuvem/[chave]/route.ts` | `GET`/`PUT` de `cofre` e `textos`, atrás da sessão do app |
| `src/lib/nuvem.ts` | cliente do navegador; falha em silêncio e cai no cache local |

Variáveis na Vercel (server-only, sem `NEXT_PUBLIC_`):

| Nome | Valor |
|---|---|
| `SUPABASE_URL` | URL do projeto |
| `SUPABASE_SERVICE_ROLE_KEY` | chave de serviço |

Sem elas a rota devolve 503 e o app funciona local, como antes. Na carga a
nuvem ganha do cache; toda escrita grava local primeiro e empurra depois.
Conflito é o último que escreve vence — basta para um usuário só.

## Tema

Botão no rodapé da barra lateral (ou na barra de topo, em janela estreita).
Escuro é o padrão — é o tema do `PS.py` e o que serve em plantão noturno.

As cores são variáveis CSS em `globals.css`, no formato `R G B`, para que os
modificadores de opacidade do Tailwind (`bg-accent/10`) continuem valendo.
Trocar de tema é trocar valores de variável, sem reconstruir classe nenhuma.
Um script embutido aplica o tema salvo antes da primeira pintura, para a tela
não piscar.

## Cofre (aba LINKS)

Guarda login, senha e o cartão de chave dinâmica **cifrados neste navegador**.
Nada disso existe no código, em variável de ambiente ou no servidor — o
repositório é público e nunca deve ver credencial.

| Peça | Escolha |
|---|---|
| Derivação | PBKDF2-SHA256, 250 mil iterações |
| Cifra | AES-GCM 256 (esconde **e** detecta adulteração) |
| Onde mora | `localStorage`, só neste navegador |
| Senha-mestra | nunca gravada; fica em memória enquanto aberto |

A senha-mestra é **separada** do `PS_SENHA`: passar da porta do app não abre o
cofre. O cofre se tranca sozinho após 5 minutos parado, e bloquear o app o
tranca junto (o componente desmonta e a chave em memória some).

A chave dinâmica aceita `3A`, `a3` ou `3 a`, e o valor vai direto para a área
de transferência — nunca é desenhado na tela.

O cofre sincroniza com a nuvem: sobe e desce **cifrado**, então nem a rota de
API nem o Supabase têm como lê-lo. A senha-mestra não sai do navegador.

**EXPORTAR** baixa o blob cifrado, como rede de segurança. **Importar** exige a
senha-mestra antes: o arquivo só substitui o cofre depois de provar que decifra.

## Bloquear

Botão de cadeado: apaga o cookie de sessão e volta para a tela de senha. É para
o computador compartilhado — você levanta da mesa e tranca, em vez de deixar a
sessão aberta por 12 horas para quem sentar depois.

O proxy manda `Cache-Control: no-store` nas páginas protegidas. Sem isso o
bloqueio não valeria: o navegador reexibiria a página do próprio cache ao
apertar "voltar", sem consultar o servidor. Isso também desliga o bfcache
dessas páginas.

**Limite conhecido:** offline, o service worker ainda serve as páginas que
guardou, porque não tem como ler o cookie (ele é `httpOnly`). Bloquear protege
o computador conectado, que é o caso real; não protege uma máquina sem rede.

## Teclado

| Tecla | Ação |
|---|---|
| `Ctrl/Cmd + K` | Busca global em tudo |
| `↑` `↓` | Navegar nos resultados |
| `Enter` | Copiar o texto / abrir a ferramenta |
| `Esc` | Voltar ao menu (fecha busca/editor primeiro) |
| `Ctrl/Cmd + Enter` | Salvar, dentro do editor |

## Desenvolvimento

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # testes do formatador de labs
npm run typecheck
npm run build
```

## Estrutura

```
src/
  app/                 rotas (Next.js App Router)
  components/          UI
  lib/
    labs.ts            formatador de laudos — porte de formatar_labs()
    calculadoras.ts    escores como dados, não como telas
    clipboard.ts       cópia + normalização de busca
    repositorio.ts       base embutida + camada local (criar/editar/backup)
  hooks/useTextos.ts   assina o repositório (useSyncExternalStore)
  data/snippets.ts     GERADO a partir do PS.py — não editar à mão
  sessao.ts            cookie assinado da tranca de entrada
  proxy.ts             redireciona para /entrar sem sessão válida
public/sw.js           service worker (offline)
```

## Senha

O app é trancado por uma senha única, como o `PASSWORD` do `PS.py` — mas a
senha vive numa variável de ambiente, nunca no código.

Na Vercel, em **Settings → Environment Variables**, defina:

| Variável | Valor |
|---|---|
| `PS_SENHA` | a senha (Production, Preview e Development) |

Sem essa variável o app **fica aberto** e a tela de entrada avisa — é
deliberado: uma variável esquecida não pode trancar o plantão para fora.

O que vai para o navegador é um cookie `HttpOnly` + `Secure` + `SameSite=Lax`,
assinado com HMAC-SHA256 por uma chave derivada da senha. Dura 12 horas — um
plantão — porque o app roda também em computador compartilhado. Trocar a senha
invalida todas as sessões.

Pelo app, a senha se troca em **Configurações → SEGURANÇA**, que também
configura o código do autenticador (pedido então para entrar, desbloquear e
trocar a senha). As configurações ficam assim: **tema** e **bloquear** soltos
na tela; **SEGURANÇA**, **BACKUP** e **DOWNLOAD** (o app do pen drive) como
tópicos com página própria.

Não é autenticação de usuário: é uma tranca só. Conta de verdade, com sessão
revogável, entra junto com o Supabase.

## Janela estreita

O caso de uso é o app encostado na lateral da tela, ao lado do sistema do
hospital. O layout tem duas formas:

| Largura | Forma |
|---|---|
| ≥ 1024px | barra lateral fixa, como app de desktop |
| < 1024px | barra de topo de uma linha; o `☰` abre um menu que toma a janela inteira |

Não existe faixa horizontal de categorias: ela rolava para o lado, escondia
metade dos destinos e comia altura útil. O conteúdo não estoura em nenhuma
largura a partir de 320px.

A largura mínima da **janela** de um PWA instalado é imposta pelo Chrome/Edge,
não pelo app — não há propriedade de manifest que mude isso.

## Ícone

Cruz médica com uma linha de ECG atravessando a barra horizontal. Foi escolhida
entre seis candidatos por degradar bem: grande mostra cruz **e** pulso; a 28px
o pulso some e sobra uma cruz limpa. As alternativas que recortavam a cruz
viravam borrão nesse tamanho.

Os arquivos são gerados rasterizando SVG no Chromium (`scripts/`), não por
código de desenho próprio — a primeira versão usava um rasterizador escrito à
mão cuja matemática de canto arredondado deixou o ícone 75% transparente, e ele
aparecia como cacos na barra de tarefas.

| Arquivo | Uso |
|---|---|
| `public/icone.svg` | manifest, qualquer tamanho |
| `public/icone-192.png`, `-512.png` | instalação do PWA |
| `public/icone-maskable.png` | Android/Windows, conteúdo na zona segura (76%) |
| `public/apple-touch-icon.png` | iOS, opaco (lá transparência vira preto) |
| `src/app/icon.svg` | favicon, sem o pulso — a 16px ele vira ruído |

## Instalar como aplicativo

É um PWA: instala como aplicativo no computador (Chrome/Edge, ícone de
instalar na barra de endereço) e no celular. O service worker existe só para
isso — ele **não guarda nada**: o app roda também em computador compartilhado,
e páginas já autenticadas em cache seriam rastro. Por isso, sem internet o app
não abre. `npm run build` carimba uma versão nova no worker a cada deploy.

### iPhone

No Safari: abrir ps.victorhoura.com → **Compartilhar** → **Adicionar à Tela de
Início**. O app abre em tela cheia, sem a barra do Safari.

- **Entrar de novo dentro do app.** O app da tela de início tem cookies
  próprios, separados dos do Safari: o login feito no Safari não vale lá, e o
  BLOQUEAR de um não tranca o outro. A sessão dura as mesmas 12 horas.
- **Barra de status opaca** (`default`), na cor da barra de topo do tema
  escolhido no app — o script do `<head>` e a troca de tema mantêm o
  `theme-color` em dia. A `black-translucent` punha a página sob o relógio.
- **Toque (`pointer: coarse`)**: campos a 16px, porque abaixo disso o iOS dá
  zoom na página ao tocar no campo; linhas, filtro, "+" e barra de topo com
  40px; dicas de teclado (Ctrl K, Ctrl+Enter) escondidas; `hover:` só com mouse
  (`hoverOnlyWhenSupported`), para a linha tocada não ficar acesa. No mouse —
  inclusive no painel lateral do Chrome — nada disso muda.
- `/apple-touch-icon.png` é público no `proxy.ts`: o iPhone o busca ao
  adicionar, às vezes ainda na tela de senha.

## Correções em relação ao PS.py

O formatador de laudos tinha quatro bugs que produziam valor clínico errado.
Estão corrigidos e travados em teste (`src/lib/__tests__/labs.test.ts`):

1. **Creatinina duplicada** — saía `CR 1,45 / UR 52 / CR 1,45`.
2. **Leucocitúria virando leucograma** — sem seção de urina, o bloco `UR1`
   reimprimia o leucograma como se fosse urina; e um laudo só de urina gerava
   um leucograma que não existia.
3. **Número truncado em 3 dígitos** — `25000` virava `250`, erro de 100x.
4. **`SUPERIOR A` perdendo o `>`** — `> 10,0` saía como `10,0`.

Também: `WellsTVPWindow._montar_texto_conduta` comparava uma tupla com uma
string, então sempre imprimia a conduta de "TVP PROVÁVEL". Corrigido no porte.
