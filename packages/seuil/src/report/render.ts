import type { CriterionStatus, DataFlow, Finding } from "../results.js";
import { STRINGS, type Strings } from "./i18n.js";
import type { ReportModel } from "./model.js";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const where = (f: Finding) => [f.target.theme && `[${f.target.theme}]`, f.target.id, f.target.selector].filter(Boolean).join(" ");

const date = (iso: string, lang: string) => new Date(iso).toLocaleString(lang === "fr" ? "fr-CH" : "en-GB", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Zurich" });

const STATUS_CLASS: Record<CriterionStatus, string> = {
  "auto-fail": "fail",
  "reviewed-fail": "fail",
  "to-review": "todo",
  "reviewed-ok": "ok",
  "not-applicable": "na",
};

function flowRow(f: DataFlow, t: (typeof STRINGS)["fr"]): string[] {
  return [
    f.target,
    f.host,
    f.provider?.name ?? t.unknownProvider,
    f.provider ? `${f.provider.company} (${f.provider.country})` : "-",
    f.serverCountry ?? "?",
    f.beforeInteraction ? t.yes : t.no,
    f.allowed ? t.yes : t.no,
    f.nlpd.join(", "),
  ];
}

function findingsHtml(findings: Finding[], t: (typeof STRINGS)["fr"]): string {
  if (findings.length === 0) return `<p>${t.noFinding}</p>`;
  return `<ul class="findings">${findings
    .map(
      (f) => `<li class="${f.severity}">
  <p><strong>${t.severity[f.severity]}</strong> <code>${esc(f.rule)}</code> ${f.references.map((r) => (r.url ? `<a href="${esc(r.url)}">${esc(`${r.standard} ${r.id}`)}</a>` : esc(`${r.standard} ${r.id}`))).join(", ")}</p>
  <p>${esc(f.message).replace(/\n/g, "<br>")}</p>
  <p class="meta">${t.where} : <code>${esc(where(f))}</code></p>
  ${f.suggestion ? `<p class="meta">${t.fix} : ${esc(f.suggestion)}</p>` : ""}
</li>`,
    )
    .join("\n")}</ul>`;
}

export function renderHtml(m: ReportModel): string {
  const t = STRINGS[m.lang];
  const cov = m.coverage;
  const principles = ["1", "2", "3", "4"];
  const wcagRows = principles
    .map((p) => {
      const rows = cov.filter((c) => c.criterion.principle === p);
      return `<tr class="group"><th colspan="5" scope="colgroup">${p}. ${esc(m.principles[p]?.[m.lang] ?? "")}</th></tr>
${rows
  .map((c) => {
    const notes = [
      c.failures.length > 0 ? t.autoFailures(c.failures.length) : "",
      c.stalePages.length > 0 ? t.changedPages(c.stalePages) : "",
      c.status === "to-review" && c.suggestNotApplicable ? t.suggestedNa : "",
      c.review?.comment ? esc(c.review.comment) : "",
    ].filter(Boolean);
    return `<tr><th scope="row">${c.criterion.id} ${esc(c.criterion.title[m.lang])}</th><td>${c.criterion.level}</td><td>${c.criterion.wcag21 ? t.yes : t.no}</td><td><span class="badge ${STATUS_CLASS[c.status]}">${t.statuses[c.status]}</span></td><td>${notes.join("<br>")}</td></tr>`;
  })
  .join("\n")}`;
    })
    .join("\n");

  const count = (fs: Finding[]) => t.errorsWarnings(fs.filter((f) => f.severity === "error").length, fs.filter((f) => f.severity === "warning").length);
  const geo = m.dataFlows.some((f) => f.serverCountry && f.serverCountry !== "local");

  return `<!doctype html>
<html lang="${m.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(t.title)} - ${esc(m.client)}</title>
<style>
  :root { --ink: #1b1f24; --muted: #4a5560; --line: #c9ced4; --ok: #146c2e; --fail: #a4161a; --todo: #7a4b00; --na: #4a5560; }
  * { box-sizing: border-box; }
  body { font: 15px/1.5 system-ui, sans-serif; color: var(--ink); background: #fff; margin: 0; padding: 32px 16px; }
  main { max-width: 64rem; margin: 0 auto; }
  h1 { font-size: 1.8rem; margin: 0 0 4px; }
  h2 { font-size: 1.3rem; margin: 40px 0 12px; border-bottom: 2px solid var(--ink); padding-bottom: 4px; }
  .meta, .lede { color: var(--muted); }
  .cards { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(min(100%, 14rem), 1fr)); }
  .card { border: 1px solid var(--line); border-radius: 8px; padding: 12px 16px; }
  .card strong { display: block; font-size: 1.2rem; }
  table { border-collapse: collapse; width: 100%; font-size: 0.9rem; }
  th, td { text-align: left; vertical-align: top; padding: 6px 8px; border-bottom: 1px solid var(--line); }
  thead th { border-bottom: 2px solid var(--ink); }
  tr.group th { background: #eef0f2; font-size: 1rem; }
  .badge { display: inline-block; padding: 1px 8px; border-radius: 999px; border: 1.5px solid currentColor; font-weight: 600; white-space: nowrap; }
  .ok { color: var(--ok); } .fail { color: var(--fail); } .todo { color: var(--todo); } .na { color: var(--na); }
  .findings { list-style: none; padding: 0; }
  .findings li { border-left: 4px solid var(--todo); padding: 4px 12px; margin: 0 0 12px; }
  .findings li.error { border-color: var(--fail); }
  .findings p { margin: 2px 0; }
  code { font-size: 0.85em; overflow-wrap: anywhere; }
  .table-wrap { overflow-x: auto; }
  a { color: #0b4f9c; }
  @media print { body { padding: 0; } h2 { break-after: avoid; } tr, li { break-inside: avoid; } a { color: inherit; } }
</style>
</head>
<body>
<main>
<h1>${esc(t.title)}</h1>
<p class="lede">${t.client} : <strong>${esc(m.client)}</strong> · ${t.date} : ${esc(date(m.generatedAt, m.lang))} · ${t.tool} : ${esc(m.tool)}</p>

<h2>${t.summary}</h2>
<div class="cards">
  <div class="card"><span>WCAG 2.2 AA</span><strong class="${m.summary.verdict === "compliant" ? "ok" : m.summary.verdict === "non-compliant" ? "fail" : "todo"}">${t.verdict[m.summary.verdict]}</strong><span class="meta">${t.coverageLine(m.summary)}</span></div>
  <div class="card"><span>${t.ech}</span><strong class="${m.ech.verdict === "compliant" ? "ok" : m.ech.verdict === "non-compliant" ? "fail" : "todo"}">${t.echVerdict[m.ech.verdict]}</strong><span class="meta">${t.coverageLine(m.ech)}</span></div>
  <div class="card"><span>${t.privacy}</span><strong>${count(m.privacy)}</strong><span class="meta">${t.register} : ${m.dataFlows.length}</span></div>
  <div class="card"><span>${t.security}</span><strong>${count(m.security)}</strong></div>
</div>
${m.errors.length > 0 ? `<p class="fail"><strong>${t.incomplete(m.errors.length)}</strong></p>` : ""}

<h2>${t.scope}</h2>
<p><strong>${t.pages}</strong></p>
<ul>${m.pages.map((p) => `<li><code>${esc(p)}</code></li>`).join("")}</ul>
<p><strong>${t.rulesRun}</strong> : ${m.rules.map((r) => `<code>${esc(r)}</code>`).join(", ")}</p>
<p>${t.standards}</p>

<h2>${t.wcagTable}</h2>
<div class="table-wrap"><table>
<thead><tr><th scope="col">${t.criterion}</th><th scope="col">${t.level}</th><th scope="col">${t.inEch}</th><th scope="col">${t.status}</th><th scope="col">${t.detail}</th></tr></thead>
<tbody>
${wcagRows}
</tbody></table></div>

<h2>${t.accessibility}</h2>
${findingsHtml(m.accessibility, t)}

<h2>${t.privacy}</h2>
${findingsHtml(m.privacy, t)}
<h3>${t.register}</h3>
${m.dataFlows.length === 0 ? `<p>${t.noFinding}</p>` : `<div class="table-wrap"><table><thead><tr>${t.registerCols.map((c) => `<th scope="col">${c}</th>`).join("")}</tr></thead><tbody>${m.dataFlows.map((f) => `<tr>${flowRow(f, t).map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`}

<h2>${t.security}</h2>
${findingsHtml(m.security, t)}

<h2>${t.method}</h2>
<ul>${t.methodText.map((p) => `<li>${p}</li>`).join("")}</ul>
<h3>${t.limits}</h3>
<ul>${t.limitsText.map((p) => `<li>${p}</li>`).join("")}</ul>
${geo ? `<p class="meta">${t.attribution.replace("https://db-ip.com", '<a href="https://db-ip.com">https://db-ip.com</a>')}</p>` : ""}
</main>
</body>
</html>
`;
}

/** Pull request comment: short, errors first. The marker lets CI update the same comment. */
export function renderMarkdown(m: ReportModel): string {
  const t = STRINGS[m.lang];
  const all = [...m.accessibility, ...m.privacy, ...m.security, ...m.other];
  const errors = all.filter((f) => f.severity === "error");
  const warnings = all.filter((f) => f.severity === "warning");
  const icon = errors.length > 0 || m.errors.length > 0 ? "❌" : "✅";

  const lines = [
    "<!-- seuil-report -->",
    `## ${icon} ${t.prTitle}`,
    "",
    `**${t.errorsWarnings(errors.length, warnings.length)}** · WCAG 2.2 AA : ${t.coverageLine(m.summary)}`,
  ];
  if (m.errors.length > 0) lines.push("", `> **${t.incomplete(m.errors.length)}**`);
  if (errors.length > 0) lines.push("", ...markdownTable(errors, t, 25));
  if (warnings.length > 0) {
    lines.push("", "<details>", `<summary>${t.warningsTitle(warnings.length)}</summary>`, "", ...markdownTable(warnings, t, 25), "", "</details>");
  }
  return lines.join("\n") + "\n";
}

interface Group {
  finding: Finding;
  places: string[];
}

/** Same rule, element and message on several pages: one row listing the pages. */
function groupFindings(findings: Finding[]): Group[] {
  const groups = new Map<string, Group>();
  for (const f of findings) {
    const key = [f.rule, f.target.theme ?? "", f.target.selector ?? f.target.id, f.message, f.suggestion ?? ""].join("\u0000");
    const place = /^https?:\/\//.test(f.target.id) ? new URL(f.target.id).pathname : f.target.id;
    const group = groups.get(key) ?? { finding: f, places: [] };
    if (!group.places.includes(place)) group.places.push(place);
    groups.set(key, group);
  }
  return [...groups.values()];
}

function markdownTable(findings: Finding[], t: Strings, limit: number): string[] {
  // Escape HTML too: GitHub would otherwise drop text such as "<label for>".
  const cell = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\|/g, "\\|").replace(/\n/g, " ");
  const code = (s: string) => `<code>${cell(s)}</code>`;
  const groups = groupFindings(findings);
  const shown = groups.slice(0, limit);
  const rows = shown.map(({ finding: f, places }) => {
    const element = [f.target.theme && `[${f.target.theme}]`, f.target.selector ?? (places.length > 1 ? "" : f.target.id)].filter(Boolean).join(" ");
    const where = [element && code(element), places.length > 1 || f.target.selector ? t.onPages(places.map(cell)) : ""].filter(Boolean).join("<br>");
    return `| ${code(f.rule)} | ${where} | ${cell(f.message)} | ${cell(f.suggestion ?? "")} |`;
  });
  return [
    `| ${t.ruleCol} | ${t.where} | Description | ${t.fix} |`,
    "|---|---|---|---|",
    ...rows,
    ...(groups.length > shown.length ? ["", t.prMore(groups.length - shown.length)] : []),
  ];
}

/** Data-flow register as CSV (RFC 4180, UTF-8 with BOM so spreadsheets keep the accents). */
export function renderCsv(m: ReportModel): string {
  const t = STRINGS[m.lang];
  const quote = (s: string) => (/[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const header = [...t.registerCols, "IP", "Types", m.lang === "fr" ? "Données" : "Data", "CLOUD Act"];
  const rows = m.dataFlows.map((f) => [...flowRow(f, t), f.serverIp ?? "", f.resourceTypes.join(" "), f.data.join(" / "), f.provider ? (f.provider.cloudAct ? t.yes : t.no) : "?"]);
  return "﻿" + [header, ...rows].map((r) => r.map(quote).join(",")).join("\r\n") + "\r\n";
}
