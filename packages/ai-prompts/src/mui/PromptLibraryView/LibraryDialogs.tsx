import { ConfirmDialog } from '@duncit/dialogs';
import { useTranslation } from '@duncit/app-settings';
import { usePromptCopy } from '../../i18n/useCopy';
import { useDetailCopy } from '../../i18n/useDetailCopy';
import { PromptDialog } from '../PromptDialog';
import type { LibraryActions } from './useLibraryActions';
import { runInBackground } from '../../log';

interface Props {
  actions: LibraryActions;
  apiOrigin: string;
  /** The editor saved: the list and any open detail view should re-read. */
  onSaved: () => void;
}

/** The editor and the three confirmations that stand in front of a destructive write. */
export function LibraryDialogs({ actions, apiOrigin, onSaved }: Readonly<Props>) {
  const copy = usePromptCopy();
  const more = useDetailCopy();
  const { t } = useTranslation();
  const { editor, confirmDelete, confirmReset, confirmArchive } = actions;

  return (
    <>
      <PromptDialog open={editor.open} prompt={editor.prompt} apiOrigin={apiOrigin} onClose={editor.close} onSaved={onSaved} />
      <ConfirmDialog
        open={!!confirmDelete.prompt}
        title={copy.deleteTitle}
        message={t('ai.library.deleteMessage', { vars: { name: confirmDelete.prompt?.name ?? '' } })}
        confirmLabel={copy.deleteConfirm}
        destructive
        loading={confirmDelete.busy}
        busyLabel={copy.busy}
        onConfirm={() => runInBackground(confirmDelete.confirm(), 'deletePrompt')}
        onClose={confirmDelete.cancel}
      />
      <ConfirmDialog
        open={!!confirmReset.prompt}
        title={copy.resetTitle}
        message={t('ai.library.resetMessage', { vars: { name: confirmReset.prompt?.name ?? '' } })}
        confirmLabel={copy.resetConfirm}
        loading={confirmReset.busy}
        busyLabel={copy.busy}
        onConfirm={() => runInBackground(confirmReset.confirm(), 'resetPrompt')}
        onClose={confirmReset.cancel}
      />
      <ConfirmDialog
        open={!!confirmArchive.prompt}
        title={more.actions.archiveTitle}
        message={more.actions.archiveMessage(confirmArchive.prompt?.name ?? '')}
        confirmLabel={more.actions.archive}
        loading={confirmArchive.busy}
        busyLabel={copy.busy}
        onConfirm={() => runInBackground(confirmArchive.confirm(), 'archivePrompt')}
        onClose={confirmArchive.cancel}
      />
    </>
  );
}
