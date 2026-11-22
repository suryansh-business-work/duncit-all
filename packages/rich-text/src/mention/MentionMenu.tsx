import { useMemo } from 'react';
import { ListItemText, MenuItem, MenuList, Paper, Popper } from '@mui/material';
import type { Editor } from '@tiptap/react';
import { useTranslation } from '@duncit/app-settings';
import type { RichTextMentionItem } from '../types';

interface Props {
  editor: Editor;
  items: readonly RichTextMentionItem[];
  loading: boolean;
  active: number;
  onSelect: (item: RichTextMentionItem) => void;
}

/**
 * The @mention list, floating under the caret. Picking with the mouse keeps
 * the editor focused (mousedown is cancelled) so typing carries on.
 */
export function MentionMenu({ editor, items, loading, active, onSelect }: Readonly<Props>) {
  const { t } = useTranslation();
  // A virtual anchor at the caret; the editor box when the caret cannot be measured.
  const anchor = useMemo(
    () => ({
      getBoundingClientRect: (): DOMRect => {
        try {
          const caret = editor.view.coordsAtPos(editor.state.selection.from);
          return { x: caret.left, y: caret.top, left: caret.left, right: caret.left, top: caret.top, bottom: caret.bottom, width: 0, height: caret.bottom - caret.top, toJSON: () => caret };
        } catch {
          return editor.view.dom.getBoundingClientRect();
        }
      },
    }),
    [editor],
  );
  let status: string | null = null;
  if (items.length === 0) status = loading ? t('shell.richText.mentionSearching') : t('shell.richText.mentionNoMatches');
  return (
    <Popper open anchorEl={anchor} placement="bottom-start" sx={(theme) => ({ zIndex: theme.zIndex.modal + 1 })}>
      <Paper elevation={8} sx={{ minWidth: 220, maxHeight: 280, overflowY: 'auto' }}>
        <MenuList dense role="listbox" aria-label={t('shell.richText.mentionList')} data-testid="rich-text-mention-list">
          {status ? (
            <MenuItem disabled role="option" aria-selected={false}>
              {status}
            </MenuItem>
          ) : null}
          {items.map((item, index) => (
            <MenuItem
              key={item.id}
              role="option"
              selected={index === active}
              aria-selected={index === active}
              onMouseDown={(event) => {
                event.preventDefault();
                onSelect(item);
              }}
            >
              <ListItemText primary={item.label} secondary={item.description || undefined} />
            </MenuItem>
          ))}
        </MenuList>
      </Paper>
    </Popper>
  );
}
