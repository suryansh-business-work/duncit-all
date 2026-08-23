import { apply } from "./e.mjs";

// New rows the table needs: its own column headings and the two aria labels
// that name a row. They take a variable, so they are read through `t` directly
// rather than through the flat copy object.
apply("packages/i18n/src/bundles/ai.ts", [
  [
    "      apiCopied: 'Copied',",
    "      apiCopied: 'Copied',\n      apiOpenInNewTab: 'Open in a new tab',\n      apiOpenFeed: 'Open feed in a new tab',\n      resetAria: 'Reset {name}',\n      editAria: 'Edit {name}',\n      deleteAria: 'Delete {name}',\n      colTokens: 'Tokens',\n      tokensHint: 'Estimated token size of the prompt content',\n      defaultModel: 'Default',",
  ],
]);

apply("packages/ai-prompts/src/copy.ts", [
  [
    "    apiCopied: t('ai.library.apiCopied'),",
    "    apiCopied: t('ai.library.apiCopied'),\n    apiOpenInNewTab: t('ai.library.apiOpenInNewTab'),\n    apiOpenFeed: t('ai.library.apiOpenFeed'),",
  ],
]);

apply("packages/ai-prompts/src/mui/PromptsTable.tsx", [
  [
    "import { usePromptCopy } from '../i18n/useCopy';",
    "import { useTranslation } from '@duncit/app-settings';\nimport { usePromptCopy } from '../i18n/useCopy';\nimport type { PromptCopy } from '../copy';",
  ],
  [
    "  const copy = usePromptCopy();\n  return (\n    <Tooltip title={copy.resetHint}>\n      <IconButton\n        size=\"small\"\n        aria-label={copy.resetAria.replace('{name}', prompt.name)}\n        onClick={() => onReset(prompt)}\n      >",
    "  const copy = usePromptCopy();\n  const { t } = useTranslation();\n  return (\n    <Tooltip title={copy.resetHint}>\n      <IconButton\n        size=\"small\"\n        aria-label={t('ai.library.resetAria', { vars: { name: prompt.name } })}\n        onClick={() => onReset(prompt)}\n      >",
  ],
  [
    "const renderModel = (p: AiPrompt) => (\n  <Typography variant=\"body2\" color={p.target_model ? 'text.primary' : 'text.disabled'}>\n    {p.target_model || 'Default'}\n  </Typography>\n);\n\nconst renderTokens = (p: AiPrompt) => (\n  <Tooltip title=\"Estimated token size of the prompt content\">\n    <Chip size=\"small\" color=\"primary\" variant=\"outlined\" label={`≈ ${p.token_count}`} />\n  </Tooltip>\n);",
    "const renderModel = (p: AiPrompt, defaultModel: string) => (\n  <Typography variant=\"body2\" color={p.target_model ? 'text.primary' : 'text.disabled'}>\n    {p.target_model || defaultModel}\n  </Typography>\n);\n\nconst renderTokens = (p: AiPrompt, hint: string) => (\n  <Tooltip title={hint}>\n    <Chip size=\"small\" color=\"primary\" variant=\"outlined\" label={`≈ ${p.token_count}`} />\n  </Tooltip>\n);",
  ],
  [
    "}: Readonly<Props>) {\n  const code = kind === 'CODE';\n  const columns = useMemo<DuncitColumn<AiPrompt>[]>(\n    () => [\n      {\n        field: 'name',\n        headerName: 'Name',",
    "}: Readonly<Props>) {\n  const copy = usePromptCopy();\n  const { t } = useTranslation();\n  const code = kind === 'CODE';\n  const defaultModel = t('ai.library.defaultModel');\n  // Rebuilt when the catalogue changes — a column set frozen at module load\n  // would keep the language the console first rendered in.\n  const columns = useMemo<DuncitColumn<AiPrompt>[]>(\n    () => [\n      {\n        field: 'name',\n        headerName: copy.fields.name,",
  ],
  [
    "        cellRenderer: renderName,\n        valueGetter: (p) => p.name,",
    "        cellRenderer: (p) => renderName(p, copy),\n        valueGetter: (p) => p.name,",
  ],
  [
    "        field: 'key',\n        headerName: 'Key',",
    "        field: 'key',\n        headerName: copy.fields.key,",
  ],
  [
    "        field: 'category',\n        headerName: 'Category',",
    "        field: 'category',\n        headerName: copy.fields.category,",
  ],
  [
    "        field: 'target_model',\n        headerName: 'Model',\n        width: 150,\n        cellRenderer: renderModel,\n        valueGetter: (p) => p.target_model || 'Default',",
    "        field: 'target_model',\n        headerName: copy.fields.model,\n        width: 150,\n        cellRenderer: (p) => renderModel(p, defaultModel),\n        valueGetter: (p) => p.target_model || defaultModel,",
  ],
  [
    "        field: 'token_count',\n        headerName: 'Tokens',\n        width: 110,\n        cellRenderer: renderTokens,",
    "        field: 'token_count',\n        headerName: t('ai.library.colTokens'),\n        width: 110,\n        cellRenderer: (p) => renderTokens(p, t('ai.library.tokensHint')),",
  ],
  [
    "        edit: { ariaLabel: (p) => `Edit ${p.name}` },\n        delete: {\n          ariaLabel: (p) => `Delete ${p.name}`,",
    "        edit: { ariaLabel: (p) => t('ai.library.editAria', { vars: { name: p.name } }) },\n        delete: {\n          ariaLabel: (p) => t('ai.library.deleteAria', { vars: { name: p.name } }),",
  ],
  [
    "    [code, onEdit, onDelete, onReset],",
    "    [code, copy, defaultModel, t, onEdit, onDelete, onReset],",
  ],
  [
    "      emptyText={code ? copy.emptyCode : copy.emptyAi}",
    "      emptyText={code ? copy.emptyCode : copy.emptyAi}",
  ],
]);
