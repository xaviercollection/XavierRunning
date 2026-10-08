/** Seta tipográfica dos botões: → para a loja (mesma aba), ↗ para destinos externos (nova aba). */
export function Arrow({ external = false }: { external?: boolean }) {
  return (
    <svg
      className={external ? "action-arrow action-arrow-out" : "action-arrow"}
      viewBox="0 0 16 16"
      aria-hidden="true"
      focusable="false"
    >
      <path d={external ? "M4.5 11.5l7-7M5.5 4.5h6v6" : "M2 8h11.5M9.5 4l4 4-4 4"} />
    </svg>
  );
}
