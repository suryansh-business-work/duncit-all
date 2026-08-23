import { readFileSync, writeFileSync } from "node:fs";

/**
 * Register a new bundle namespace in @duncit/i18n and re-export it from
 * @duncit/app-settings. name = file base, CONST = exported symbol, key = the
 * SURFACE_BUNDLES key.
 */
export function register(file, CONST, surfaceKey) {
  // bundles.ts
  {
    const p = "packages/i18n/src/bundles.ts";
    let s = readFileSync(p, "utf8");
    const crlf = s.includes("\r\n");
    const nl = crlf ? "\r\n" : "\n";
    const importLine = `import { ${CONST} } from './bundles/${file}';`;
    if (!s.includes(importLine)) {
      const anchor = `import { MEDIA_BUNDLE } from './bundles/media';`;
      s = s.replace(anchor, `${anchor}${nl}${importLine}`);
    }
    if (!s.split(nl).some((l) => l.trim() === `${CONST},`)) {
      // both the export block and nothing else uses a bare "  MEDIA_BUNDLE," twice
      s = s.replace(`  MEDIA_BUNDLE,${nl}  MWEB_BUNDLE,`, `  MEDIA_BUNDLE,${nl}  ${CONST},${nl}  MWEB_BUNDLE,`);
    }
    if (!s.includes(`  ${surfaceKey}: ${CONST},`)) {
      s = s.replace(`  media: MEDIA_BUNDLE,`, `  media: MEDIA_BUNDLE,${nl}  ${surfaceKey}: ${CONST},`);
    }
    writeFileSync(p, s, "utf8");
  }
  // index.ts
  {
    const p = "packages/i18n/src/index.ts";
    let s = readFileSync(p, "utf8");
    const nl = s.includes("\r\n") ? "\r\n" : "\n";
    if (!s.includes(`  ${CONST},`)) {
      s = s.replace(`  MEDIA_BUNDLE,${nl}  MWEB_BUNDLE,`, `  MEDIA_BUNDLE,${nl}  ${CONST},${nl}  MWEB_BUNDLE,`);
    }
    writeFileSync(p, s, "utf8");
  }
  // app-settings re-export
  {
    const p = "packages/app-settings/src/index.ts";
    let s = readFileSync(p, "utf8");
    const nl = s.includes("\r\n") ? "\r\n" : "\n";
    if (!s.includes(`  ${CONST},`)) {
      s = s.replace(`  MEDIA_BUNDLE,${nl}  mergeCatalogues,`, `  MEDIA_BUNDLE,${nl}  ${CONST},${nl}  mergeCatalogues,`);
    }
    writeFileSync(p, s, "utf8");
  }
  console.log("registered", CONST);
}
