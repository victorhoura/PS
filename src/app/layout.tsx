import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Moldura } from "@/components/Moldura";

export const metadata: Metadata = {
  title: "PS JAPA",
  description: "Apoio ao atendimento em pronto socorro",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "PS JAPA", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#0d0f12",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-dvh antialiased">
        <Moldura>{children}</Moldura>
      </body>
    </html>
  );
}
