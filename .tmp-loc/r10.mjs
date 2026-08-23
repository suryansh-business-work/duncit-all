import { apply } from "./e.mjs";

apply("packages/table/src/i18n.ts", [
  [
    "import {\n  flattenCatalogue,\n  SHELL_BUNDLE,\n  useTranslation as useSharedTranslation,\n  type Translator,\n} from '@duncit/app-settings';",
    "import {\n  createTranslator,\n  flattenCatalogue,\n  SHELL_BUNDLE,\n  useTranslation as useSharedTranslation,\n  type Translator,\n} from '@duncit/app-settings';",
  ],
  [
    "/** Translate inside the grid — the same @duncit/i18n core the portals use. */\nexport function useTranslation() {\n  return useSharedTranslation(TABLE_FALLBACK_FLAT);\n}",
    "/** Translate inside the grid — the same @duncit/i18n core the portals use. */\nexport function useTranslation() {\n  return useSharedTranslation(TABLE_FALLBACK_FLAT);\n}\n\n/**\n * A provider-free translator over the bundled copy.\n *\n * A column's `valueGetter` runs outside the React tree — AG Grid calls it while\n * sorting and while writing a CSV — so it cannot read the provider. The twin of\n * @duncit/shell's and mWeb's `fallbackT`, and used for exactly that: text that\n * has to exist before there is a component to ask.\n */\nexport const fallbackT: Translate = createTranslator({\n  locale: 'en-IN',\n  fallback: TABLE_FALLBACK_FLAT,\n}).t;",
  ],
]);

apply("packages/table/src/cells.tsx", [
  [
    "export interface ActiveChipColumnOptions<T> {",
    "/** The two words an is_active chip shows, resolved outside the React tree. */\nfunction activeChipText(\n  active: boolean,\n  activeLabel: string | undefined,\n  inactiveLabel: string | undefined,\n): string {\n  if (active) return activeLabel ?? fallbackT('shell.common.active');\n  return inactiveLabel ?? fallbackT('shell.common.inactive');\n}\n\n/** The chip itself, so the words follow the reader's language. */\nfunction ActiveChip(\n  props: Readonly<{\n    active: boolean;\n    activeLabel?: string;\n    inactiveLabel?: string;\n    variant: 'filled' | 'outlined';\n  }>,\n) {\n  const { active, activeLabel, inactiveLabel, variant } = props;\n  const { t } = useTranslation();\n  let label: string;\n  if (active) label = activeLabel ?? t('shell.common.active');\n  else label = inactiveLabel ?? t('shell.common.inactive');\n  return (\n    <Chip size=\"small\" color={active ? 'success' : 'default'} label={label} variant={variant} />\n  );\n}\n\nexport interface ActiveChipColumnOptions<T> {",
  ],
  [
    "import { useTranslation } from './i18n';",
    "import { fallbackT, useTranslation } from './i18n';",
  ],
]);
