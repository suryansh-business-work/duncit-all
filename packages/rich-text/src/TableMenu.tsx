import { useState, type MouseEvent } from 'react';
import TableChartIcon from '@mui/icons-material/TableChart';
import { ListItemText, Menu, MenuItem } from '@mui/material';
import type { Editor } from '@tiptap/react';
import { useTranslation } from '@duncit/app-settings';
import { ToolbarButton } from './ToolbarButton';

/**
 * Module-level key references for the verification scanner, which cannot see
 * through `t(\`shell.richText.${name}\`)` (rule 38). Same reason the toolbar
 * carries its own block. Do not remove.
 */
const KEY_REFERENCES = {
  table: 'shell.richText.table',
  tableInsert: 'shell.richText.tableInsert',
  tableAddRowBefore: 'shell.richText.tableAddRowBefore',
  tableAddRowAfter: 'shell.richText.tableAddRowAfter',
  tableDeleteRow: 'shell.richText.tableDeleteRow',
  tableAddColumnBefore: 'shell.richText.tableAddColumnBefore',
  tableAddColumnAfter: 'shell.richText.tableAddColumnAfter',
  tableDeleteColumn: 'shell.richText.tableDeleteColumn',
  tableToggleHeaderRow: 'shell.richText.tableToggleHeaderRow',
  tableMergeOrSplit: 'shell.richText.tableMergeOrSplit',
  tableDelete: 'shell.richText.tableDelete',
} as const;

/** One row of the menu: what it says, what it runs, and when it is offered. */
interface TableAction {
  key: keyof typeof KEY_REFERENCES;
  run: (editor: Editor) => boolean;
  /** False for the actions that only make sense with the caret inside a table. */
  needsTable: boolean;
  /** Draws a separator above this item. */
  dividerBefore?: boolean;
}

/**
 * A 3x3 with a header row is the table people actually want: enough to see the
 * shape, small enough to delete quickly if it was the wrong call.
 */
const ACTIONS: readonly TableAction[] = [
  {
    key: 'tableInsert',
    needsTable: false,
    run: (editor) =>
      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
  { key: 'tableAddRowBefore', needsTable: true, dividerBefore: true, run: (e) => e.chain().focus().addRowBefore().run() },
  { key: 'tableAddRowAfter', needsTable: true, run: (e) => e.chain().focus().addRowAfter().run() },
  { key: 'tableDeleteRow', needsTable: true, run: (e) => e.chain().focus().deleteRow().run() },
  { key: 'tableAddColumnBefore', needsTable: true, dividerBefore: true, run: (e) => e.chain().focus().addColumnBefore().run() },
  { key: 'tableAddColumnAfter', needsTable: true, run: (e) => e.chain().focus().addColumnAfter().run() },
  { key: 'tableDeleteColumn', needsTable: true, run: (e) => e.chain().focus().deleteColumn().run() },
  { key: 'tableToggleHeaderRow', needsTable: true, dividerBefore: true, run: (e) => e.chain().focus().toggleHeaderRow().run() },
  { key: 'tableMergeOrSplit', needsTable: true, run: (e) => e.chain().focus().mergeOrSplit().run() },
  { key: 'tableDelete', needsTable: true, dividerBefore: true, run: (e) => e.chain().focus().deleteTable().run() },
];

interface Props {
  editor: Editor;
}

/**
 * The table control: one toolbar button that opens the row/column actions.
 *
 * A menu rather than eleven more icons — the toolbar already wraps to a second
 * line on a phone, and every action except "insert" is meaningless unless the
 * caret is inside a table, so they would spend most of their life disabled and
 * in the way.
 */
export function TableMenu({ editor }: Readonly<Props>) {
  const { t } = useTranslation();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const inTable = editor.isActive('table');

  const open = (event: MouseEvent<HTMLButtonElement>) => setAnchorEl(event.currentTarget);
  const close = () => setAnchorEl(null);

  return (
    <>
      <ToolbarButton
        label={t(KEY_REFERENCES.table)}
        active={inTable}
        onPress={open}
      >
        <TableChartIcon fontSize="small" />
      </ToolbarButton>
      <Menu
        anchorEl={anchorEl}
        open={!!anchorEl}
        onClose={close}
        slotProps={{ list: { dense: true, 'aria-label': t(KEY_REFERENCES.table) } }}
      >
        {ACTIONS.map((action) => (
          <MenuItem
            key={action.key}
            disabled={action.needsTable && !inTable}
            divider={false}
            sx={action.dividerBefore ? { borderTop: 1, borderColor: 'divider', mt: 0.5, pt: 1 } : undefined}
            onClick={() => {
              action.run(editor);
              close();
            }}
          >
            <ListItemText primary={t(KEY_REFERENCES[action.key])} />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

export { ACTIONS as TABLE_MENU_ACTIONS };
