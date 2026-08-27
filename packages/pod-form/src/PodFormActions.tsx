import { DialogActions } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
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

/** The form's footer: Cancel, the optional Save as Draft, and Save. */
export default function PodFormActions({
  showDraft,
  busy,
  disabled,
  onCancel,
  onDraft,
  onPublish,
}: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <DialogActions sx={{ p: 0 }}>
      <DuncitButton onClick={onCancel}>{t('podForm.common.cancel')}</DuncitButton>
      {showDraft && (
        <DuncitButton variant="outlined" type="button" disabled={disabled} onClick={onDraft}>
          Save as Draft
        </DuncitButton>
      )}
      <DuncitButton variant="contained" type="submit" disabled={disabled} onClick={onPublish}>
        {busy ? 'Saving…' : 'Save'}
      </DuncitButton>
    </DialogActions>
  );
}
