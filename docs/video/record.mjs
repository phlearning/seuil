// Records the presentation video of Seuil (about 90 s, 1280x720, French captions).
// Needs: pnpm build && pnpm showcase (site/dist), ffmpeg on the PATH.
// Usage: node docs/video/record.mjs  ->  docs/media/seuil-presentation.mp4 and .gif
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "../../packages/seuil/node_modules/playwright/index.mjs";
import { serveDirectory } from "../../packages/seuil/dist/audit/serve.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../..");
const media = join(root, "docs/media");
const raw = join(here, "out");
rmSync(raw, { recursive: true, force: true });
mkdirSync(media, { recursive: true });

const SIZE = { width: 1280, height: 720 };
const site = await serveDirectory(join(root, "site/dist"));
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: SIZE, recordVideo: { dir: raw, size: SIZE }, locale: "fr-CH" });
const page = await context.newPage();

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const BASE_CSS = `
  * { box-sizing: border-box; }
  body { margin: 0; height: 100vh; font: 28px/1.45 system-ui, sans-serif; color: #f3f6f8; background: #0f2a2a;
         display: flex; flex-direction: column; justify-content: center; padding: 64px 96px; }
  h1 { font-size: 88px; margin: 0 0 12px; letter-spacing: 0.01em; }
  h2 { font-size: 52px; margin: 0 0 28px; }
  .tag { color: #9fd6d0; font-size: 34px; margin: 0 0 24px; }
  ul { margin: 0; padding-left: 1.1em; } li { margin: 10px 0; }
  .kicker { text-transform: uppercase; letter-spacing: 0.12em; font-size: 20px; color: #9fd6d0; margin: 0 0 16px; }
  pre { background: #0a1a1a; border: 1px solid #2f5555; border-radius: 10px; padding: 18px 22px; font-size: 21px;
        line-height: 1.45; margin: 10px 0; white-space: pre-wrap; }
  .cols { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 28px; }
  .cols pre { overflow-wrap: anywhere; }
  .muted { color: #b9c7cf; }`;

