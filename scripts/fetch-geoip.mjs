// Downloads this month's DB-IP Lite country database (CC BY 4.0) into data/geoip/.
// The file is not committed: run `pnpm geoip` after cloning, and monthly to refresh it.
import { mkdirSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

const month = new Date().toISOString().slice(0, 7);
const url = `https://download.db-ip.com/free/dbip-country-lite-${month}.mmdb.gz`;

const response = await fetch(url);
if (!response.ok) {
  console.error(`Download failed (${response.status}) for ${url}. Early in the month the new file may not exist yet: retry later.`);
  process.exit(1);
}
const database = gunzipSync(Buffer.from(await response.arrayBuffer()));
mkdirSync("data/geoip", { recursive: true });
writeFileSync("data/geoip/dbip-country-lite.mmdb", database);
writeFileSync(
  "data/geoip/SOURCE.txt",
  `DB-IP Lite country database, ${month}\nSource: ${url}\nLicense: CC BY 4.0, IP Geolocation by DB-IP (https://db-ip.com)\n`,
);
console.log(`Saved data/geoip/dbip-country-lite.mmdb (${(database.length / 1e6).toFixed(1)} MB, ${month}).`);
