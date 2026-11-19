import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createGeoLookup, GEOIP_FILE, isLocalAddress } from "./geo.js";
import { findProvider, loadProviders, matchesDomain } from "./providers.js";

const repoRoot = resolve(import.meta.dirname, "../../../..");

describe("providers", () => {
  const providers = loadProviders(resolve(repoRoot, "data/providers/providers.json"));

  it("matches a domain and its subdomains only", () => {
    expect(matchesDomain("fonts.googleapis.com", "fonts.googleapis.com")).toBe(true);
    expect(matchesDomain("region1.google-analytics.com", "google-analytics.com")).toBe(true);
    expect(matchesDomain("evilgoogle-analytics.com", "google-analytics.com")).toBe(false);
  });

  it("finds Google Fonts from its CSS host", () => {
    expect(findProvider(providers, "fonts.googleapis.com")?.id).toBe("google-fonts");
  });

  it("has well-formed, sourced entries", () => {
    expect(providers.length).toBeGreaterThan(5);
    for (const p of providers) {
      expect(p.domains.length, p.id).toBeGreaterThan(0);
      expect(p.country, p.id).toMatch(/^[A-Z]{2}$/);
      expect(p.source, p.id).toMatch(/^https:\/\//);
      expect(p.cloudAct, p.id).toBe(p.country === "US");
    }
  });

  it("has no domain claimed by two providers", () => {
    const all = providers.flatMap((p) => p.domains);
    expect(new Set(all).size).toBe(all.length);
  });
});

describe("geo", () => {
  it("knows private and loopback addresses", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "192.168.1.1", "172.20.0.1", "::1", "::ffff:127.0.0.1", "[::1]"]) {
      expect(isLocalAddress(ip), ip).toBe(true);
    }
    for (const ip of ["8.8.8.8", "172.32.0.1", "2001:4860:4860::8888"]) {
      expect(isLocalAddress(ip), ip).toBe(false);
    }
  });

  it("returns undefined for public addresses without a database", () => {
    const { lookup, database } = createGeoLookup("/nowhere.mmdb");
    expect(database).toBeUndefined();
    expect(lookup("127.0.0.1")).toBe("local");
    expect(lookup("8.8.8.8")).toBeUndefined();
  });

  it.runIf(existsSync(resolve(repoRoot, GEOIP_FILE)))("locates a public address with DB-IP Lite", () => {
    const { lookup } = createGeoLookup(resolve(repoRoot, GEOIP_FILE));
    expect(lookup("8.8.8.8")).toBe("US");
  });
});
