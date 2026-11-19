import "@seuil/tokens/tokens.css";
import "@seuil/ui/styles.css";
import { Header } from "@seuil/ui";
import { StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";

const NAV = [
  { label: "Accueil", href: "./index.html" },
  { label: "Prendre rendez-vous", href: "./rendez-vous.html" },
];

export function mount(current: string, children: ReactNode) {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <div data-theme="sante" className="seuil-root">
        <Header siteName="Clinique des Aubépines" homeHref="./index.html" nav={NAV.map((n) => ({ ...n, current: n.href === current }))} />
        <main id="contenu" className="demo-main">
          {children}
        </main>
        <footer className="demo-footer">
          <p>Clinique fictive, créée pour la démonstration de Seuil.</p>
        </footer>
      </div>
    </StrictMode>,
  );
}
