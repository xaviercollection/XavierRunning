// Monograma "X" em desenho Didone (mesma família visual da Bodoni da loja): haste grossa descendo
// da esquerda, haste fina subindo da direita e serifas retas. Geometria pura, sem fonte nem imagem.
// Exportada para o ícone da aba e a imagem de compartilhamento usarem exatamente o mesmo desenho.

export const MONOGRAM_VIEWBOX = "10 8 98 124";
export const MONOGRAM_RATIO = 98 / 124;

export const MONOGRAM_POLYGONS = [
  "22,14 46,14 98,126 74,126", // haste grossa
  "78,14 82,14 26,126 22,126", // haste fina
  "14,10 54,10 54,14 14,14", // serifas
  "68,10 92,10 92,14 68,14",
  "12,126 36,126 36,130 12,130",
  "66,126 106,126 106,130 66,130",
] as const;

export function Monogram({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      className={className}
      viewBox={MONOGRAM_VIEWBOX}
      fill="currentColor"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {MONOGRAM_POLYGONS.map((points) => (
        <polygon key={points} points={points} />
      ))}
    </svg>
  );
}
