import type { Metadata, Viewport } from "next";
import { Archivo, Bodoni_Moda } from "next/font/google";
import { COPY, SITE_URL } from "@/config/site";
import "./globals.css";

// Mesmas famílias da loja. O eixo "opsz" deixa a Bodoni com contraste de título nos tamanhos grandes.
const bodoni = Bodoni_Moda({
  subsets: ["latin"],
  axes: ["opsz"],
  variable: "--font-bodoni",
  display: "swap",
});

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
});

const description = `${COPY.slogan} ${COPY.support}`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: COPY.brand,
  description,
  applicationName: COPY.brand,
  alternates: { canonical: "/" },
  openGraph: {
    title: COPY.brand,
    description,
    siteName: COPY.brand,
    type: "website",
    locale: "pt_BR",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: COPY.brand,
    description,
  },
};

export const viewport: Viewport = {
  themeColor: "#050505",
  colorScheme: "dark",
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
      <body>{children}</body>
    </html>
  );
}
