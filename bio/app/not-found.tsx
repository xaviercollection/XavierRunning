import Link from "next/link";
import { Arrow } from "@/components/Arrow";
import { Monogram } from "@/components/Monogram";
import { COPY } from "@/config/site";

export default function NotFound() {
  return (
    <div className="bio">
      <header className="bio-mark">
        <Monogram className="bio-monogram" />
        <span className="bio-rule" aria-hidden="true" />
        <p className="bio-brand">{COPY.brand}</p>
      </header>

      <main className="bio-main">
        <div className="bio-statement">
          <h1 className="bio-support">Página não encontrada.</h1>
        </div>
        <nav className="bio-actions" aria-label="Links">
          <ul>
            <li>
              <Link className="action action-primary" href="/">
                <span className="action-index" aria-hidden="true">
                  01
                </span>
                <span className="action-label">Voltar ao início</span>
                <Arrow />
              </Link>
            </li>
          </ul>
        </nav>
      </main>
    </div>
  );
}
