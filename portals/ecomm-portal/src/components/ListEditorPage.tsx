import type { ReactNode } from 'react';
import { Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import { PageHeader, QueryGuard } from '@duncit/ui';
import ReorderList, { type ReorderListProps } from './ReorderList';
import type { useListEditor } from './useListEditor';

/** What a page's dialog is handed when it opens. */
export interface ListFormProps<T> {
  /** The row being edited; `null` for a new one. */
  initial: T | null;
  busy: boolean;
  onClose: () => void;
  onSubmit: (input: Record<string, unknown>) => Promise<void>;
}

type Editor<T extends { id: string }> = ReturnType<typeof useListEditor<T>>;

interface ListEditorPageProps<T extends { id: string }>
  extends Pick<ReorderListProps<T>, 'getName' | 'renderSecondary' | 'renderLeading' | 'getDepth' | 'siblingsOf'> {
  title: string;
  subtitle: string;
  addLabel: string;
  emptyText: string;
  items: readonly T[];
  loading: boolean;
  error: unknown;
  editor: Editor<T>;
  /** Extra words for the delete confirmation — what deleting this row also does. */
  deleteMessage?: string;
  /** The create/edit dialog. Omit it when editing happens on a page of its own. */
  renderForm?: (props: ListFormProps<T>) => ReactNode;
  /** Open a page instead of the dialog. */
  onAdd?: () => void;
  onEdit?: (item: T) => void;
  /** Controls beside the add button (a "View store" link). */
  extraActions?: ReactNode;
}

/**
 * A hand-ordered list page: heading, add button, the list with move / edit /
 * delete on every row, and the dialog that creates or edits one.
 */
export default function ListEditorPage<T extends { id: string }>({
  title,
  subtitle,
  addLabel,
  emptyText,
  items,
  loading,
  error,
  editor,
  deleteMessage,
  renderForm,
  onAdd,
  onEdit,
  extraActions,
  ...list
}: Readonly<ListEditorPageProps<T>>) {
  const { editing, setEditing } = editor;
  const actions = (
    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
      {extraActions}
      <DuncitButton variant="contained" startIcon={<AddIcon />} onClick={onAdd ?? (() => setEditing('new'))}>
        {addLabel}
      </DuncitButton>
    </Stack>
  );
  const initial = editing === 'new' ? null : editing;
  return (
    <Stack spacing={3}>
      <PageHeader title={title} subtitle={subtitle} actions={actions} />
      <QueryGuard loading={loading && items.length === 0} error={error}>
        <ReorderList<T>
          {...list}
          items={items}
          ariaLabel={title}
          emptyText={emptyText}
          busy={editor.busy}
          getId={(item) => item.id}
          onReorder={editor.onReorder}
          onEdit={onEdit ?? setEditing}
          onDelete={(item) => editor.onDelete(item, list.getName(item), deleteMessage)}
        />
      </QueryGuard>
      {editing &&
        renderForm?.({ initial, busy: editor.saving, onClose: () => setEditing(null), onSubmit: editor.submit })}
    </Stack>
  );
}
