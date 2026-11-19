import { existsSync, statSync } from "node:fs";
import { serveDirectory } from "./serve.js";
import type { AuditTarget } from "./types.js";

export interface ResolvedTargets {
  targets: AuditTarget[];
  close(): Promise<void>;
}

interface StorybookIndex {
  entries?: Record<string, { id: string; type?: string; title?: string; name?: string }>;
}

async function readStorybookIndex(base: string): Promise<StorybookIndex | undefined> {
  try {
    const response = await fetch(`${base}/index.json`);
    if (!response.ok) return undefined;
    // Single-page app servers answer any path with their HTML: only real JSON counts.
    if (!(response.headers.get("content-type") ?? "").includes("json")) return undefined;
    const index = (await response.json()) as StorybookIndex;
    return index.entries ? index : undefined;
  } catch {
    return undefined;
  }
}

/** "theme:sante" -> "sante", used to label findings. */
function themeOf(globals: string): string | undefined {
  return /(?:^|;)theme:([^;]+)/.exec(globals)?.[1];
}

/**
 * Turns what the user passed into concrete pages:
 * - a folder is served locally (a built Storybook or a static site);
 * - a URL with a Storybook index.json becomes one target per story and per globals variant;
 * - any other URL is a single page.
 */
export async function resolveTargets(input: string, storybookGlobals: string[] = []): Promise<ResolvedTargets> {
  let base = input;
  let close = async () => {};
  if (!/^https?:\/\//.test(input)) {
    if (!existsSync(input) || !statSync(input).isDirectory()) throw new Error(`Not a URL or a folder: ${input}`);
    const server = await serveDirectory(input);
    base = server.url;
    close = server.close;
  }
  base = base.replace(/\/(index\.html|iframe\.html)?$/, "");

  const index = await readStorybookIndex(base);
  if (!index?.entries) {
    const url = /^https?:\/\//.test(input) ? input : base + "/";
    return { targets: [{ id: input, url, kind: "page" }], close };
  }

  const stories = Object.values(index.entries).filter((e) => (e.type ?? "story") === "story");
  const variants = storybookGlobals.length > 0 ? storybookGlobals : [""];
  const targets: AuditTarget[] = stories.flatMap((story) =>
    variants.map((globals) => {
      const theme = themeOf(globals);
      const url = `${base}/iframe.html?id=${encodeURIComponent(story.id)}&viewMode=story${globals ? `&globals=${encodeURIComponent(globals)}` : ""}`;
      return { id: story.id, url, kind: "component" as const, ...(theme && { theme }), root: "#storybook-root" };
    }),
  );
  return { targets, close };
}
