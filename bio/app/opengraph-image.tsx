import { ImageResponse } from "next/og";
import { MONOGRAM_POLYGONS, MONOGRAM_VIEWBOX } from "@/components/Monogram";
import { COPY } from "@/config/site";

// Prévia do link no WhatsApp/Instagram. Gerada uma vez no build (rota estática).

export const alt = `${COPY.brand} — ${COPY.slogan}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Fonte do Google só com os glifos usados. Se falhar no build, a imagem sai com a fonte padrão do next/og. */
async function loadGoogleFont(family: string, text: string): Promise<ArrayBuffer | null> {
  try {
    const query = `family=${family}&text=${encodeURIComponent(text)}`;
    const css = await (await fetch(`https://fonts.googleapis.com/css2?${query}`)).text();
    const fontUrl = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
    if (!fontUrl) return null;
    const response = await fetch(fontUrl);
    return response.ok ? await response.arrayBuffer() : null;
  } catch {
    return null;
  }
}

export default async function OpengraphImage() {
  const brand = COPY.brand.toUpperCase();
  const slogan = COPY.slogan.toUpperCase();
  const support = COPY.support.toUpperCase();
  const [bodoni, archivo] = await Promise.all([
    loadGoogleFont("Bodoni+Moda:opsz,wght@96,400", brand + slogan),
    loadGoogleFont("Archivo:wght@400", support),
  ]);

  // Sem as duas fontes, usa só a padrão: misturar uma fonte recortada com a padrão some com glifos.
  const fonts =
    bodoni && archivo
      ? [
          { name: "Bodoni Moda", data: bodoni, style: "normal" as const, weight: 400 as const },
          { name: "Archivo", data: archivo, style: "normal" as const, weight: 400 as const },
        ]
      : undefined;
  const display = fonts ? "Bodoni Moda" : undefined;
  const sans = fonts ? "Archivo" : undefined;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: 88,
          padding: "0 104px",
          background: "#050505",
          color: "#f4f1ea",
        }}
      >
        <svg width={206} height={260} viewBox={MONOGRAM_VIEWBOX} fill="#f4f1ea">
          {MONOGRAM_POLYGONS.map((points) => (
            <polygon key={points} points={points} />
          ))}
        </svg>
        <div style={{ display: "flex", flexDirection: "column", width: 640 }}>
          <div style={{ width: 56, height: 2, background: "#c8a45d" }} />
          <div style={{ marginTop: 36, fontFamily: display, fontSize: 28, letterSpacing: 9 }}>{brand}</div>
          <div style={{ marginTop: 26, fontFamily: display, fontSize: 76, lineHeight: 0.95 }}>{slogan}</div>
          <div style={{ marginTop: 30, fontFamily: sans, fontSize: 20, letterSpacing: 4, color: "#a5a5a5" }}>
            {support}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts,
    },
  );
}
