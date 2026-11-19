/**
 * Minimal reader for the W3C Design Tokens (DTCG) format: groups, $type
 * inheritance, aliases like "{color.brand}", one base plus optional themes.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface Token {
  $type?: string;
  $value: unknown;
}

export interface ResolvedToken extends Token {
  /** The path asked for, then each alias followed, ending at the literal value. */
  chain: string[];
}

export type TokenTree = { [key: string]: unknown };

const isObject = (v: unknown): v is TokenTree => typeof v === "object" && v !== null && !Array.isArray(v);

export function flatten(tree: TokenTree): Map<string, Token> {
  const out = new Map<string, Token>();
  const walk = (node: TokenTree, path: string[], inheritedType?: string) => {
    const type = typeof node.$type === "string" ? node.$type : inheritedType;
    if ("$value" in node) {
      out.set(path.join("."), type === undefined ? { $value: node.$value } : { $type: type, $value: node.$value });
      return;
    }
    for (const [key, child] of Object.entries(node)) {
      if (key.startsWith("$") || !isObject(child)) continue;
      walk(child, [...path, key], type);
    }
  };
  walk(tree, []);
  return out;
}

export function mergeTrees(base: TokenTree, override: TokenTree): TokenTree {
  const out: TokenTree = { ...base };
  for (const [key, value] of Object.entries(override)) {
    const current = out[key];
    // A token (anything with $value) replaces wholesale; groups merge.
    out[key] = isObject(current) && isObject(value) && !("$value" in value) ? mergeTrees(current, value) : value;
  }
  return out;
}

const ALIAS = /^\{([^{}]+)\}$/;

export function resolveToken(tokens: Map<string, Token>, path: string): ResolvedToken {
  const chain: string[] = [];
  let current = path;
  for (;;) {
    if (chain.includes(current)) throw new Error(`Alias cycle: ${[...chain, current].join(" -> ")}`);
    chain.push(current);
    const token = tokens.get(current);
    if (!token) {
      throw new Error(chain.length === 1 ? `Token not found: ${current}` : `Token not found: ${current} (alias from ${chain.at(-2)})`);
    }
    const alias = typeof token.$value === "string" ? ALIAS.exec(token.$value) : null;
    if (!alias?.[1]) return { ...token, chain };
    current = alias[1];
  }
}

const readJson = (file: string): TokenTree => {
  const parsed: unknown = JSON.parse(readFileSync(file, "utf8"));
  if (!isObject(parsed)) throw new Error(`${file} is not a token object`);
  return parsed;
};

/** Loads every *.tokens.json at the root of dir, then themes/<theme>.tokens.json on top. */
export function loadTheme(dir: string, theme?: string): Map<string, Token> {
  let tree: TokenTree = {};
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".tokens.json")).sort()) {
    tree = mergeTrees(tree, readJson(join(dir, file)));
  }
  if (theme !== undefined) {
    const file = join(dir, "themes", `${theme}.tokens.json`);
    if (!existsSync(file)) throw new Error(`Theme "${theme}" not found: expected ${file}`);
    tree = mergeTrees(tree, readJson(file));
  }
  return flatten(tree);
}
