import { readFileSync, writeFileSync } from "node:fs";
import { apply } from "./e.mjs";

const bundle = readFileSync(".tmp-loc/ai-library-bundle.txt", "utf8").trimEnd();
const copy = readFileSync(".tmp-loc/ai-library-copy.txt", "utf8").trimEnd();

// 1. The catalogue rows.
apply("packages/i18n/src/bundles/ai.ts", [
  [
    "    validation: {",
    "    /**\n     * The Prompt Library console — @duncit/ai-prompts, which only this portal\n     * renders. Every AI feature on the platform reads its prompt from the rows\n     * this screen edits.\n     */\n    library: {\n" + bundle + "\n    },\n\n    validation: {",
  ],
]);

// 2. copy.ts becomes a builder over that namespace.
const src = readFileSync("packages/ai-prompts/src/copy.ts", "utf8").split("\r\n").join("\n");
const start = src.indexOf("/**\n * Every label the Prompt Library renders");
const end = src.indexOf("} as const;", start) + "} as const;".length;
const head =
  "import type { PromptKind } from './types';\n\n" +
  "/** The translator the library reads its copy from (rule 38). */\n" +
  "export type PromptTranslate = (key: string) => string;\n";
const builder =
  "/**\n" +
  " * Every label the Prompt Library renders, in one place.\n" +
  " *\n" +
  " * Assembled from the console's translator rather than written as literals:\n" +
  " * the copy itself lives under `ai.library.*` in @duncit/i18n, so an admin can\n" +
  " * translate it from Localization > Translations like every other screen\n" +
  " * (rule 38). Every key is written out as a literal `t('…')` call so the build\n" +
  " * gate can see it.\n" +
  " */\n" +
  "export const promptCopy = (t: PromptTranslate) =>\n" +
  "  ({\n" +
  copy +
  "\n  }) as const;\n\n" +
  "/** The shape every component in this package renders from. */\n" +
  "export type PromptCopy = ReturnType<typeof promptCopy>;";

const out = "import type { PromptKind } from './types';" + src.slice(src.indexOf("\n", 0), start) + builder + src.slice(end);
// The kinds map keeps its PromptKind check.
writeFileSync(
  "packages/ai-prompts/src/copy.ts",
  out.replace(
    "    },\n\n    roles: {",
    "    } satisfies Record<PromptKind, { label: string; chip: string; blurb: string }>,\n\n    roles: {",
  ),
  "utf8",
);
console.log("ok copy.ts");
