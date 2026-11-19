// Builds one CSS file and one JS module per theme, then a combined stylesheet.
// Each theme's CSS variables are scoped to [data-theme="<name>"], so switching
// theme is a single attribute change on any ancestor element.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import StyleDictionary from "style-dictionary";

const themes = readdirSync("src/themes")
  .filter((f) => f.endsWith(".tokens.json"))
  .map((f) => f.replace(".tokens.json", ""))
  .sort();

for (const theme of themes) {
  const sd = new StyleDictionary({
    source: ["src/*.tokens.json", `src/themes/${theme}.tokens.json`],
    log: { verbosity: "silent" },
    platforms: {
      css: {
        transformGroup: "css",
        buildPath: "dist/",
        files: [
          {
            destination: `${theme}.css`,
            format: "css/variables",
            options: { selector: `[data-theme="${theme}"]`, outputReferences: true },
          },
        ],
      },
      js: {
        transformGroup: "js",
        buildPath: "dist/",
        files: [
          { destination: `${theme}.js`, format: "javascript/es6" },
          { destination: `${theme}.d.ts`, format: "typescript/es6-declarations" },
        ],
      },
    },
  });
  await sd.buildAllPlatforms();
}

writeFileSync("dist/tokens.css", themes.map((t) => readFileSync(`dist/${t}.css`, "utf8")).join("\n"));
writeFileSync(
  "dist/index.js",
  `export const themes = ${JSON.stringify(themes)};\n` +
    themes.map((t) => `export * as ${t} from "./${t}.js";`).join("\n") +
    "\n",
);
writeFileSync(
  "dist/index.d.ts",
  `export declare const themes: ${JSON.stringify(themes)};\n` +
    themes.map((t) => `export * as ${t} from "./${t}.js";`).join("\n") +
    "\n",
);
console.log(`Built ${themes.length} themes: ${themes.join(", ")}`);
