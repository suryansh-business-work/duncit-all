import { apply } from "./e.mjs";

apply("packages/table/src/DuncitTable.tsx", [
  [
    "  const table = useTableQuery({ fetchRows, defaultSort, defaultPageSize, externalFilters });\n  const prefs = useTablePrefs(tableId);",
    "  const { t } = useTranslation();\n  const table = useTableQuery({ fetchRows, defaultSort, defaultPageSize, externalFilters });\n  const prefs = useTablePrefs(tableId);",
  ],
]);

apply("packages/table/src/SelectionCheckbox.tsx", [
  [
    "import type { CustomCellRendererProps, CustomHeaderProps } from 'ag-grid-react';",
    "import type { CustomCellRendererProps, CustomHeaderProps } from 'ag-grid-react';\nimport { useTranslation } from './i18n';",
  ],
  [
    "export function SelectionCheckbox({ node }: Readonly<CustomCellRendererProps>) {\n  const [checked, setChecked] = useState(() => node.isSelected() ?? false);",
    "export function SelectionCheckbox({ node }: Readonly<CustomCellRendererProps>) {\n  const { t } = useTranslation();\n  const [checked, setChecked] = useState(() => node.isSelected() ?? false);",
  ],
]);
