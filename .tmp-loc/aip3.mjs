import { readFileSync, writeFileSync } from "node:fs";
import { apply } from "./e.mjs";

apply("packages/ai-prompts/src/index.ts", [
  [
    "export { PROMPT_COPY, apiOriginFromGraphqlUrl, promptFeedUrl } from './copy';",
    "export { promptCopy, apiOriginFromGraphqlUrl, promptFeedUrl } from './copy';\nexport type { PromptCopy, PromptTranslate } from './copy';\nexport { usePromptCopy } from './i18n/useCopy';",
  ],
]);

/** Swap the module-level constant for the hook, file by file. */
const FILES = [
  "packages/ai-prompts/src/mui/FeedUrlBar.tsx",
  "packages/ai-prompts/src/mui/PromptContext.tsx",
  "packages/ai-prompts/src/mui/PromptDialog.tsx",
  "packages/ai-prompts/src/mui/PromptForm.tsx",
  "packages/ai-prompts/src/mui/PromptLibraryView.tsx",
  "packages/ai-prompts/src/mui/PromptsTable.tsx",
];
for (const f of FILES) {
  let s = readFileSync(f, "utf8").split("\r\n").join("\n");
  s = s
    .split("import { PROMPT_COPY, promptFeedUrl } from '../copy';")
    .join("import { promptFeedUrl } from '../copy';\nimport { usePromptCopy } from '../i18n/useCopy';")
    .split("import { PROMPT_COPY } from '../copy';")
    .join("import { usePromptCopy } from '../i18n/useCopy';")
    .split("PROMPT_COPY.")
    .join("copy.");
  writeFileSync(f, s, "utf8");
  console.log("rewrote", f);
}
