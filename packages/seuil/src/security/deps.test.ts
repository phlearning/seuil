import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { checkDependencies, parseLockfile } from "./deps.js";

const PNPM_LOCK = `lockfileVersion: '9.0'

importers:
  .:
    dependencies:
      react:
        specifier: 19.1.10
        version: 19.1.10

packages:

  '@types/node@26.6.6':
    resolution: {integrity: sha512-x}

  react@19.1.10:
    resolution: {integrity: sha512-y}

  lodash@4.17.20:
    resolution: {integrity: sha512-z}

snapshots:

  react@19.1.10: {}
  ignored@9.9.9: {}
`;

describe("parseLockfile", () => {
  it("reads the packages section of a pnpm lockfile, scoped names included", () => {
    expect(parseLockfile("pnpm-lock.yaml", PNPM_LOCK)).toEqual([
      { name: "@types/node", version: "26.6.6" },
      { name: "lodash", version: "4.17.20" },
      { name: "react", version: "19.1.10" },
    ]);
  });

  it("reads nested packages of a package-lock.json", () => {
    const lock = JSON.stringify({
      packages: {
        "": { name: "app" },
        "node_modules/a": { version: "1.0.0" },
        "node_modules/a/node_modules/@s/b": { version: "2.0.0" },
        "node_modules/local": { link: true },
      },
    });
    expect(parseLockfile("package-lock.json", lock)).toEqual([
      { name: "@s/b", version: "2.0.0" },
      { name: "a", version: "1.0.0" },
    ]);
  });

  it("reads this repository's own lockfile", () => {
    const packages = parseLockfile(resolve(import.meta.dirname, "../../../../pnpm-lock.yaml"));
    expect(packages).toContainEqual({ name: "commander", version: "15.1.0" });
  });
});

describe("checkDependencies", () => {
  // Stub of the two OSV endpoints: lodash 4.17.20 has one high advisory.
  const fakeOsv: typeof fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith("/querybatch")) {
      const { queries } = JSON.parse(String(init?.body)) as { queries: { package: { name: string } }[] };
      return Response.json({ results: queries.map((q) => (q.package.name === "lodash" ? { vulns: [{ id: "GHSA-test-1234" }] } : {})) });
    }
    if (url.endsWith("/vulns/GHSA-test-1234")) {
      return Response.json({
        id: "GHSA-test-1234",
        summary: "Command injection in lodash",
        aliases: ["CVE-2021-23337"],
        database_specific: { severity: "HIGH" },
        affected: [{ package: { name: "lodash", ecosystem: "npm" }, ranges: [{ events: [{ introduced: "0" }, { fixed: "4.17.21" }] }] }],
      });
    }
    return new Response("not found", { status: 404 });
  };

  it("turns an OSV advisory into a blocking finding with the fixed version", async () => {
    const { writeFileSync, mkdtempSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const file = resolve(mkdtempSync(resolve(tmpdir(), "seuil-deps-")), "pnpm-lock.yaml");
    writeFileSync(file, PNPM_LOCK);

    const [finding, ...rest] = await checkDependencies(file, fakeOsv);
    expect(rest).toEqual([]);
    expect(finding).toMatchObject({
      rule: "security/deps",
      severity: "error",
      target: { kind: "dependency", id: "lodash@4.17.20", selector: "pnpm-lock.yaml" },
      suggestion: "Upgrade lodash to 4.17.21 or later.",
    });
    expect(finding?.message).toContain("GHSA-test-1234, CVE-2021-23337, high");
  });

  it("surfaces an OSV outage instead of reporting a clean result", async () => {
    const down: typeof fetch = async () => new Response("", { status: 503 });
    await expect(checkDependencies(resolve(import.meta.dirname, "../../../../pnpm-lock.yaml"), down)).rejects.toThrow(/503/);
  });
});
