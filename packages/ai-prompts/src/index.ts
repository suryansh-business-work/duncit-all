/**
 * @duncit/ai-prompts — the AI Library, as a package.
 *
 * The AI portal renders it, but nothing in here is portal-specific: the two
 * kinds of prompt, the `{{ var }}` rules, the validation and the GraphQL
 * documents live at the root, and the MUI views behind `./mui`. A second
 * surface that needs to show or edit prompts imports the same pieces rather
 * than growing a third opinion about what a required placeholder means.
 */
export type { AiPrompt, LibraryTab, PromptKind, PromptRole, PromptUsage, PromptVariable } from './types';
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
export {
  AI_PROMPT_ANALYTICS,
  AI_PROMPT_DETAIL,
  ARCHIVE_AI_PROMPT,
  DISABLE_AI_PROMPT_SHARE,
  ENABLE_AI_PROMPT_SHARE,
  RECORD_AI_PROMPT_EVENT,
  RESTORE_AI_PROMPT_VERSION,
  SCORE_AI_PROMPT,
  UNARCHIVE_AI_PROMPT,
} from './detailQueries';
export type {
  PortalEventInput,
  PortalPromptEvent,
  PromptAnalytics,
  PromptChange,
  PromptCount,
  PromptDetail,
  PromptQuality,
  PromptShare,
  PromptVersion,
} from './detailTypes';
export { MAX_PREFILL_CHARS, PROMPT_PLATFORMS, platformById, platformLink } from './share/platforms';
export type { PlatformLink, PromptPlatform, PromptPlatformId } from './share/platforms';
export { bookmarklet, injectionScript } from './share/scripts';
export type { ScriptMessages } from './share/scripts';
export {
  SharedPromptMissingError,
  campaignSource,
  fetchSharedPrompt,
  publicShareUrl,
  reportPublicEvent,
  visitorId,
} from './share/publicApi';
export type { PublicEventInput, PublicPromptEvent, SharedPrompt } from './share/publicApi';
export { libraryPromptPath, libraryPromptUrl } from './share/links';
export { MAX_EXTRA_CHARS, MAX_VARIABLE_CHARS, composePrompt, publicPromptDefaults, publicPromptSchema } from './share/publicSchema';
export type { PublicPromptMessages, PublicPromptValues } from './share/publicSchema';
export { detailCopy } from './detailCopy';
export type { DetailCopy } from './detailCopy';
