import { apply } from "./e.mjs";

apply("packages/i18n/src/bundles/ai.ts", [
  [
      "      defaultModel: 'Default',",
      "      defaultModel: 'Default',\n      saving: 'Saving…',\n      saveChanges: 'Save changes',\n      add: 'Add',\n      deleteMessage:\n        'Delete \"{name}\"? This cannot be undone, and anything fetching it by key stops finding it.',\n      resetMessage:\n        'Restore the shipped default for \"{name}\"? Your edits to this prompt will be lost, and the next call uses the original text.',",
  ],
]);

apply("packages/ai-prompts/src/copy.ts", [
  [
    "    apiOpenFeed: t('ai.library.apiOpenFeed'),",
    "    apiOpenFeed: t('ai.library.apiOpenFeed'),\n    saving: t('ai.library.saving'),\n    saveChanges: t('ai.library.saveChanges'),\n    add: t('ai.library.add'),\n    cancel: t('shell.common.cancel'),",
  ],
]);

apply("packages/ai-prompts/src/mui/PromptForm.tsx", [
  [
    "            <Button onClick={onCancel} disabled={submitting}>\n              Cancel\n            </Button>",
    "            <Button onClick={onCancel} disabled={submitting}>\n              {copy.cancel}\n            </Button>",
  ],
  [
    "            {submitting ? 'Saving…' : submitLabel}",
    "            {submitting ? copy.saving : (submitLabel ?? copy.saveChanges)}",
  ],
]);

apply("packages/ai-prompts/src/mui/PromptDialog.tsx", [
  [
    "              submitLabel={prompt ? 'Save changes' : 'Add'}",
    "              submitLabel={prompt ? copy.saveChanges : copy.add}",
  ],
]);

apply("packages/ai-prompts/src/mui/PromptLibraryView.tsx", [
  [
    "        message={`Delete \"${toDelete?.name ?? ''}\"? This cannot be undone, and anything fetching it by key stops finding it.`}",
    "        message={t('ai.library.deleteMessage', { vars: { name: toDelete?.name ?? '' } })}",
  ],
  [
    "        message={`Restore the shipped default for \"${toReset?.name ?? ''}\"? Your edits to this prompt will be lost, and the next call uses the original text.`}",
    "        message={t('ai.library.resetMessage', { vars: { name: toReset?.name ?? '' } })}",
  ],
  [
    "  const copy = usePromptCopy();\n  const client = useApolloClient();",
    "  const copy = usePromptCopy();\n  const { t } = useTranslation();\n  const client = useApolloClient();",
  ],
  [
    "import { usePromptCopy } from '../i18n/useCopy';",
    "import { useTranslation } from '@duncit/app-settings';\nimport { usePromptCopy } from '../i18n/useCopy';",
  ],
]);
