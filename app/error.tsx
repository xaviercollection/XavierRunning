"use client";

import { useEffect } from "react";
import Link from "next/link";
import { StatusScreen } from "@/components/system/StatusScreen";

export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusScreen
      code="500"
      eyebrow="Interrupção inesperada"
      title="A experiência pausou."
      description="Alguma coisa não carregou como deveria. Tente novamente ou retorne ao início da coleção."
    >
      <button type="button" onClick={() => retry()} className="admin-button-primary min-w-48 justify-center py-4">Tentar novamente</button>
      <Link href="/" className="admin-button-secondary min-w-48 justify-center py-4">Voltar ao início</Link>
    </StatusScreen>
  );
}
