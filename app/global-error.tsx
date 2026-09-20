"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
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
    <html lang="pt-BR">
      <head>
        <title>Erro inesperado | Xavier Collection</title>
      </head>
      <body style={{ margin: 0, background: "#050505", color: "#f3efe6", fontFamily: "Arial, sans-serif" }}>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "32px", boxSizing: "border-box", background: "radial-gradient(circle at 50% 42%, rgba(199,163,90,.12), transparent 42%)" }}>
          <section style={{ width: "100%", maxWidth: "760px", border: "1px solid rgba(255,255,255,.1)", padding: "clamp(32px, 7vw, 72px)", textAlign: "center", boxSizing: "border-box", background: "rgba(8,8,8,.9)" }}>
            <p style={{ margin: 0, color: "#c7a35a", fontSize: "10px", letterSpacing: ".35em", textTransform: "uppercase" }}>Xavier Collection · Erro global</p>
            <h1 style={{ margin: "28px 0 0", fontFamily: "Georgia, serif", fontWeight: 400, fontSize: "clamp(44px, 8vw, 82px)", lineHeight: .95 }}>Não foi possível concluir.</h1>
            <p style={{ margin: "24px auto 0", maxWidth: "520px", color: "#9f9b93", fontSize: "15px", lineHeight: 1.8 }}>A página encontrou um erro inesperado. Você pode tentar reconstruir a experiência agora.</p>
            {error.digest && <p style={{ marginTop: "18px", color: "#6f6b65", fontSize: "10px", letterSpacing: ".12em" }}>REFERÊNCIA {error.digest}</p>}
            <div style={{ marginTop: "36px", display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
              <button type="button" onClick={() => retry()} style={{ minWidth: "190px", border: "1px solid #c7a35a", background: "#c7a35a", color: "#080808", padding: "15px 22px", cursor: "pointer", fontSize: "10px", letterSpacing: ".18em", textTransform: "uppercase" }}>Tentar novamente</button>
              <Link href="/" style={{ minWidth: "190px", border: "1px solid rgba(255,255,255,.15)", color: "#f3efe6", padding: "15px 22px", boxSizing: "border-box", textDecoration: "none", fontSize: "10px", letterSpacing: ".18em", textTransform: "uppercase" }}>Voltar ao início</Link>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
