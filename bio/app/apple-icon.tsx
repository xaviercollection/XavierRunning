import { ImageResponse } from "next/og";
import { MONOGRAM_POLYGONS, MONOGRAM_VIEWBOX } from "@/components/Monogram";

// Ícone da tela inicial do iPhone: o mesmo X sobre o preto da marca.

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#050505",
        }}
      >
        <svg width={88} height={111} viewBox={MONOGRAM_VIEWBOX} fill="#f4f1ea">
          {MONOGRAM_POLYGONS.map((points) => (
            <polygon key={points} points={points} />
          ))}
        </svg>
      </div>
    ),
    size,
  );
}
