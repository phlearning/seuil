/**
 * Known vulnerabilities in locked dependencies, from the OSV database (osv.dev).
 * Only package names and versions are sent; never code. Disabled by "offline": true.
 */
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import type { Finding, Reference } from "../results.js";

export interface LockedPackage {
  name: string;
  version: string;
}

const NLPD_8: Reference = { standard: "nLPD (RS 235.1)", id: "art. 8", url: "https://www.fedlex.admin.ch/eli/cc/2022/491/fr#art_8" };
const OSV_API = "https://api.osv.dev/v1";

/** pnpm-lock.yaml (v6 to v9) or package-lock.json (v2, v3). */
export function parseLockfile(file: string, content = readFileSync(file, "utf8")): LockedPackage[] {
  const found = new Map<string, LockedPackage>();
  const add = (name: string, version: string) => found.set(`${name}@${version}`, { name, version });

  if (basename(file) === "package-lock.json") {
    const lock = JSON.parse(content) as { packages?: Record<string, { version?: string; link?: boolean }> };
    for (const [path, entry] of Object.entries(lock.packages ?? {})) {
      if (!path || entry.link || !entry.version) continue;
      add(path.slice(path.lastIndexOf("node_modules/") + "node_modules/".length), entry.version);
    }
  } else {
    let inPackages = false;
    for (const line of content.split("\n")) {
      if (/^\S/.test(line)) inPackages = line.startsWith("packages:");
      if (!inPackages) continue;
      const match = /^ {2}'?((?:@[^/\s']+\/)?[^@\s']+)@([0-9][^'(:\s]*)/.exec(line);
      if (match?.[1] && match[2]) add(match[1], match[2]);
    }
  }
  return [...found.values()].sort((a, b) => `${a.name}@${a.version}`.localeCompare(`${b.name}@${b.version}`));
}

interface OsvVuln {
  id: string;
  summary?: string;
  aliases?: string[];
  database_specific?: { severity?: string };
  affected?: { package?: { name?: string; ecosystem?: string }; ranges?: { events?: { fixed?: string }[] }[] }[];
}

type Fetch = typeof fetch;

async function postJson<T>(fetchImpl: Fetch, url: string, body: unknown): Promise<T> {
  const response = await fetchImpl(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error(`OSV ${url} answered ${response.status}`);
  return (await response.json()) as T;
}

async function getJson<T>(fetchImpl: Fetch, url: string): Promise<T> {
  const response = await fetchImpl(url);
  if (!response.ok) throw new Error(`OSV ${url} answered ${response.status}`);
  return (await response.json()) as T;
}

/** Returns, for each vulnerable package, the full advisories that affect it. */
export async function queryOsv(packages: LockedPackage[], fetchImpl: Fetch = fetch): Promise<{ pkg: LockedPackage; vulns: OsvVuln[] }[]> {
  const hits: { pkg: LockedPackage; ids: string[] }[] = [];
  for (let i = 0; i < packages.length; i += 1000) {
    const chunk = packages.slice(i, i + 1000);
    const { results } = await postJson<{ results: { vulns?: { id: string }[] }[] }>(fetchImpl, `${OSV_API}/querybatch`, {
      queries: chunk.map((p) => ({ package: { name: p.name, ecosystem: "npm" }, version: p.version })),
    });
    results.forEach((r, j) => {
      if (r.vulns?.length) hits.push({ pkg: chunk[j]!, ids: r.vulns.map((v) => v.id) });
    });
  }
  const details = new Map<string, OsvVuln>();
  for (const id of new Set(hits.flatMap((h) => h.ids))) {
    details.set(id, await getJson<OsvVuln>(fetchImpl, `${OSV_API}/vulns/${encodeURIComponent(id)}`));
  }
  return hits.map(({ pkg, ids }) => ({ pkg, vulns: ids.map((id) => details.get(id)!).filter(Boolean) }));
}

function fixedVersion(vuln: OsvVuln, name: string): string | undefined {
  for (const affected of vuln.affected ?? []) {
    if (affected.package?.name !== name) continue;
    for (const range of affected.ranges ?? []) {
      const fixed = range.events?.find((e) => e.fixed)?.fixed;
      if (fixed) return fixed;
    }
  }
  return undefined;
}

export async function checkDependencies(lockfile: string, fetchImpl: Fetch = fetch): Promise<Finding[]> {
  const report = await queryOsv(parseLockfile(lockfile), fetchImpl);
  return report.flatMap(({ pkg, vulns }) =>
    vulns.map((vuln): Finding => {
      const severity = (vuln.database_specific?.severity ?? "").toUpperCase();
      const cve = vuln.aliases?.find((a) => a.startsWith("CVE-"));
      const fixed = fixedVersion(vuln, pkg.name);
      return {
        rule: "security/deps",
        severity: severity === "CRITICAL" || severity === "HIGH" ? "error" : "warning",
        target: { kind: "dependency", id: `${pkg.name}@${pkg.version}`, selector: basename(lockfile) },
        message: `${pkg.name}@${pkg.version}: ${vuln.summary ?? "known vulnerability"} (${[vuln.id, cve].filter(Boolean).join(", ")}${severity ? `, ${severity.toLowerCase()}` : ""}).`,
        references: [{ standard: "OSV", id: vuln.id, url: `https://osv.dev/vulnerability/${vuln.id}` }, NLPD_8],
        ...(fixed && { suggestion: `Upgrade ${pkg.name} to ${fixed} or later.` }),
      };
    }),
  );
}
