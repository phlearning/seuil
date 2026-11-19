import { Command } from "commander";

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
    .argument("<dir>", "design tokens directory")
    .action(notImplemented("tokens", 1));

  program
    .command("audit")
    .description("run accessibility, third-party and security checks on a URL or a Storybook build")
    .argument("<target>", "URL or Storybook directory")
    .action(notImplemented("audit", 2));

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
