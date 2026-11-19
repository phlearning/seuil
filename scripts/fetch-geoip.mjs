// Downloads the latest DB-IP Lite country database (CC BY 4.0) into data/geoip/.
// The file is not committed: run `pnpm geoip` after cloning, and monthly to refresh it.
// Early in a month the new file may not be published yet, so the previous month is tried next.
import { mkdirSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

const month = (offset) => {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() - offset);
  return d.toISOString().slice(0, 7);
};

for (const m of [month(0), month(1)]) {
  const url = `https://download.db-ip.com/free/dbip-country-lite-${m}.mmdb.gz`;
  const response = await fetch(url);
  if (!response.ok) {
    console.warn(`Not available (${response.status}): ${url}`);
    continue;
  }
  const database = gunzipSync(Buffer.from(await response.arrayBuffer()));
  mkdirSync("data/geoip", { recursive: true });
  writeFileSync("data/geoip/dbip-country-lite.mmdb", database);
  writeFileSync("data/geoip/SOURCE.txt", `DB-IP Lite country database, ${m}\nSource: ${url}\nLicense: CC BY 4.0, IP Geolocation by DB-IP (https://db-ip.com)\n`);
  console.log(`Saved data/geoip/dbip-country-lite.mmdb (${(database.length / 1e6).toFixed(1)} MB, ${m}).`);
  process.exit(0);
}
console.error("No DB-IP Lite database could be downloaded.");
process.exit(1);
