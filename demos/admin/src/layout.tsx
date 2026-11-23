import "@seuil/tokens/tokens.css";
import "@seuil/ui/styles.css";
import "./charte.css";
import { Header } from "@seuil/ui";
import { StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";

export const PAGES = [{ label: "Attestation de domicile", href: "./index.html" }];

export function mount(children: ReactNode, current = "") {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <div data-theme="admin" className="seuil-root">
        <Header siteName="Commune de Valfleurie" homeHref="./index.html" nav={[{ label: "Démarches en ligne", href: "./index.html" }]} />
        <main id="contenu" className="demo-main">
          {children}
        </main>
        <footer className="demo-footer">
          {/* Second way to reach every page, besides the menu (WCAG 2.4.5). */}
          <p>
            <a href="./plan-du-site.html" aria-current={current === "./plan-du-site.html" ? "page" : undefined}>
              Plan du site
            </a>
          </p>
          <p>Commune fictive, créée pour la démonstration de Seuil.</p>
        </footer>
      </div>
    </StrictMode>,
  );
}
