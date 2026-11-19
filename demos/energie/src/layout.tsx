import "@seuil/tokens/tokens.css";
import "@seuil/ui/styles.css";
import { Header } from "@seuil/ui";
import { StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";

const NAV = [
  { label: "Espace client", href: "./index.html" },
  { label: "Consommation", href: "./consommation.html" },
];

export function mount(current: string, children: ReactNode) {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <div data-theme="energie" className="seuil-root">
        <Header siteName="Cascade Énergie" homeHref="./index.html" nav={NAV.map((n) => ({ ...n, current: n.href === current }))} />
        <main id="contenu" className="demo-main">
          {children}
        </main>
        <footer className="demo-footer">
          <p>Fournisseur fictif, créé pour la démonstration de Seuil.</p>
        </footer>
      </div>
    </StrictMode>,
  );
}
