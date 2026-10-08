import type { CSSProperties } from "react";
import { Arrow } from "@/components/Arrow";
import { Monogram } from "@/components/Monogram";
import { ACTIONS, COPY } from "@/config/site";

// Página estática, sem componentes de cliente: o movimento de entrada é só CSS (ver globals.css).

/** "Vista sua presença." → ["Vista sua", "presença."]: a última palavra ganha a linha de baixo. */
function sloganLines(slogan: string): string[] {
  const words = slogan.trim().split(/\s+/);
  return words.length > 1 ? [words.slice(0, -1).join(" "), words[words.length - 1]] : words;
}

export default function BioPage() {
  return (
    <div className="bio">
      <Monogram className="bio-watermark" />

      <header className="bio-mark">
        <Monogram className="bio-monogram" />
        <span className="bio-rule" aria-hidden="true" />
        <h1 className="bio-brand">{COPY.brand}</h1>
      </header>

      <main className="bio-main">
        <div className="bio-statement">
          <p className="bio-slogan">
            {sloganLines(COPY.slogan).map((line, index) => (
              <span key={line} className="bio-line" style={{ "--i": index } as CSSProperties}>
                <span>{line}</span>
              </span>
            ))}
          </p>
          <p className="bio-support">{COPY.support}</p>
        </div>

        <nav className="bio-actions" aria-label="Links">
          <ul>
            {ACTIONS.map((action, index) => (
              <li key={action.id}>
                <a
                  className={index === 0 ? "action action-primary" : "action"}
                  href={action.href}
                  {...(action.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                >
                  <span className="action-index" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="action-label">
                    {action.label}
                    {action.external && <span className="sr-only"> (abre em nova aba)</span>}
                  </span>
                  <Arrow external={action.external} />
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </main>

      <footer className="bio-footer">
        <p>{COPY.footer}</p>
      </footer>
    </div>
  );
}
