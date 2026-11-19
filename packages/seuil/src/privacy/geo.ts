/**
 * Server country from DB-IP Lite (CC BY 4.0, https://db-ip.com).
 * Attribution required wherever results are shown: "IP Geolocation by DB-IP".
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { Reader, type CountryResponse } from "mmdb-lib";

export const GEOIP_ATTRIBUTION = { text: "IP Geolocation by DB-IP", url: "https://db-ip.com" };
export const GEOIP_FILE = "data/geoip/dbip-country-lite.mmdb";

/** "local" for private and loopback addresses, an ISO code, or undefined when unknown. */
export type GeoLookup = (ip: string) => string | undefined;

export function isLocalAddress(ip: string): boolean {
  const v = ip.replace(/^\[|\]$/g, "").toLowerCase();
  if (v === "::1" || v.startsWith("fe80:") || v.startsWith("fc") || v.startsWith("fd")) return true;
  const v4 = v.replace(/^::ffff:/, "");
  const parts = v4.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return false;
  const [a = 0, b = 0] = parts;
  return a === 127 || a === 10 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31) || (a === 169 && b === 254);
}

function findDatabase(explicit?: string): string | undefined {
  if (explicit) return existsSync(resolve(explicit)) ? resolve(explicit) : undefined;
  if (process.env.SEUIL_GEOIP && existsSync(process.env.SEUIL_GEOIP)) return process.env.SEUIL_GEOIP;
  if (process.env.SEUIL_DATA && existsSync(join(process.env.SEUIL_DATA, "geoip/dbip-country-lite.mmdb"))) {
    return join(process.env.SEUIL_DATA, "geoip/dbip-country-lite.mmdb");
  }
  let dir = process.cwd();
  for (;;) {
    const file = join(dir, GEOIP_FILE);
    if (existsSync(file)) return file;
    if (dirname(dir) === dir) return undefined;
    dir = dirname(dir);
  }
}

/** Returns a lookup, and whether a database backs it (without one, only local addresses are known). */
export function createGeoLookup(explicit?: string): { lookup: GeoLookup; database?: string } {
  const file = findDatabase(explicit);
  const reader = file ? new Reader<CountryResponse>(readFileSync(file)) : undefined;
  const lookup: GeoLookup = (ip) => {
    if (!ip) return undefined;
    if (isLocalAddress(ip)) return "local";
    try {
      return reader?.get(ip.replace(/^\[|\]$/g, ""))?.country?.iso_code;
    } catch {
      return undefined;
    }
  };
  return file ? { lookup, database: file } : { lookup };
}
