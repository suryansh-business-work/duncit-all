import { apply } from "./e.mjs";
apply("packages/ai-prompts/src/copy.ts", [
  [
    "import type { PromptKind } from './types';\n\n/**\n * Every label the Prompt Library renders",
    "import type { PromptKind } from './types';\n\n/** The translator the library reads its copy from (rule 38). */\nexport type PromptTranslate = (key: string) => string;\n\n/**\n * Every label the Prompt Library renders",
  ],
]);
