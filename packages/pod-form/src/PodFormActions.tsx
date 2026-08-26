import { Button, DialogActions } from '@mui/material';
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
    <DialogActions sx={{ px: 0, pb: 0, pt: 2 }}>
      <Button onClick={onCancel}>{t('podForm.common.cancel')}</Button>
      {showDraft && (
        <Button variant="outlined" type="button" disabled={disabled} onClick={onDraft}>
          Save as Draft
        </Button>
      )}
      <Button variant="contained" type="submit" disabled={disabled} onClick={onPublish}>
        {busy ? 'Saving…' : 'Save'}
      </Button>
    </DialogActions>
  );
}
