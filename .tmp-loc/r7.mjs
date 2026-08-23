import { apply } from "./e.mjs";

apply("packages/table/src/toolbar/filterState.ts", [
  [
    "import type { DuncitColumn, TableFilterValue } from '../types';",
    "import { columnHeader } from '../columnDefs';\nimport type { Translate } from '../i18n';\nimport type { DuncitColumn, TableFilterValue } from '../types';",
  ],
]);

// ---- filterControls.tsx
apply("packages/table/src/toolbar/filterControls.tsx", [
  [
    "import type { DuncitColumn } from '../types';\nimport type { FilterDraft } from './filterState';",
    "import { columnHeader } from '../columnDefs';\nimport { useTranslation } from '../i18n';\nimport type { DuncitColumn } from '../types';\nimport type { FilterDraft } from './filterState';",
  ],
  [
    "function SingleSelectControl(props: Readonly<SelectControlProps>) {\n  const { field, label, draft, onChange, options } = props;\n  const labelId = `duncit-filter-${field}-label`;",
    "function SingleSelectControl(props: Readonly<SelectControlProps>) {\n  const { field, label, draft, onChange, options } = props;\n  const { t } = useTranslation();\n  const labelId = `duncit-filter-${field}-label`;",
  ],
  [
    "      <Select labelId={labelId} label={label} value={draft.selected[0] ?? ''} onChange={handleChange}>\n        <MenuItem value=\"\">Any</MenuItem>",
    "      <Select labelId={labelId} label={label} value={draft.selected[0] ?? ''} onChange={handleChange}>\n        <MenuItem value=\"\">{t('shell.table.any')}</MenuItem>",
  ],
  [
    "function NumberControl({ label, draft, onChange }: Readonly<ControlProps>) {\n  return (\n    <Stack direction=\"row\" spacing={1}>\n      <TextField\n        label={`${label} min`}",
    "function NumberControl({ label, draft, onChange }: Readonly<ControlProps>) {\n  const { t } = useTranslation();\n  return (\n    <Stack direction=\"row\" spacing={1}>\n      <TextField\n        label={t('shell.table.rangeMin', { vars: { label } })}",
  ],
  [
    "        label={`${label} max`}",
    "        label={t('shell.table.rangeMax', { vars: { label } })}",
  ],
  [
    "function DateControl({ label, draft, onChange }: Readonly<ControlProps>) {\n  return (\n    <Stack direction=\"row\" spacing={1}>\n      <DatePicker\n        label={`${label} from`}",
    "function DateControl({ label, draft, onChange }: Readonly<ControlProps>) {\n  const { t } = useTranslation();\n  return (\n    <Stack direction=\"row\" spacing={1}>\n      <DatePicker\n        label={t('shell.table.rangeFrom', { vars: { label } })}",
  ],
  [
    "        label={`${label} to`}",
    "        label={t('shell.table.rangeTo', { vars: { label } })}",
  ],
  [
    "function BooleanControl({ field, label, draft, onChange }: Readonly<ControlProps>) {\n  const labelId = `duncit-filter-${field}-label`;",
    "function BooleanControl({ field, label, draft, onChange }: Readonly<ControlProps>) {\n  const { t } = useTranslation();\n  const labelId = `duncit-filter-${field}-label`;",
  ],
  [
    "        <MenuItem value=\"\">Any</MenuItem>\n        <MenuItem value=\"true\">Yes</MenuItem>\n        <MenuItem value=\"false\">No</MenuItem>",
    "        <MenuItem value=\"\">{t('shell.table.any')}</MenuItem>\n        <MenuItem value=\"true\">{t('shell.table.yes')}</MenuItem>\n        <MenuItem value=\"false\">{t('shell.table.no')}</MenuItem>",
  ],
  [
    "  const { column, draft, onChange } = props;\n  const { filter, field, headerName } = column;\n  if (!filter) return null;\n  const common = { field, label: headerName, draft, onChange };",
    "  const { column, draft, onChange } = props;\n  const { t } = useTranslation();\n  const { filter, field } = column;\n  if (!filter) return null;\n  const common = { field, label: columnHeader(column, t), draft, onChange };",
  ],
]);
