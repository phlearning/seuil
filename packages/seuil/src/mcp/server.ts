/**
 * `seuil mcp`: Seuil as an MCP server (stdio), so an AI client can audit, read the
 * findings, look at the offending element, fix the code and audit again.
 * Everything goes through the protocol: nothing here may write to stdout.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { chromium } from "playwright";
import { z } from "zod";
import { auditTargets } from "../commands/audit.js";
import { checkCommand } from "../commands/check.js";
import { reportCommand } from "../commands/report.js";
import { loadConfig } from "../config.js";
import type { Finding, Results } from "../results.js";
import { computeCoverage, summarize } from "../review/coverage.js";
import { loadCriteria } from "../review/criteria.js";
import { loadReview } from "../review/store.js";
import { TOOL } from "../version.js";

/** Same rule, element and message on several pages: one entry listing the pages. */
export function groupFindings(findings: Finding[]) {
  const groups = new Map<string, { rule: string; severity: string; element?: string; theme?: string; message: string; fix?: string; references: string[]; snippet?: string; pages: string[] }>();
  for (const f of findings) {
    const key = [f.rule, f.target.theme, f.target.selector ?? f.target.id, f.message].join("\u0000");
    const group = groups.get(key) ?? {
      rule: f.rule,
      severity: f.severity,
      ...(f.target.selector && { element: f.target.selector }),
      ...(f.target.theme && { theme: f.target.theme }),
      message: f.message,
      ...(f.suggestion && { fix: f.suggestion }),
      references: f.references.map((r) => `${r.standard} ${r.id}`),
      ...(f.target.snippet && { snippet: f.target.snippet }),
      pages: [],
    };
    if (!group.pages.includes(f.target.id)) group.pages.push(f.target.id);
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "error" ? -1 : 1));
}

const json = (value: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] });
const fail = (message: string) => ({ content: [{ type: "text" as const, text: message }], isError: true });

function summary(findings: Finding[]) {
  const byRule: Record<string, { errors: number; warnings: number }> = {};
  for (const f of findings) {
    const r = (byRule[f.rule] ??= { errors: 0, warnings: 0 });
    if (f.severity === "error") r.errors++;
    else r.warnings++;
  }
  return { errors: findings.filter((f) => f.severity === "error").length, warnings: findings.filter((f) => f.severity === "warning").length, byRule };
}

