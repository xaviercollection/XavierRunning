import type { Metadata } from "next";
import Link from "next/link";
import { StatusScreen } from "@/components/system/StatusScreen";

export const metadata: Metadata = {
  title: "Página não encontrada | Xavier Collection",
  description: "A página procurada não foi encontrada.",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <StatusScreen
      code="404"
      eyebrow="Caminho não encontrado"
      title="Esta página saiu de cena."
      description="O endereço pode ter mudado ou não existe mais. Continue explorando a seleção Xavier Collection."
    >
      <Link href="/" className="admin-button-primary min-w-48 justify-center py-4">Voltar ao início</Link>
      <Link href="/loja" className="admin-button-secondary min-w-48 justify-center py-4">Explorar a loja</Link>
    </StatusScreen>
  );
}
