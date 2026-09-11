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

## Teclado

| Tecla | Ação |
|---|---|
| `Ctrl/Cmd + K` | Busca global em tudo |
| `↑` `↓` | Navegar nos resultados |
| `Enter` | Copiar o texto / abrir a ferramenta |
| `Esc` | Voltar ao menu |

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
  data/snippets.ts     GERADO a partir do PS.py — não editar à mão
public/sw.js           service worker (offline)
```

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
