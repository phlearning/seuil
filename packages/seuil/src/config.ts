import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { Severity } from "./results.js";
import type { PairInput } from "./tokens/check.js";

export interface AuditConfig {
  /** Storybook globals to audit each story under, e.g. ["theme:sante", "theme:admin"]. */
  storybookGlobals: string[];
  /** Folder of accessibility tree snapshots, committed with the code. */
  snapshots: string;
  /** Folder of page screenshots for the guided review (not committed). */
  screenshots: string;
}

export interface SeuilConfig {
  tokens?: { path: string; themes: string[]; pairs: PairInput[] };
  audit: AuditConfig;
  /** URLs, Storybook URLs or folders (resolved against the config file). */
  targets: string[];
  /** Lockfiles checked by security/deps; detected next to the config when empty. */
  lockfiles: string[];
  firstParty: string[];
  allowThirdParties: string[];
  level: "AA";
  failOn: Severity;
  offline: boolean;
}

const DEFAULTS: SeuilConfig = {
  audit: { storybookGlobals: [], snapshots: ".seuil/snapshots", screenshots: ".seuil/screens" },
  targets: [],
  lockfiles: [],
  firstParty: [],
  allowThirdParties: [],
  level: "AA",
  failOn: "error",
  offline: false,
};

export class ConfigError extends Error {}

function isPair(p: unknown): p is PairInput {
  if (Array.isArray(p)) return p.length === 2 && p.every((s) => typeof s === "string");
  if (typeof p !== "object" || p === null) return false;
  const o = p as Record<string, unknown>;
  return typeof o.fg === "string" && typeof o.bg === "string" && (o.kind === undefined || ["text", "large-text", "ui"].includes(o.kind as string));
}

/** Parses a config object; relative paths resolve against baseDir. */
export function parseConfig(raw: unknown, baseDir: string): SeuilConfig {
  if (typeof raw !== "object" || raw === null) throw new ConfigError("Configuration must be a JSON object");
  const input = raw as Record<string, unknown>;
  const config: SeuilConfig = { ...DEFAULTS, audit: { ...DEFAULTS.audit, snapshots: resolve(baseDir, DEFAULTS.audit.snapshots), screenshots: resolve(baseDir, DEFAULTS.audit.screenshots) } };

  if (input.audit !== undefined) {
    const a = input.audit as Record<string, unknown>;
    if (a.storybookGlobals !== undefined) {
      if (!Array.isArray(a.storybookGlobals) || !a.storybookGlobals.every((g) => typeof g === "string")) {
        throw new ConfigError("audit.storybookGlobals must be a list of strings such as \"theme:sante\"");
      }
      config.audit.storybookGlobals = a.storybookGlobals;
    }
    if (a.snapshots !== undefined) {
      if (typeof a.snapshots !== "string") throw new ConfigError("audit.snapshots must be a folder path");
      config.audit.snapshots = resolve(baseDir, a.snapshots);
    }
  }

  if (input.failOn !== undefined) {
    if (input.failOn !== "error" && input.failOn !== "warning") throw new ConfigError(`failOn must be "error" or "warning"`);
    config.failOn = input.failOn;
  }
  for (const key of ["targets", "lockfiles", "firstParty", "allowThirdParties"] as const) {
    const value = input[key];
    if (value === undefined) continue;
    if (!Array.isArray(value) || !value.every((v) => typeof v === "string")) throw new ConfigError(`${key} must be a list of strings`);
    config[key] = value;
  }
  // Folders and files are relative to the config file; URLs stay as they are.
  config.targets = config.targets.map((t) => (/^https?:\/\//.test(t) ? t : resolve(baseDir, t)));
  config.lockfiles = config.lockfiles.map((f) => resolve(baseDir, f));
  if (config.lockfiles.length === 0) {
    config.lockfiles = ["pnpm-lock.yaml", "package-lock.json"].map((f) => resolve(baseDir, f)).filter((f) => existsSync(f));
  }
  if (input.offline !== undefined) config.offline = Boolean(input.offline);

  if (input.tokens !== undefined) {
    const t = input.tokens as Record<string, unknown>;
    if (typeof t.path !== "string") throw new ConfigError("tokens.path must be a string");
    const themes = t.themes ?? [];
    if (!Array.isArray(themes) || !themes.every((s) => typeof s === "string")) throw new ConfigError("tokens.themes must be a list of strings");
    const pairs = t.pairs ?? [];
    if (!Array.isArray(pairs)) throw new ConfigError("tokens.pairs must be a list");
    pairs.forEach((p, i) => {
      if (!isPair(p)) throw new ConfigError(`tokens.pairs[${i}] must be ["fg", "bg"] or { "fg", "bg", "kind" }`);
    });
    config.tokens = { path: resolve(baseDir, t.path), themes, pairs };
  }
  return config;
}

/** Reads the config file; a missing default file yields the defaults. */
export function loadConfig(file: string, { required = false } = {}): SeuilConfig {
  const path = resolve(file);
  if (!existsSync(path)) {
    if (required) throw new ConfigError(`Configuration file not found: ${path}`);
    return parseConfig({}, process.cwd());
  }
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new ConfigError(`${path}: invalid JSON (${(error as Error).message})`);
  }
  return parseConfig(raw, dirname(path));
}
