// Builds the whole showcase into site/dist: for each demo, serve its production
// build, run seuil check, render the client report and export the guided review.
// Needs `pnpm build` first (Storybook, demos, CLI, review UI).
import { execFileSync, spawn } from "node:child_process";

const CLI = new URL("../packages/seuil/dist/cli.js", import.meta.url).pathname;
const DEMOS = [
  { id: "sante", port: 4301, client: "Clinique des Aubépines" },
  { id: "admin", port: 4302, client: "Commune de Valfleurie" },
  { id: "energie", port: 4303, client: "Cascade Énergie" },
];

async function waitFor(url) {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`${url} did not start`);
}

const run = (cwd, ...args) => execFileSync("node", [CLI, ...args], { cwd, stdio: "inherit" });

for (const demo of DEMOS) {
  const cwd = new URL(`../demos/${demo.id}/`, import.meta.url).pathname;
  const preview = spawn("pnpm", ["--filter", `@seuil/demo-${demo.id}`, "preview"], { stdio: "ignore", shell: true });
  try {
    await waitFor(`http://127.0.0.1:${demo.port}/`);
    // A failing check must not stop the showcase: its report is the point.
    try {
      run(cwd, "check");
    } catch {}
    run(cwd, "report", "--client", demo.client, "-o", "seuil-report/rapport.html");
    run(cwd, "review", "--export", "review-export");
  } finally {
    preview.kill();
    // pnpm starts vite as a child: make sure the port is free for the next run.
    try {
      execFileSync("sh", ["-c", `lsof -t -nP -iTCP:${demo.port} -sTCP:LISTEN | xargs kill 2>/dev/null || true`]);
    } catch {}
  }
}

execFileSync("node", ["build.mjs"], { cwd: new URL("../site/", import.meta.url).pathname, stdio: "inherit" });
