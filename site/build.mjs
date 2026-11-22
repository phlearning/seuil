// Assembles the static showcase in site/dist. Expects, before it runs:
// - packages/ui/storybook-static (pnpm build)
// - for each demo: dist/, seuil-report/rapport.html and review-export/ (see .github/workflows/pages.yml)
// The red pull request reports are committed examples in site/examples/.
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";

const REPO = process.env.SEUIL_REPO_URL ?? "https://github.com/phlearning/seuil";
const pr = (branch) => `${REPO}/pulls?q=${encodeURIComponent(`is:pr head:${branch}`)}`;

const DEMOS = [
  {
    id: "sante",
    name: "Clinique des Aubépines",
    sector: "Santé",
    feature: "Questionnaire préalable au rendez-vous",
    branch: "demo/sante-questionnaire",
    commit: "ebdac62",
    red: ["Champs du questionnaire sans label visible (WCAG 3.3.2)", "Fenêtre d'information qui retient le focus clavier (WCAG 2.1.2)"],
    green: ["Champs étiquetés, regroupés dans un fieldset", "Information dans le flux de la page, sans fenêtre"],
  },
  {
    id: "admin",
    name: "Commune de Valfleurie",
    sector: "Administration publique",
    feature: "Nouvelle charte graphique",
    branch: "demo/admin-charte",
    commit: "7f5fddb",
    red: [
      "Police chargée depuis Google Fonts : adresse IP des visiteurs transmise aux États-Unis (nLPD art. 16)",
      "Gris secondaire à 3.45:1 dans les tokens (WCAG 1.4.3)",
      "Formulaire de largeur fixe qui déborde à 320 px (WCAG 1.4.10)",
    ],
    green: ["Police système définie dans les tokens du thème : aucun téléchargement", "Contraste et mise en page fluide conservés"],
  },
  {
    id: "energie",
    name: "Cascade Énergie",
    sector: "Énergie",
    feature: "Mesure d'audience et total de consommation",
    branch: "demo/energie-audience",
    commit: "b96435e",
    red: [
      "Google Analytics et cookies _ga avant tout choix du visiteur (LTC art. 45c)",
      "CSP supprimée pour laisser passer le script (nLPD art. 8)",
      "lodash 4.17.20, vulnérabilités connues (OSV)",
    ],
    green: ["Mesure interne sans cookie ni identifiant, envoyée au même serveur", "CSP intacte, total calculé sans dépendance"],
  },
];

const html = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const demosHtml = DEMOS.map(
  (d) => `<article class="demo" aria-labelledby="demo-${d.id}">
  <h3 id="demo-${d.id}">${html(d.name)} <span class="lede">· ${html(d.sector)}</span></h3>
  <p>Fonctionnalité : ${html(d.feature)}.</p>
  <div class="prs">
    <div class="pr red">
      <h4>Pull request rouge : bloquée</h4>
      <ul>${d.red.map((r) => `<li>${html(r)}</li>`).join("")}</ul>
      <p><a href="${pr(`${d.branch}-rouge`)}">Voir la pull request</a> · <a href="./demos/${d.id}/rapport-pr-rouge.html">Rapport de la version rouge</a></p>
    </div>
    <div class="pr">
      <h4>Version verte : conforme, mergée</h4>
      <ul>${d.green.map((g) => `<li>${html(g)}</li>`).join("")}</ul>
      <p><a href="${REPO}/commit/${d.commit}">Voir le commit</a></p>
    </div>
  </div>
  <ul class="links">
    <li><a href="./demos/${d.id}/">Ouvrir la démo</a></li>
    <li><a href="./demos/${d.id}/rapport.html">Rapport d'audit client</a></li>
    <li><a href="./demos/${d.id}/audit/">Audit guidé (lecture seule)</a></li>
  </ul>
</article>`,
).join("\n");

rmSync("dist", { recursive: true, force: true });
mkdirSync("dist", { recursive: true });

const missing = [];
const copy = (from, to) => {
  if (!existsSync(from)) return missing.push(from);
  cpSync(from, to, { recursive: true });
};

writeFileSync(
  "dist/index.html",
  readFileSync("index.html", "utf8")
    .replaceAll("{{REPO}}", REPO)
    .replace("{{DEMOS}}", demosHtml)
    .replace("{{DATE}}", new Date().toLocaleDateString("fr-CH", { dateStyle: "long", timeZone: "Europe/Zurich" })),
);
copy("site.css", "dist/site.css");
copy("../docs/media/seuil-presentation.mp4", "dist/media/seuil-presentation.mp4");
copy("../packages/ui/storybook-static", "dist/storybook");
for (const d of DEMOS) {
  copy(`../demos/${d.id}/dist`, `dist/demos/${d.id}`);
  copy(`../demos/${d.id}/seuil-report/rapport.html`, `dist/demos/${d.id}/rapport.html`);
  copy(`../demos/${d.id}/review-export`, `dist/demos/${d.id}/audit`);
  copy(`examples/${d.id}-rouge.html`, `dist/demos/${d.id}/rapport-pr-rouge.html`);
}
// GitHub Pages: serve files as they are (no Jekyll processing).
writeFileSync("dist/.nojekyll", "");

if (missing.length > 0) {
  console.error(`Missing inputs:\n${missing.map((m) => `  ${m}`).join("\n")}`);
  process.exit(1);
}
console.log("Showcase built in site/dist.");
