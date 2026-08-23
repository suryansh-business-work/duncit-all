/**
 * @duncit/ai-prompts — the AI Library, as a package.
 *
 * The AI portal renders it, but nothing in here is portal-specific: the two
 * kinds of prompt, the `{{ var }}` rules, the validation and the GraphQL
 * documents live at the root, and the MUI views behind `./mui`. A second
 * surface that needs to show or edit prompts imports the same pieces rather
 * than growing a third opinion about what a required placeholder means.
 */
export type { AiPrompt, PromptKind, PromptRole, PromptUsage, PromptVariable } from './types';
export {
  braced,
  estimateTokens,
  exampleValues,
  extractVariables,
  missingRequiredVariables,
  renderPrompt,
} from './render';
export { promptFormSchema, promptInitialValues } from './schema';
export type { PromptFormValues } from './schema';
export { promptCopy, apiOriginFromGraphqlUrl, promptFeedUrl } from './copy';
export type { PromptCopy, PromptTranslate } from './copy';
export { usePromptCopy } from './i18n/useCopy';
export { promptSearchText } from './search';
export {
  AI_PROMPTS,
  CREATE_AI_PROMPT,
  DELETE_AI_PROMPT,
  RESET_AI_PROMPT,
  UPDATE_AI_PROMPT,
} from './queries';
