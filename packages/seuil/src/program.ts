import { Command } from "commander";
import { auditCommand } from "./commands/audit.js";
import { checkCommand } from "./commands/check.js";
import { reportCommand } from "./commands/report.js";
import { reviewCommand } from "./commands/review.js";
import { tokensCommand } from "./commands/tokens.js";

/** Exit code for runtime errors (SPEC section 5.1). */
export const EXIT_RUNTIME_ERROR = 2;


export function createProgram(): Command {
  const program = new Command()
    .name("seuil")
    .description("Nothing crosses the threshold unless it complies.")
    .version("0.0.0");

  program
    .command("tokens")
    .description("check text/background contrast directly in DTCG design tokens")
    .argument("[dir]", "design tokens directory (default: tokens.path from the config)")
    .option("-c, --config <file>", "configuration file", "seuil.config.json")
    .option("--json <file>", "also write the results as JSON")
    .action((dir: string | undefined, opts: { config: string; json?: string }) => {
      const outcome = tokensCommand({ config: opts.config, ...(dir && { dir }), ...(opts.json && { json: opts.json }) });
      (outcome.code === 2 ? console.error : console.log)(outcome.output);
      process.exitCode = outcome.code;
    });

  program
    .command("audit")
    .description("run accessibility checks on a URL, a running Storybook or a built folder")
    .argument("<target>", "URL, Storybook URL or folder")
    .option("-c, --config <file>", "configuration file", "seuil.config.json")
    .option("--json <file>", "also write the results as JSON")
    .option("--globals <list>", "Storybook globals variants, comma separated (e.g. theme:sante,theme:admin)")
    .option("--rules <list>", "only these rules, comma separated")
    .option("-u, --update-snapshots", "accept the current accessibility trees as the new reference")
    .option("--concurrency <n>", "pages audited in parallel", "4")
    .action(async (target: string, opts: { config: string; json?: string; globals?: string; rules?: string; updateSnapshots?: boolean; concurrency: string }) => {
      const list = (value?: string) => value?.split(",").map((s) => s.trim()).filter(Boolean);
      const globals = list(opts.globals);
      const rules = list(opts.rules);
      const progress = process.stderr.isTTY
        ? (done: number, total: number) => process.stderr.write(`\r  ${done}/${total} checks${done === total ? "\n" : ""}`)
        : undefined;
      const outcome = await auditCommand({
        target,
        config: opts.config,
        ...(opts.json && { json: opts.json }),
        ...(globals && { globals }),
        ...(rules && { rules }),
        ...(opts.updateSnapshots && { updateSnapshots: true }),
        concurrency: Number(opts.concurrency) || 4,
        ...(progress && { onProgress: progress }),
      });
      (outcome.code === 2 ? console.error : console.log)(outcome.output);
      process.exitCode = outcome.code;
    });

  program
    .command("check")
    .description("run every check configured in seuil.config.json and write seuil-results.json")
    .option("-c, --config <file>", "configuration file", "seuil.config.json")
    .option("-o, --output <file>", "results file", "seuil-results.json")
    .option("-u, --update-snapshots", "accept the current accessibility trees as the new reference")
    .option("--concurrency <n>", "pages audited in parallel", "4")
    .action(async (opts: { config: string; output: string; updateSnapshots?: boolean; concurrency: string }) => {
      const progress = process.stderr.isTTY
        ? (done: number, total: number) => process.stderr.write(`\r  ${done}/${total} checks${done === total ? "\n" : ""}`)
        : undefined;
      const outcome = await checkCommand({
        config: opts.config,
        output: opts.output,
        ...(opts.updateSnapshots && { updateSnapshots: true }),
        concurrency: Number(opts.concurrency) || 4,
        ...(progress && { onProgress: progress }),
      });
      (outcome.code === 2 ? console.error : console.log)(outcome.output);
      process.exitCode = outcome.code;
    });

  program
    .command("review")
    .description("open the local guided audit for criteria that need a human (writes seuil-review.json)")
    .argument("[results]", "results file", "seuil-results.json")
    .option("-c, --config <file>", "configuration file", "seuil.config.json")
    .option("--review <file>", "review file (default: seuil-review.json next to the results)")
    .option("--reviewer <name>", "name recorded with each verdict (default: git config user.name)")
    .option("-p, --port <n>", "local port", "4310")
    .option("-l, --lang <lang>", "fr | en", "fr")
    .action(async (results: string, opts: { config: string; review?: string; reviewer?: string; port: string; lang: "fr" | "en" }) => {
      const outcome = await reviewCommand({
        results,
        config: opts.config,
        port: Number(opts.port) || 4310,
        lang: opts.lang,
        ...(opts.review && { review: opts.review }),
        ...(opts.reviewer && { reviewer: opts.reviewer }),
      });
      (outcome.code === 2 ? console.error : console.log)(outcome.message);
      process.exitCode = outcome.code;
    });

  program
    .command("report")
    .description("render seuil-results.json as a client report (html), a PR comment (md) or the data-flow register (csv)")
    .argument("[results]", "results file", "seuil-results.json")
    .option("-f, --format <format>", "html | md | csv", "html")
    .option("-l, --lang <lang>", "fr | en", "fr")
    .option("--client <name>", "client name shown in the report", "Client")
    .option("--review <file>", "guided review file (default: seuil-review.json next to the results)")
    .option("-o, --output <file>", "write to a file instead of standard output")
    .action((results: string, opts: { format: "html" | "md" | "csv"; lang: "fr" | "en"; client: string; review?: string; output?: string }) => {
      const outcome = reportCommand({ results, ...opts });
      if (outcome.code === 2) console.error(outcome.output);
      else process.stdout.write(outcome.output.endsWith("\n") ? outcome.output : outcome.output + "\n");
      process.exitCode = outcome.code;
    });

  return program;
}