async function card(html, ms) {
  await page.setContent(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>${BASE_CSS}</style></head><body>${html}</body></html>`);
  await page.waitForTimeout(ms);
}

/** Caption bar laid over real pages. */
async function caption(text) {
  await page.evaluate((t) => {
    document.getElementById("seuil-caption")?.remove();
    const bar = document.createElement("div");
    bar.id = "seuil-caption";
    bar.textContent = t;
    Object.assign(bar.style, {
      position: "fixed", left: "50%", bottom: "28px", transform: "translateX(-50%)", zIndex: 2147483647,
      background: "rgba(10, 26, 26, 0.92)", color: "#ffffff", font: "600 24px/1.35 system-ui, sans-serif",
      padding: "12px 22px", borderRadius: "10px", maxWidth: "1100px", textAlign: "center",
    });
    document.body.appendChild(bar);
  }, text);
}

async function scroll(total, ms, selector) {
  const steps = Math.max(1, Math.round(ms / 40));
  for (let i = 0; i < steps; i++) {
    await page.evaluate(([dy, sel]) => (sel ? document.querySelector(sel) : window).scrollBy(0, dy), [total / steps, selector]);
    await page.waitForTimeout(40);
  }
}

async function visit(path, text, { hold = 2500, scrollBy = 0, scrollMs = 0, wait } = {}) {
  await page.goto(`${site.url}${path}`, { waitUntil: "load" });
  if (wait) await page.waitForSelector(wait);
  await caption(text);
  await page.waitForTimeout(hold);
  if (scrollBy) await scroll(scrollBy, scrollMs);
}

// 1. Title
await card(`<p class="kicker">Projet open source · MIT</p><h1>Seuil</h1>
  <p class="tag">Rien ne passe le seuil sans être conforme.</p>
  <p class="muted">Une porte de conformité pour les agences web qui livrent des clients réglementés :<br>santé, administration publique, énergie.</p>`, 5000);

// 2. Problem
await card(`<h2>Le problème</h2><ul>
  <li>Les clients publics doivent prouver l'accessibilité : <strong>WCAG 2.2 AA, eCH-0059</strong>.</li>
  <li>Une police ou un traceur ajouté en passant envoie l'IP des visiteurs à l'étranger : <strong>nLPD</strong>.</li>
  <li>Ces défauts se voient trop tard, souvent chez le client.</li></ul>
  <p class="tag" style="margin-top:28px">Seuil les bloque dans la pull request, puis rédige le rapport pour le client.</p>`, 7000);

// 3. Showcase
await visit("/", "La vitrine : trois clients fictifs, une même fonctionnalité livrée deux fois", { hold: 2500, scrollBy: 1500, scrollMs: 5000 });

// 4. Terminal: a red pull request is blocked
const terminal = readFileSync(join(here, "terminal-energie.txt"), "utf8");
await card(`<p class="kicker">PR rouge · Cascade Énergie · mesure d'audience</p>
  <pre style="font-size:14.5px;max-height:560px;overflow:hidden" id="t">${esc(terminal)}</pre>`, 1200);
await page.evaluate(() => {
  const t = document.getElementById("t");
  t.style.overflow = "auto";
});
await caption("Google Analytics sans consentement, CSP retirée, lodash vulnérable : la PR est bloquée");
await page.waitForTimeout(2500);
await scroll(700, 5000, "#t");
await page.waitForTimeout(1500);

// 5. Pull request comment (real comment, rendered by GitHub's Markdown API)
const comment = readFileSync(join(here, "pr-comment-energie.html"), "utf8");
await page.setContent(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>
  body { margin: 0; padding: 32px 48px; font: 15px/1.5 -apple-system, "Segoe UI", system-ui, sans-serif; color: #1f2328; background: #f6f8fa; }
  .box { background: #fff; border: 1px solid #d1d9e0; border-radius: 8px; max-width: 1180px; margin: 0 auto; }
  .head { padding: 10px 16px; border-bottom: 1px solid #d1d9e0; background: #f6f8fa; border-radius: 8px 8px 0 0; color: #59636e; }
  .md { padding: 16px; } table { border-collapse: collapse; font-size: 13px; } td, th { border: 1px solid #d1d9e0; padding: 6px 10px; vertical-align: top; }
  h2 { font-size: 22px; border-bottom: 1px solid #d1d9e0; padding-bottom: 6px; } code { background: #eff2f5; padding: 1px 4px; border-radius: 4px; font-size: 12px; }
</style></head><body><div class="box"><div class="head"><strong>github-actions</strong> commented · mis à jour à chaque push</div><div class="md">${comment}</div></div></body></html>`);
await caption("Sur GitHub, un commentaire par projet, mis à jour à chaque push");
await page.waitForTimeout(3000);
await scroll(900, 6000);
await page.waitForTimeout(1000);

// 6. Guided review
await visit("/demos/sante/audit/", "Audit guidé : les 55 critères WCAG 2.2 A et AA, un verdict et un constat chacun", {
  hold: 3000, scrollBy: 1800, scrollMs: 6000, wait: "[data-criterion]",
});

// 7. Client report
await visit("/demos/sante/rapport.html", "Le rapport client, imprimable : WCAG 2.2 AA, eCH-0059, registre des flux, limites assumées", {
  hold: 3000, scrollBy: 1600, scrollMs: 6000,
});

// 8. Set up
await card(`<p class="kicker">Mettre en place</p><div class="cols">
  <div><p>GitHub Actions</p><pre>- uses: phlearning/seuil/action@main
  with:
    client: Clinique des Aubépines</pre>
  <p>GitLab CI, y compris auto-hébergé</p><pre style="font-size:18px">include:
  - remote: https://raw.githubusercontent.com/phlearning/seuil/main/gitlab/seuil.gitlab-ci.yml</pre></div>
  <div><p>seuil.config.json</p><pre style="font-size:19px">{
  "targets": [
    "https://staging.client.ch/"
  ],
  "tokens": {
    "path": "tokens",
    "themes": ["client"]
  },
  "allowThirdParties": [],
  "failOn": "error"
}</pre><p class="muted">Ou partout avec Docker :</p><pre>docker run --rm -v "$PWD:/work" \\
  ghcr.io/phlearning/seuil check</pre></div></div>`, 9000);

// 9. Use
await card(`<p class="kicker">Utiliser</p><pre style="font-size:24px">$ seuil check     # tokens, pages, tiers, sécurité, dépendances
$ seuil review    # audit guidé local, http://127.0.0.1:4310
$ seuil report --client "Commune de Valfleurie" -o rapport.html</pre>
  <ul style="margin-top:20px"><li>Une PR rouge ne passe pas : code de sortie 1, commentaire détaillé.</li>
  <li>Les critères qu'aucune machine ne juge sont vérifiés par une personne, et redeviennent « à vérifier » si la page change.</li></ul>`, 8000);

// 10. End
await card(`<h1>Seuil</h1><p class="tag">github.com/phlearning/seuil</p>
  <p class="muted">Code MIT · données de localisation : IP Geolocation by DB-IP (CC BY 4.0)<br>Clients, marques et audits de démonstration fictifs.</p>`, 4000);

await context.close();
await browser.close();
await site.close();

// Encode: H.264 MP4 for the README link and the showcase, small GIF teaser for the README.
const webm = join(raw, readdirSync(raw).find((f) => f.endsWith(".webm")));
const mp4 = join(media, "seuil-presentation.mp4");
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", webm, "-c:v", "libx264", "-preset", "slow", "-crf", "26", "-pix_fmt", "yuv420p", "-movflags", "+faststart", mp4]);
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-ss", "0", "-t", "42", "-i", mp4, "-vf",
  "fps=6,scale=720:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96[p];[b][p]paletteuse=dither=bayer:bayer_scale=4",
  join(media, "seuil-presentation.gif")]);
rmSync(raw, { recursive: true, force: true });
console.log(`Saved ${mp4} and the GIF teaser.`);
