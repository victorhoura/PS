import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Moldura } from "@/components/Moldura";

export const metadata: Metadata = {
  title: "PS JAPA",
  description: "Apoio ao atendimento em pronto socorro",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "PS JAPA", statusBarStyle: "black-translucent" },
  icons: {
    // O iOS ignora o manifest e lê esta tag; o PNG é opaco porque lá a
    // transparência do ícone vira preto.
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0d0f12" },
    { media: "(prefers-color-scheme: light)", color: "#f4f5f7" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" data-tema="escuro">
      <body className="min-h-dvh antialiased">
        <Moldura>{children}</Moldura>
      </body>
    </html>
  );
}
