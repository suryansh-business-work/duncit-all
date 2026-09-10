import { useEffect, useMemo, useState } from 'react';
import { Alert, Dialog, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import {
  buildContactChangeLabels,
  contactChangeNeedsOtp,
  contactDraftFrom,
  contactSubmitAction,
  type ContactChannel,
  type ContactDraft,
  type ContactSnapshot,
} from '@duncit/utils';
import { useTranslation } from '../../../i18n/useTranslation';
import ContactValueStep from './ContactValueStep';
import ContactOtpStep from './ContactOtpStep';
import { useContactChange } from './useContactChange';

interface Props {
  /** Null while nothing is being changed — that is also what closes the dialog. */
  channel: ContactChannel | null;
  /** What the account holds now, so the box opens on the current value. */
  snapshot: ContactSnapshot;
  onClose: () => void;
  /** Called with the value that was just proved and stored. */
  onSaved: (channel: ContactChannel, draft: ContactDraft) => void;
}

/**
 * Changing one contact detail.
 *
 * One dialog for all three channels rather than three: the refusals and the
 * wording are identical, and only the box in step one differs — which is a
 * prop, not a screen. The address and the WhatsApp number are proved by a code
 * sent to the new value; the contact number is stored the moment step one is
 * submitted, so for it there is no second step and nothing to explain about a
 * code. Its Tamagui twin is the native app's <ChangeContactSheet/>; the logic
 * both drive lives in @duncit/utils (rule 40).
 */
export default function ChangeContactDialog({
  channel,
  snapshot,
  onClose,
  onSaved,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const labels = useMemo(() => buildContactChangeLabels(t), [t]);
  // Held here, not in the step, so the code box still knows which value the
  // code was sent for when it comes to confirm it.
  const [draft, setDraft] = useState<ContactDraft | null>(null);

  const active = channel;
  const change = useContactChange(active ?? 'EMAIL', () => {
    if (active && draft) onSaved(active, draft);
    onClose();
  });
  const { reset } = change;

  // A dialog opened for a second channel must not inherit the first one's
  // half-finished code.
  useEffect(() => {
    reset();
    setDraft(null);
  }, [active, reset]);

  if (!active) return null;

  const copy = labels.channel(active);
  const { state } = change;
  const needsCode = contactChangeNeedsOtp(active);

  const handleSend = async (next: ContactDraft) => {
    const action = contactSubmitAction(snapshot, active, next);
    if (action === 'UNCHANGED') {
      change.setError(labels.unchanged);
      return;
    }
    setDraft(next);
    if (action === 'SEND_CODE') {
      change.sendCode(next);
      return;
    }
    // Closed here, not from the hook: only this dialog holds what was stored.
    if (await change.saveWithoutCode(next)) {
      onSaved(active, next);
      onClose();
    }
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{copy.changeTitle}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5}>
          {state.error && <Alert severity="error">{state.error}</Alert>}
          {state.step === 'ENTER' ? (
            <ContactValueStep
              channel={active}
              labels={labels}
              // The draft they already typed, when there is one: "Change this"
              // exists to fix a typo, and reseeding from the account would
              // throw away the number they came back to correct.
              defaultValues={draft ?? contactDraftFrom(snapshot, active)}
              busy={state.sending}
              onSend={handleSend}
            />
          ) : (
            <ContactOtpStep
              labels={labels}
              sentTo={state.sentTo}
              testCode={state.testCode}
              busy={state.verifying}
              onVerify={(otp) => draft && change.verify(draft, otp)}
              onEditValue={change.editValue}
            />
          )}
          {needsCode && (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {labels.whyOtp}
            </Typography>
          )}
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
