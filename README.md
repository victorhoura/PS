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

### Onde isso é guardado

No `localStorage` **deste navegador**. Não atravessa computadores e não
sobrevive a uma limpeza de dados do navegador. A tela **BACKUP** exporta e
importa um JSON com tudo que é seu — é assim que você leva seus textos para o
computador do plantão.

Quando o Supabase entrar, essa camada passa a sincronizar sozinha e o backup
vira só uma rede de segurança.

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
