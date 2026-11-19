import { Command } from "commander";
import { auditCommand } from "./commands/audit.js";
import { tokensCommand } from "./commands/tokens.js";

/** Exit code for runtime errors (SPEC section 5.1). */
export const EXIT_RUNTIME_ERROR = 2;

const notImplemented = (command: string, week: number) => () => {
  console.error(`seuil ${command}: not implemented yet (planned for week ${week}).`);
  process.exitCode = EXIT_RUNTIME_ERROR;
};

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
    .description("run every check configured in seuil.config.json")
    .option("-c, --config <file>", "configuration file", "seuil.config.json")
    .action(notImplemented("check", 3));

  program
    .command("review")
    .description("open the local guided audit for criteria that need a human")
    .action(notImplemented("review", 4));

  program
    .command("report")
    .description("render seuil-results.json as a PR comment, a client report or a CSV register")
    .argument("<results>", "results file")
    .option("-f, --format <format>", "html | md | csv", "html")
    .option("-l, --lang <lang>", "fr | en", "fr")
    .action(notImplemented("report", 4));

  return program;
}
