# PS JAPA

Apoio ao atendimento em pronto socorro. Porte para web do programa desktop em
Python (tkinter) que rodava de pendrive.

**Não guarda dado de paciente.** São textos-modelo, escores clínicos e um
formatador de laudos. Nada do que é digitado no formatador é persistido.

## O que tem

| Parte | Conteúdo |
|---|---|
| Textos | 311 modelos em 9 categorias (anamnese, exame físico, CID, condutas, reavaliação, receitas, fármacos, encaminhamento, notas) |
| Escores | Alvarado, CURB-65, Glasgow, qSOFA, Wells (TVP) |
| Ferramentas | Formatador de exames (SHIFT/AFIP), conversor de letras, contador |

## Criar e editar textos

Cada categoria tem **+ NOVO** ao lado da busca, e cada item um **✎** para
editar. Os 311 textos originais vêm embutidos no bundle e nunca são alterados:

| Ação | O que acontece |
|---|---|
| Criar | Entra no topo da categoria, marcado com ponto azul |
| Editar um original | Grava um override; ponto âmbar; **Restaurar original** desfaz |
| Ocultar um original | Grava uma lápide; restaurável a qualquer momento |
| Apagar um texto seu | Some de vez |

As criações aparecem no `Ctrl+K` e nas contagens da barra lateral na hora.

A caixa de edição **não fecha com clique fora** — só por Salvar, Cancelar ou
`Esc`. E se houver texto não salvo, Cancelar e `Esc` pedem confirmação antes de
descartar; o cabeçalho marca "não salvo" enquanto houver alteração pendente.

### Onde isso é guardado

No `localStorage` **deste navegador**. Não atravessa computadores e não
sobrevive a uma limpeza de dados do navegador. A tela **BACKUP** exporta e
importa um JSON com tudo que é seu — é assim que você leva seus textos para o
computador do plantão.

Quando o Supabase entrar, essa camada passa a sincronizar sozinha e o backup
vira só uma rede de segurança.

## Tema

Botão no rodapé da barra lateral (ou na barra de topo, em janela estreita).
Escuro é o padrão — é o tema do `PS.py` e o que serve em plantão noturno.

As cores são variáveis CSS em `globals.css`, no formato `R G B`, para que os
modificadores de opacidade do Tailwind (`bg-accent/10`) continuem valendo.
Trocar de tema é trocar valores de variável, sem reconstruir classe nenhuma.
Um script embutido aplica o tema salvo antes da primeira pintura, para a tela
não piscar.

## Bloquear

Botão de cadeado: apaga o cookie de sessão e volta para a tela de senha. É para
o computador compartilhado — você levanta da mesa e tranca, em vez de deixar a
sessão aberta por 180 dias para quem sentar depois.

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
assinado com HMAC-SHA256 por uma chave derivada da senha. Dura 180 dias, então
se entra uma vez por computador. Trocar `PS_SENHA` invalida todas as sessões.

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

## Offline

É um PWA: instala como aplicativo e funciona sem rede. O service worker
pré-cacheia todas as rotas na instalação; `npm run build` carimba uma versão
nova nele para invalidar o cache do deploy anterior.

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
