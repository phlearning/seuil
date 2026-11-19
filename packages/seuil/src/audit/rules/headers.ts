import type { Finding, Reference, Severity } from "../../results.js";
import { locate, openTarget } from "../page.js";
import type { Rule } from "../types.js";

const OWASP = (id: string): Reference => ({ standard: "OWASP Secure Headers", id, url: "https://owasp.org/www-project-secure-headers/" });
/** nLPD art. 8: appropriate technical measures to secure personal data. */
const NLPD_8: Reference = { standard: "nLPD (RS 235.1)", id: "art. 8", url: "https://www.fedlex.admin.ch/eli/cc/2022/491/fr#art_8" };

export type Csp = Map<string, string[]>;

export function parseCsp(header: string): Csp {
  const csp: Csp = new Map();
  for (const part of header.split(";")) {
    const [name, ...values] = part.trim().split(/\s+/);
    // The first occurrence of a directive wins, as in browsers.
    if (name && !csp.has(name.toLowerCase())) csp.set(name.toLowerCase(), values);
  }
  return csp;
}

export interface CspIssue {
  severity: Severity;
  message: string;
  suggestion: string;
}

/** Weaknesses that let an injected script run, plus missing hardening directives. */
export function analyzeCsp(csp: Csp): CspIssue[] {
  const issues: CspIssue[] = [];
  const scripts = csp.get("script-src") ?? csp.get("default-src");
  if (!scripts) {
    issues.push({ severity: "error", message: "CSP sets neither script-src nor default-src: scripts are not restricted.", suggestion: "Add default-src 'self' (or a script-src)." });
  } else {
    const source = csp.has("script-src") ? "script-src" : "default-src";
    const hasNonceOrHash = scripts.some((s) => /^'(nonce|sha256|sha384|sha512)-/.test(s));
    if (scripts.includes("'unsafe-inline'") && !hasNonceOrHash && !scripts.includes("'strict-dynamic'")) {
      issues.push({ severity: "error", message: `${source} allows 'unsafe-inline': an injected <script> would run.`, suggestion: "Remove 'unsafe-inline'; move inline scripts to files or use nonces." });
    }
    if (scripts.includes("'unsafe-eval'")) {
      issues.push({ severity: "error", message: `${source} allows 'unsafe-eval'.`, suggestion: "Remove 'unsafe-eval' and the eval-like code that needs it." });
    }
    const wide = scripts.filter((s) => s === "*" || s === "http:" || s === "https:" || s === "data:");
    if (wide.length > 0) {
      issues.push({ severity: "error", message: `${source} allows scripts from ${wide.join(" ")}: almost any origin.`, suggestion: "List the exact origins, or use 'self'." });
    }
  }
  const objects = csp.get("object-src") ?? csp.get("default-src");
  if (!objects || !(objects.length === 1 && objects[0] === "'none'")) {
    issues.push({ severity: "warning", message: "CSP does not set object-src 'none'.", suggestion: "Add object-src 'none'." });
  }
  if (!csp.has("base-uri")) {
    issues.push({ severity: "warning", message: "CSP does not set base-uri: an injected <base> could redirect relative URLs.", suggestion: "Add base-uri 'self' (or 'none')." });
  }
  return issues;
}

export const headersRule: Rule = {
  id: "security/headers",
  async run(page, target) {
    // Headers belong to a deployed page; a Storybook iframe says nothing about production.
    if (target.kind !== "page") return [];
    const response = await openTarget(page, target);
    if (!response) return [];
    const headers = await response.allHeaders();
    const https = new URL(target.url).protocol === "https:";

    const findings: Finding[] = [];
    const add = (severity: Severity, header: string, message: string, suggestion: string, refs: Reference[] = [OWASP(header)]) =>
      findings.push({ rule: "security/headers", severity, target: locate(target, { selector: header, snippet: headers[header] ?? "(absent)" }), message, references: refs, suggestion });

    const csp = headers["content-security-policy"];
    if (!csp) {
      const reportOnly = headers["content-security-policy-report-only"];
      add(
        "error",
        "content-security-policy",
        reportOnly ? "Only a report-only CSP is sent: nothing is actually blocked." : "No Content-Security-Policy: an injected script runs with full access to the page and its forms.",
        "Send a CSP such as: default-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'.",
        [OWASP("content-security-policy"), NLPD_8],
      );
    } else {
      for (const issue of analyzeCsp(parseCsp(csp))) {
        add(issue.severity, "content-security-policy", issue.message, issue.suggestion, issue.severity === "error" ? [OWASP("content-security-policy"), NLPD_8] : [OWASP("content-security-policy")]);
      }
      if (!parseCsp(csp).has("frame-ancestors") && !headers["x-frame-options"]) {
        add("warning", "content-security-policy", "Nothing prevents other sites from framing this page (clickjacking).", "Add frame-ancestors 'self' to the CSP.");
      }
    }

    if (https) {
      const hsts = headers["strict-transport-security"];
      const maxAge = Number(/max-age=(\d+)/i.exec(hsts ?? "")?.[1] ?? 0);
      if (!hsts) add("error", "strict-transport-security", "No HSTS: the first visit can be downgraded to plain HTTP.", "Send Strict-Transport-Security: max-age=31536000; includeSubDomains.", [OWASP("strict-transport-security"), NLPD_8]);
      else if (maxAge < 15_552_000) add("warning", "strict-transport-security", `HSTS max-age is ${maxAge} s, under 180 days.`, "Use max-age=31536000 (one year).");
    }
    if (headers["x-content-type-options"]?.toLowerCase() !== "nosniff") {
      add("warning", "x-content-type-options", "X-Content-Type-Options: nosniff is missing.", "Send X-Content-Type-Options: nosniff.");
    }
    if (!headers["referrer-policy"]) {
      add("warning", "referrer-policy", "No Referrer-Policy: the policy depends on each browser's default.", "Send Referrer-Policy: strict-origin-when-cross-origin (or no-referrer).");
    }
    if (!headers["permissions-policy"]) {
      add("warning", "permissions-policy", "No Permissions-Policy: embedded content may ask for camera, microphone or location.", "Send Permissions-Policy: camera=(), microphone=(), geolocation=().");
    }
    return findings;
  },
};
