import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * The config is now built from the catalogue, so it arrives as a promise. Astro
 * renders on the server and the promise is memoised, so each component simply
 * awaits it — every body below the frontmatter is unchanged.
 */
function* files(dir) {
  for (const e of readdirSync(dir)) {
    const f = join(dir, e);
    if (statSync(f).isDirectory()) yield* files(f);
    else if (e.endsWith(".astro") || e.endsWith(".ts")) yield f;
  }
}

for (const f of files("website/ads-website/src")) {
  if (f.includes("site-config")) continue;
  let s = readFileSync(f, "utf8").split("\r\n").join("\n");
  if (!s.includes("import { siteConfig } from")) continue;
  const before = s;
  s = s
    .split("import { siteConfig } from '../config/site-config';")
    .join("import { siteContent } from '../config/site-config';\n\nconst siteConfig = await siteContent();");
  if (s === before) {
    console.log("!! unhandled import shape:", f);
    continue;
  }
  writeFileSync(f, s, "utf8");
  console.log("wired", f.replaceAll("\\", "/"));
}
