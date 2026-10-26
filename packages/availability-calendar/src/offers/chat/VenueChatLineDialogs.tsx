import { Alert, Dialog, DialogActions, DialogContent, DialogTitle, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { ConfirmDialog } from '@duncit/dialogs';
import { useTranslation } from '@duncit/app-settings';
import { LineEditForm } from './line-edit';
import type { VenueChatLineActions } from './useVenueChatLineActions';

const FORM_ID = 'venue-chat-line-edit';

interface Props {
  /** The text line being rewritten, as it reads now; null while none is. */
  editing: { id: string; text: string } | null;
  /** The line being taken back; null while none is. */
  deletingId: string | null;
  actions: Pick<VenueChatLineActions, 'edit' | 'remove' | 'busy'>;
  /** Why the last change was refused — shown inside the open dialog, where the reader is. */
  error?: string | null;
  onClose: () => void;
}

/**
 * The two questions a member's own line can raise: its new words (a dialog with
 * the line's text to change), and whether to take it back for both sides (a
 * confirmation that opens on Cancel). Each closes once the change is in; a
 * refusal is shown inside the dialog still open, so the reader hears it there.
 */
export default function VenueChatLineDialogs({ editing, deletingId, actions, error, onClose }: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <>
      {editing && (
        <Dialog open onClose={actions.busy ? undefined : onClose} fullWidth maxWidth="sm" aria-labelledby={`${FORM_ID}-title`}>
          <DialogTitle id={`${FORM_ID}-title`}>{t('availability.offers.chat.editTitle')}</DialogTitle>
          <DialogContent>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }} data-testid="venue-chat-edit-error">
                {error}
              </Alert>
            )}
            <LineEditForm
              key={editing.id}
              formId={FORM_ID}
              defaultValues={{ text: editing.text }}
              onSubmit={async ({ text }) => {
                if (await actions.edit(editing.id, text)) onClose();
              }}
            />
          </DialogContent>
          <DialogActions>
            <DuncitButton color="inherit" onClick={onClose} disabled={actions.busy}>
              {t('availability.offers.cancel')}
            </DuncitButton>
            <DuncitButton type="submit" form={FORM_ID} variant="contained" loading={actions.busy} data-testid="venue-chat-edit-save">
              {t('availability.offers.chat.save')}
            </DuncitButton>
          </DialogActions>
        </Dialog>
      )}
      {deletingId && (
        <ConfirmDialog
          open
          title={t('availability.offers.chat.deleteTitle')}
          message={
            <Stack spacing={1.5}>
              <span>{t('availability.offers.chat.deleteMessage')}</span>
              {error && <Alert severity="error">{error}</Alert>}
            </Stack>
          }
          confirmLabel={t('availability.offers.chat.delete')}
          cancelLabel={t('availability.offers.cancel')}
          destructive
          busy={actions.busy}
          onConfirm={async () => {
            if (await actions.remove(deletingId)) onClose();
          }}
          onClose={onClose}
        />
      )}
    </>
  );
}
