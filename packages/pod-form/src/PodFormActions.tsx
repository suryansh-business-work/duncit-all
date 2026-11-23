import { useId } from 'react';
import { Box, DialogActions, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useEconomicsGate } from './finance/useEconomicsGate';
import { useTranslation } from './i18n/useTranslation';

interface Props {
  /** Save as Draft is offered on create only (and never for an Auto Pod). */
  showDraft: boolean;
  busy: boolean;
  disabled: boolean;
  onCancel: () => void;
  onDraft: () => void;
  /** Marks the next submit as a publish; the form's own submit handler runs after. */
  onPublish: () => void;
}

/** The form's footer: Cancel, the optional Save as Draft, and Save. Both saves
 * write the pod, so both wait while the server's earnings verdict has not
 * cleared a paid pod (`useEconomicsGate`), with a line saying so. */
export default function PodFormActions({
  showDraft,
  busy,
  disabled,
  onCancel,
  onDraft,
  onPublish,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const blocked = useEconomicsGate();
  const hintId = useId();
  const saveDisabled = disabled || blocked;
  const describedBy = blocked ? hintId : undefined;
  return (
    <Box>
      <DialogActions sx={{ p: 0 }}>
        <DuncitButton onClick={onCancel}>{t('podForm.common.cancel')}</DuncitButton>
        {showDraft && (
          <DuncitButton variant="outlined" type="button" disabled={saveDisabled} onClick={onDraft} aria-describedby={describedBy}>
            {t('podForm.common.saveAsDraft')}
          </DuncitButton>
        )}
        <DuncitButton
          variant="contained"
          type="submit"
          disabled={saveDisabled}
          onClick={onPublish}
          aria-describedby={describedBy}
          data-testid="pod-form-save"
        >
          {busy ? 'Saving…' : 'Save'}
        </DuncitButton>
      </DialogActions>
      <Box aria-live="polite">
        {blocked && (
          <Typography id={hintId} variant="caption" component="p" data-testid="pod-form-save-blocked" sx={{ color: 'text.secondary', textAlign: 'right', mt: 1 }}>
            {t('podForm.priceBreakdown.viability.saveBlocked')}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
