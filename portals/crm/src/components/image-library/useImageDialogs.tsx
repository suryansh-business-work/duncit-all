import { useRef, useState } from 'react';
import { ConfirmDialog } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import { MediaNameForm } from '../../forms/media-name';
import ImagePreviewDialog from './ImagePreviewDialog';
import { imageMeta } from './imageMeta';

export interface ImageItem {
  id: string;
  url: string;
  name: string;
  mime_type?: string | null;
  size_bytes?: number | null;
  width?: number | null;
  height?: number | null;
}

interface Options<T extends ImageItem> {
  /** MIME types the replace-file chooser offers. */
  accept: readonly string[];
  busy: boolean;
  /** The last server error, shown inside the rename dialog while it is open. */
  error: string | null;
  clearError: () => void;
  onReplace: (item: T, file: File) => void;
  /** Resolves true when the rename was saved (the dialog then closes). */
  onRename: (item: T, name: string) => Promise<boolean>;
  onDelete: (item: T) => Promise<unknown>;
  /** The delete question, naming the item. */
  deleteMessage: (name: string) => string;
  /** Prefix for the hidden replace input's test id (`<prefix>-replace-input`). */
  testIdPrefix: string;
}

/**
 * The per-image dialogs an image library needs — full-size preview, a hidden
 * file chooser for "Replace file", the rename form and the delete confirm —
 * shared by a lead's Logos & Images and the email brand library. `open` starts
 * one; render `dialogs` once in the page.
 */
export function useImageDialogs<T extends ImageItem>(o: Options<T>) {
  const { t } = useTranslation();
  const replaceInput = useRef<HTMLInputElement | null>(null);
  const [replacing, setReplacing] = useState<T | null>(null);
  const [previewing, setPreviewing] = useState<T | null>(null);
  const [renaming, setRenaming] = useState<T | null>(null);
  const [deleting, setDeleting] = useState<T | null>(null);

  const open = {
    preview: (item: T) => setPreviewing(item),
    rename: (item: T) => setRenaming(item),
    remove: (item: T) => setDeleting(item),
    replace: (item: T) => {
      setReplacing(item);
      replaceInput.current?.click();
    },
  };

  const dialogs = (
    <>
      <input
        ref={replaceInput}
        type="file"
        hidden
        accept={o.accept.join(',')}
        data-testid={`${o.testIdPrefix}-replace-input`}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && replacing) o.onReplace(replacing, file);
          setReplacing(null);
          e.target.value = '';
        }}
      />
      <ImagePreviewDialog
        image={previewing ? { url: previewing.url, name: previewing.name, meta: imageMeta(previewing) } : null}
        onClose={() => setPreviewing(null)}
      />
      <MediaNameForm
        open={!!renaming}
        initialName={renaming?.name ?? ''}
        submitting={o.busy}
        error={o.error}
        onClose={() => {
          setRenaming(null);
          o.clearError();
        }}
        onSubmit={async ({ name }) => {
          if (renaming && (await o.onRename(renaming, name))) setRenaming(null);
        }}
      />
      <ConfirmDialog
        open={!!deleting}
        title={t('crm.media.deleteTitle')}
        message={o.deleteMessage(deleting?.name || t('crm.media.untitled'))}
        confirmLabel={t('shell.common.delete')}
        destructive
        busyLabel={t('shell.common.deleting')}
        loading={o.busy}
        onConfirm={async () => {
          if (deleting) await o.onDelete(deleting);
          setDeleting(null);
        }}
        onClose={() => setDeleting(null)}
      />
    </>
  );

  return { open, dialogs, renaming: renaming !== null };
}
