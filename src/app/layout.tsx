import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Moldura } from "@/components/Moldura";
import { COR_DA_BARRA, SCRIPT_TEMA } from "@/lib/tema";
import { SCRIPT_TEXTOS } from "@/lib/antecipar";

/**
 * Inter variável, servida pelo próprio app: o arquivo vem no build e sai
 * pelo mesmo endereço, sem pedido a terceiros e sem depender das fontes
 * instaladas no computador do hospital.
 */
const inter = localFont({
  src: "./fontes/inter-latin.woff2",
  weight: "100 900",
  variable: "--fonte-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PS JAPA",
  description: "Apoio ao atendimento em pronto socorro",
  manifest: "/manifest.webmanifest",
  /*
   * Barra de status opaca ("default"), e o app começa embaixo dela. A
   * "black-translucent" deixava a página correr por baixo do relógio: a barra
   * de topo do app — menu, busca, cadeado — ficava sob a hora e a bateria, e
   * no tema claro o relógio (sempre branco nesse modo) sumia no branco. A cor
   * da barra vem do theme-color, que acompanha o tema do app (lib/tema).
   */
  appleWebApp: { capable: true, title: "PS JAPA", statusBarStyle: "default" },
  // O Next escreve só a marca genérica (mobile-web-app-capable). A do iOS vai
  // junto: é com ela que o iPhone lê o estilo da barra de status acima.
  other: { "apple-mobile-web-app-capable": "yes" },
  icons: {
    // O iOS ignora o manifest e lê esta tag; o PNG é opaco porque lá a
    // transparência do ícone vira preto.
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    /*
     * O HTML sai do servidor escuro — ele não sabe de quem é a requisição — e
     * o script abaixo corrige antes da primeira pintura, se houver cookie.
     * `suppressHydrationWarning` é por causa disso: sem ele o React encontra
     * um `data-tema` diferente do que enviou e trata como erro de hidratação.
     *
     * A alternativa seria ler o cookie com `cookies()` aqui; custaria a
     * prerenderização estática do app inteiro para economizar uma linha.
     *
     * A documentação do Next avisa que, em desenvolvimento, o Strict Mode
     * pode devolver o <html> aos atributos do JSX ao remontar e levar junto
     * o que o script escreveu. Foi medido aqui e não acontece; se um dia
     * acontecer, o conserto é reler o cookie num `useLayoutEffect`.
     */
    <html lang="pt-BR" data-tema="escuro" className={inter.variable} suppressHydrationWarning>
      <head>
        {/*
          A cor da barra do sistema vem escrita aqui, e não pelo `viewport` do
          Next, para vir ANTES do script abaixo: ele a troca pela do tema do
          cookie antes da primeira pintura. `suppressHydrationWarning` pelo
          mesmo motivo do <html>.
        */}
        <meta name="theme-color" content={COR_DA_BARRA.escuro} suppressHydrationWarning />
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEXTOS }} />
      </head>
      <body className="min-h-dvh antialiased">
        <Moldura>{children}</Moldura>
      </body>
    </html>
  );
}