export function createSeuilServer(cwd = process.cwd()): McpServer {
  const server = new McpServer({ name: "seuil", version: TOOL.version });
  const path = (p: string) => resolve(cwd, p);

  server.registerTool(
    "audit",
    {
      title: "Audit pages",
      description:
        "Run Seuil's accessibility (WCAG 2.2 AA), third-party (nLPD) and security checks on a URL, a running Storybook or a built folder. Returns findings grouped by element, with CSS selector, HTML snippet and suggested fix.",
      inputSchema: {
        target: z.string().describe("URL (http://127.0.0.1:4301/), Storybook URL, or folder path"),
        rules: z.array(z.string()).optional().describe('Subset of rules, e.g. ["a11y/axe","a11y/keyboard"]. Default: all.'),
        config: z.string().optional().describe("seuil.config.json for firstParty, allowThirdParties, snapshots. Default: ./seuil.config.json if present."),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ target, rules, config }) => {
      try {
        const cfg = loadConfig(path(config ?? "seuil.config.json"), { required: config !== undefined });
        const input = /^https?:\/\//.test(target) ? target : path(target);
        const outcome = await auditTargets([input], cfg, { ...(rules && { rules }) });
        return json({
          targets: outcome.targets,
          ...summary(outcome.findings),
          ...(outcome.errors.length > 0 && { incomplete: outcome.errors }),
          findings: groupFindings(outcome.findings).slice(0, 60),
          dataFlows: outcome.dataFlows.map((f) => ({ page: f.target, host: f.host, provider: f.provider?.name, company: f.provider?.company, country: f.provider?.country, server: f.serverCountry, declared: f.allowed })),
        });
      } catch (error) {
        return fail(`audit failed: ${(error as Error).message}`);
      }
    },
  );

  server.registerTool(
    "check",
    {
      title: "Check the whole project",
      description:
        "Run everything seuil.config.json describes (token contrast, every target, dependencies) and write seuil-results.json. Use it as the gate: exit code 0 means compliant for the automated checks.",
      inputSchema: {
        config: z.string().optional().describe("Path to seuil.config.json. Default: ./seuil.config.json"),
        updateSnapshots: z.boolean().optional().describe("Accept intended accessibility tree changes. Only after the user confirms the change is intended."),
      },
      annotations: { openWorldHint: true },
    },
    async ({ config, updateSnapshots }) => {
      const configPath = path(config ?? "seuil.config.json");
      const output = join(dirname(configPath), "seuil-results.json");
      const outcome = await checkCommand({ config: configPath, output, ...(updateSnapshots && { updateSnapshots: true }) });
      if (!outcome.results) return fail(outcome.output);
      return json({
        exitCode: outcome.code,
        resultsFile: output,
        ...summary(outcome.results.findings),
        ...(outcome.results.errors && { incomplete: outcome.results.errors }),
        findings: groupFindings(outcome.results.findings).slice(0, 60),
      });
    },
  );

  server.registerTool(
    "findings",
    {
      title: "Read findings",
      description: "Read and filter findings from a seuil-results.json written by check, without running the checks again.",
      inputSchema: {
        results: z.string().optional().describe("Default: ./seuil-results.json"),
        rule: z.string().optional().describe('Prefix filter, e.g. "a11y/" or "privacy/consent"'),
        severity: z.enum(["error", "warning"]).optional(),
        page: z.string().optional().describe("Substring of the page URL or story id"),
        limit: z.number().int().positive().max(200).optional(),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ results, rule, severity, page, limit }) => {
      const file = path(results ?? "seuil-results.json");
      if (!existsSync(file)) return fail(`No results at ${file}: run the check tool first.`);
      const all = (JSON.parse(readFileSync(file, "utf8")) as Results).findings;
      const picked = all.filter((f) => (!rule || f.rule.startsWith(rule)) && (!severity || f.severity === severity) && (!page || f.target.id.includes(page)));
      return json({ total: picked.length, findings: groupFindings(picked).slice(0, limit ?? 40) });
    },
  );

  server.registerTool(
    "screenshot",
    {
      title: "Look at a page",
      description:
        "Screenshot a page as a user sees it, optionally outlining one element (the selector of a finding) and giving it keyboard focus. Use it to see what a finding means before fixing it, and to confirm the fix.",
      inputSchema: {
        url: z.string().describe("Page URL"),
        selector: z.string().optional().describe("CSS selector to outline, e.g. a finding's element"),
        focus: z.boolean().optional().describe("Give the element keyboard focus first (to see its focus indicator)"),
        width: z.number().int().min(320).max(2560).optional().describe("Viewport width. 320 shows reflow issues, 640 a 200% zoom. Default 1280"),
        height: z.number().int().min(200).max(2000).optional().describe("Default 800"),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ url, selector, focus, width, height }) => {
      const browser = await chromium.launch();
      try {
        const page = await browser.newPage({ viewport: { width: width ?? 1280, height: height ?? 800 } });
        await page.goto(url, { waitUntil: "load" });
        let note = `${url} at ${width ?? 1280}x${height ?? 800}`;
        if (selector) {
          const box = await page.evaluate(
            ([sel, doFocus]) => {
              const el = document.querySelector(sel as string) as HTMLElement | null;
              if (!el) return null;
              el.scrollIntoView({ block: "center" });
              if (doFocus) {
                document.body.focus();
                el.focus();
              }
              const r = el.getBoundingClientRect();
              const frame = document.createElement("div");
              Object.assign(frame.style, {
                position: "fixed", left: `${r.left - 4}px`, top: `${r.top - 4}px`, width: `${r.width + 8}px`, height: `${r.height + 8}px`,
                border: "3px solid #e0115f", borderRadius: "4px", pointerEvents: "none", zIndex: "2147483647",
              });
              document.body.appendChild(frame);
              return { x: Math.round(r.left), y: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) };
            },
            [selector, focus ?? false],
          );
          if (focus) await page.keyboard.press("Shift");
          note += box ? `, element outlined in pink at ${JSON.stringify(box)}` : `, selector not found: ${selector}`;
        }
        const png = await page.screenshot({ animations: "disabled" });
        return { content: [{ type: "image" as const, data: png.toString("base64"), mimeType: "image/png" }, { type: "text" as const, text: note }] };
      } catch (error) {
        return fail(`screenshot failed: ${(error as Error).message}`);
      } finally {
        await browser.close();
      }
    },
  );

  server.registerTool(
    "report",
    {
      title: "Render a report",
      description: "Render seuil-results.json as a pull request comment (md, returned as text), a client report (html) or the data-flow register (csv), written to a file.",
      inputSchema: {
        format: z.enum(["md", "html", "csv"]),
        lang: z.enum(["fr", "en"]).optional(),
        client: z.string().optional(),
        results: z.string().optional().describe("Default: ./seuil-results.json"),
        output: z.string().optional().describe("File for html and csv. Default: seuil-report/report.<format>"),
      },
    },
    async ({ format, lang, client, results, output }) => {
      const out = format === "md" ? undefined : path(output ?? `seuil-report/report.${format}`);
      const outcome = reportCommand({ results: path(results ?? "seuil-results.json"), format, lang: lang ?? "fr", client: client ?? "Client", ...(out && { output: out }) });
      return outcome.code === 0 ? { content: [{ type: "text" as const, text: outcome.output }] } : fail(outcome.output);
    },
  );

  server.registerTool(
    "review_status",
    {
      title: "Guided review status",
      description:
        "WCAG 2.2 A/AA coverage: which criteria failed automatically, which a person has verified, and the checklist of those still to review. Verdicts are recorded by a person in `seuil review`, not through this tool.",
      inputSchema: {
        results: z.string().optional().describe("Default: ./seuil-results.json"),
        review: z.string().optional().describe("Default: seuil-review.json next to the results"),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ results, review }) => {
      const file = path(results ?? "seuil-results.json");
      if (!existsSync(file)) return fail(`No results at ${file}: run the check tool first.`);
      const coverage = computeCoverage(loadCriteria().criteria, JSON.parse(readFileSync(file, "utf8")) as Results, loadReview(path(review ?? join(dirname(file), "seuil-review.json"))));
      return json({
        summary: summarize(coverage),
        failing: coverage.filter((c) => c.status === "auto-fail" || c.status === "reviewed-fail").map((c) => ({ id: c.criterion.id, title: c.criterion.title.en, failures: c.failures.length })),
        toReview: coverage
          .filter((c) => c.status === "to-review")
          .map((c) => ({ id: c.criterion.id, title: c.criterion.title.en, checklist: c.criterion.checklist.en, probablyNotApplicable: c.suggestNotApplicable, changedPages: c.stalePages })),
      });
    },
  );

  return server;
}

export async function startMcpServer(): Promise<void> {
  await createSeuilServer().connect(new StdioServerTransport());
}
