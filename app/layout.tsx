import type { Metadata, Viewport } from "next";
import { Archivo, Bodoni_Moda } from "next/font/google";
import "./globals.css";

const bodoni = Bodoni_Moda({
  subsets: ["latin"],
  variable: "--font-bodoni",
  display: "swap",
});

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Xavier Collection",
  description:
    "Xavier Collection — fragrâncias, moda e lifestyle. Presença que se sente antes de se ver.",
  openGraph: {
    title: "Xavier Collection",
    description:
      "Xavier Collection — fragrâncias, moda e lifestyle. Presença que se sente antes de se ver.",
    type: "website",
    locale: "pt_BR",
  },
};

export const viewport: Viewport = {
  themeColor: "#050505",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${bodoni.variable} ${archivo.variable}`}>
      <body className="bg-void text-ink antialiased">{children}</body>
    </html>
  );
}
