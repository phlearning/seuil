/**
 * Third parties and data protection (SPEC 4.4). These rules report technical
 * facts and the articles to look at; they are not legal advice.
 */
import type { Page, Request } from "playwright";
import type { DataFlow, Finding, Reference } from "../../results.js";
import { findProvider, matchesDomain, TRACKING_CATEGORIES, type Provider } from "../../privacy/providers.js";
import { locate, openTarget } from "../page.js";
import type { AuditTarget, Rule, RuleContext } from "../types.js";

const FEDLEX = "https://www.fedlex.admin.ch/eli/cc/2022/491/fr";
export const NLPD: Record<string, Reference> = {
  "art. 16": { standard: "nLPD (RS 235.1)", id: "art. 16", url: `${FEDLEX}#art_16` },
  "art. 19": { standard: "nLPD (RS 235.1)", id: "art. 19", url: `${FEDLEX}#art_19` },
};
const LTC_45C: Reference = { standard: "LTC (RS 784.10)", id: "art. 45c" };
const EPRIVACY: Reference = { standard: "ePrivacy 2002/58/CE", id: "art. 5(3)", url: "https://eur-lex.europa.eu/eli/dir/2002/58/oj" };

/** Cookie names set by common analytics and advertising tools. */
const TRACKING_COOKIE = /^(_ga|_ga_.+|_gid|_gat.*|_gcl_.+|_fbp|_fbc|_hjSession.*|_hjSessionUser.*|_clck|_clsk|MUID|li_sugr|bcookie|IDE|_uetsid|_uetvid)$/;

interface Observed {
  host: string;
  resourceType: string;
  serverIp?: string;
  sentCookies: boolean;
}

/** Loads the page while recording every request, then waits for late scripts. No clicks: nothing is accepted. */
async function observe(page: Page, target: AuditTarget): Promise<Observed[]> {
  const requests: Request[] = [];
  page.on("request", (request) => requests.push(request));
  await openTarget(page, target);
  await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => undefined);

  return Promise.all(
    requests
      .filter((r) => /^https?:/.test(r.url()))
      .map(async (request) => {
        const response = await request.response().catch(() => null);
        const address = await response?.serverAddr().catch(() => null);
        const headers = await request.allHeaders().catch(() => ({}) as Record<string, string>);
        return {
          host: new URL(request.url()).hostname,
          resourceType: request.resourceType(),
          ...(address?.ipAddress && { serverIp: address.ipAddress }),
          sentCookies: "cookie" in headers,
        };
      }),
  );
}

function isFirstParty(host: string, target: AuditTarget, context: RuleContext): boolean {
  const own = new URL(target.url).hostname;
  return host === own || context.firstParty.some((d) => matchesDomain(host, d));
}

function isAllowed(host: string, provider: Provider | undefined, context: RuleContext): boolean {
  return context.allowThirdParties.some((entry) => entry === provider?.id || matchesDomain(host, entry));
}

const label = (target: AuditTarget) => [target.theme && `[${target.theme}]`, target.id].filter(Boolean).join(" ");

export const thirdPartiesRule: Rule = {
  id: "privacy/third-parties",
  async run(page, target, context) {
    const observed = (await observe(page, target)).filter((o) => !isFirstParty(o.host, target, context));
    const byHost = new Map<string, Observed[]>();
    for (const o of observed) byHost.set(o.host, [...(byHost.get(o.host) ?? []), o]);

    const findings: Finding[] = [];
    for (const [host, requests] of byHost) {
      const provider = findProvider(context.providers, host);
      const serverIp = requests.find((r) => r.serverIp)?.serverIp;
      const serverCountry = serverIp ? context.geo(serverIp) : undefined;
      const abroad = (serverCountry !== undefined && serverCountry !== "CH" && serverCountry !== "local") || (provider !== undefined && provider.country !== "CH");
      const allowed = isAllowed(host, provider, context);
      const nlpd = [...(abroad ? ["art. 16"] : []), "art. 19"];

      const flow: DataFlow = {
        target: label(target),
        host,
        ...(provider && {
          provider: { id: provider.id, name: provider.name, company: provider.company, country: provider.country, cloudAct: provider.cloudAct, category: provider.category },
        }),
        ...(serverIp && { serverIp }),
        ...(serverCountry && { serverCountry }),
        resourceTypes: [...new Set(requests.map((r) => r.resourceType))].sort(),
        data: ["IP address", "user agent", "page address (Referer)", ...(requests.some((r) => r.sentCookies) ? ["cookies"] : [])],
        beforeInteraction: true,
        allowed,
        nlpd,
      };
      context.recordFlow(flow);
      if (allowed) continue;

      const who = provider ? `${provider.name} (${provider.company}, ${provider.country}${provider.cloudAct ? ", US CLOUD Act" : ""})` : "unknown provider";
      const where = serverCountry && serverCountry !== "local" ? `, server in ${serverCountry}` : "";
      findings.push({
        rule: "privacy/third-parties",
        severity: "error",
        target: locate(target, { selector: host, snippet: `${requests.length} request(s): ${flow.resourceTypes.join(", ")}` }),
        message: `Undeclared third party ${host}: ${who}${where}. Every visitor's IP address is sent to it on page load.`,
        references: nlpd.map((a) => NLPD[a]!),
        suggestion: provider?.category === "fonts" || provider?.category === "cdn"
          ? "Self-host the files: same result, no transfer."
          : "Remove it, self-host it, or once reviewed with the DPO add it to allowThirdParties.",
      });
    }
    return findings;
  },
};

export const consentRule: Rule = {
  id: "privacy/consent",
  async run(page, target, context) {
    const observed = (await observe(page, target)).filter((o) => !isFirstParty(o.host, target, context));
    const findings: Finding[] = [];

    const trackers = new Map<string, Provider>();
    for (const o of observed) {
      const provider = findProvider(context.providers, o.host);
      if (provider && TRACKING_CATEGORIES.includes(provider.category)) trackers.set(o.host, provider);
    }
    for (const [host, provider] of trackers) {
      findings.push({
        rule: "privacy/consent",
        severity: "error",
        target: locate(target, { selector: host, snippet: provider.name }),
        message: `${provider.name} (${provider.category}) is contacted on page load, before the visitor could make any choice.`,
        references: [LTC_45C, EPRIVACY, NLPD["art. 19"]!],
        suggestion: "Load it only after an explicit choice in a consent banner, or use a cookieless, self-hosted alternative.",
      });
    }

    const cookies = await page.context().cookies();
    for (const cookie of cookies.filter((c) => TRACKING_COOKIE.test(c.name))) {
      findings.push({
        rule: "privacy/consent",
        severity: "error",
        target: locate(target, { selector: `cookie ${cookie.name}`, snippet: `domain ${cookie.domain}` }),
        message: `Tracking cookie "${cookie.name}" is set before the visitor could make any choice.`,
        references: [LTC_45C, EPRIVACY],
        suggestion: "Set it only after consent, or not at all.",
      });
    }
    return findings;
  },
};
