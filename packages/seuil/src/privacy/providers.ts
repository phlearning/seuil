import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export type ProviderCategory = "fonts" | "analytics" | "tag-manager" | "advertising" | "maps" | "video" | "cdn" | "other";

export interface Provider {
  id: string;
  name: string;
  company: string;
  /** ISO 3166 code of the operating company's headquarters. */
  country: string;
  cloudAct: boolean;
  category: ProviderCategory;
  domains: string[];
  source: string;
}

/** Categories whose job is to observe visitors: they need a choice before loading. */
export const TRACKING_CATEGORIES: ProviderCategory[] = ["analytics", "tag-manager", "advertising"];

/** host equals the domain, or is a subdomain of it. */
export const matchesDomain = (host: string, domain: string) => host === domain || host.endsWith(`.${domain}`);

export function findProvider(providers: Provider[], host: string): Provider | undefined {
  return providers.find((p) => p.domains.some((d) => matchesDomain(host, d)));
}

/** data/providers/providers.json, searched from the working directory up, then next to the package. */
export function loadProviders(explicit?: string): Provider[] {
  const candidates = explicit
    ? [resolve(explicit)]
    : [
        ...ancestors(process.cwd()).map((dir) => join(dir, "data/providers/providers.json")),
        join(dirname(fileURLToPath(import.meta.url)), "../../../../data/providers/providers.json"),
      ];
  const file = candidates.find((f) => existsSync(f));
  if (!file) return [];
  return (JSON.parse(readFileSync(file, "utf8")) as { providers: Provider[] }).providers;
}

function ancestors(dir: string): string[] {
  const out = [dir];
  while (dirname(out.at(-1)!) !== out.at(-1)) out.push(dirname(out.at(-1)!));
  return out;
}
