import "@seuil/tokens/tokens.css";
import "@seuil/ui/styles.css";
import { Header } from "@seuil/ui";
import { StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";

export function mount(children: ReactNode) {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <div data-theme="admin" className="seuil-root">
        <Header siteName="Commune de Valfleurie" homeHref="./index.html" nav={[{ label: "Démarches en ligne", href: "./index.html" }]} />
        <main id="contenu" className="demo-main">
          {children}
        </main>
        <footer className="demo-footer">
          <p>Commune fictive, créée pour la démonstration de Seuil.</p>
        </footer>
      </div>
    </StrictMode>,
  );
}
