import type { PromptKind } from './types';

/** The translator the library reads its copy from (rule 38). */
export type PromptTranslate = (key: string) => string;

/**
 * Every label the Prompt Library renders, in one place.
 *
 * Assembled from the console's translator rather than written as literals:
 * the copy itself lives under `ai.library.*` in @duncit/i18n, so an admin can
 * translate it from Localization > Translations like every other screen
 * (rule 38). Every key is written out as a literal `t('…')` call so the build
 * gate can see it.
 */
export const promptCopy = (t: PromptTranslate) =>
  ({
    pageTitle: t('ai.library.pageTitle'),
    pageSubtitle: t('ai.library.pageSubtitle'),
    kinds: {
      CODE: {
        label: t('ai.library.kinds.CODE.label'),
        chip: t('ai.library.kinds.CODE.chip'),
        blurb: t('ai.library.kinds.CODE.blurb'),
      },
      AI: {
        label: t('ai.library.kinds.AI.label'),
        chip: t('ai.library.kinds.AI.chip'),
        blurb: t('ai.library.kinds.AI.blurb'),
      },
    },
    roles: {
      SYSTEM: t('ai.library.roles.SYSTEM'),
      USER: t('ai.library.roles.USER'),
    },
    roleHints: {
      SYSTEM: t('ai.library.roleHints.SYSTEM'),
      USER: t('ai.library.roleHints.USER'),
    },
    addPrompt: t('ai.library.addPrompt'),
    editPrompt: t('ai.library.editPrompt'),
    createTitle: t('ai.library.createTitle'),
    emptyCode: t('ai.library.emptyCode'),
    emptyAi: t('ai.library.emptyAi'),
    searchPlaceholder: t('ai.library.searchPlaceholder'),
    deleteTitle: t('ai.library.deleteTitle'),
    deleteConfirm: t('ai.library.deleteConfirm'),
    resetTitle: t('ai.library.resetTitle'),
    resetConfirm: t('ai.library.resetConfirm'),
    busy: t('ai.library.busy'),
    codeDeleteHint: t('ai.library.codeDeleteHint'),
    resetHint: t('ai.library.resetHint'),
    fields: {
      name: t('ai.library.fields.name'),
      description: t('ai.library.fields.description'),
      category: t('ai.library.fields.category'),
      key: t('ai.library.fields.key'),
      model: t('ai.library.fields.model'),
      content: t('ai.library.fields.content'),
      active: t('ai.library.fields.active'),
    },
    hints: {
      nameCode: t('ai.library.hints.nameCode'),
      nameAi: t('ai.library.hints.nameAi'),
      description: t('ai.library.hints.description'),
      category: t('ai.library.hints.category'),
      keyAi: t('ai.library.hints.keyAi'),
      keyCode: t('ai.library.hints.keyCode'),
      model: t('ai.library.hints.model'),
      content: t('ai.library.hints.content'),
    },
    usageTitle: t('ai.library.usageTitle'),
    usageEmpty: t('ai.library.usageEmpty'),
    variablesTitle: t('ai.library.variablesTitle'),
    variablesEmpty: t('ai.library.variablesEmpty'),
    variablesHintCode: t('ai.library.variablesHintCode'),
    variablesHintAi: t('ai.library.variablesHintAi'),
    copyVariable: t('ai.library.copyVariable'),
    previewTitle: t('ai.library.previewTitle'),
    previewHint: t('ai.library.previewHint'),
    apiTitle: t('ai.library.apiTitle'),
    apiHint: t('ai.library.apiHint'),
    apiCopyAll: t('ai.library.apiCopyAll'),
    apiCopyOne: t('ai.library.apiCopyOne'),
    apiCopied: t('ai.library.apiCopied'),
    apiOpenInNewTab: t('ai.library.apiOpenInNewTab'),
    apiOpenFeed: t('ai.library.apiOpenFeed'),
    saving: t('ai.library.saving'),
    saveChanges: t('ai.library.saveChanges'),
    add: t('ai.library.add'),
    cancel: t('shell.common.cancel'),
  }) as const;

/** The shape every component in this package renders from. */
export type PromptCopy = ReturnType<typeof promptCopy>;

/** The feed URL for a whole kind, or for one prompt. */
export function promptFeedUrl(base: string, opts: { kind?: PromptKind; key?: string } = {}): string {
  const root = base.replace(/\/+$/, '');
  if (opts.key) return `${root}/ai-prompts/prompt.json?key=${encodeURIComponent(opts.key)}`;
  const query = opts.kind ? `?kind=${opts.kind}` : '';
  return `${root}/ai-prompts/prompts.json${query}`;
}

/**
 * The API origin, worked out from the GraphQL endpoint the portal already
 * talks to — the feed is served by that same process, so a second env var
 * would only be a second thing to get wrong between environments.
 */
export function apiOriginFromGraphqlUrl(graphqlUrl: string): string {
  return graphqlUrl.replace(/\/graphql\/?$/, '');
}
