import "@seuil/tokens/tokens.css";
import "@seuil/ui/styles.css";
import { Header } from "@seuil/ui";
import { StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";

export const PAGES = [
  { label: "Accueil", href: "./index.html" },
  { label: "Prendre rendez-vous", href: "./rendez-vous.html" },
];

export function mount(current: string, children: ReactNode) {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <div data-theme="sante" className="seuil-root">
        <Header siteName="Clinique des Aubépines" homeHref="./index.html" nav={PAGES.map((n) => ({ ...n, current: n.href === current }))} />
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
          <p>Clinique fictive, créée pour la démonstration de Seuil.</p>
        </footer>
      </div>
    </StrictMode>,
  );
}
