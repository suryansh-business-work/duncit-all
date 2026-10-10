import { Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';

export interface FormSaveCancelProps {
  saving: boolean;
  /** Nothing has changed yet, so there is nothing to save. */
  pristine: boolean;
  onCancel: () => void;
}

/** The right-aligned Cancel / Save pair that closes every engine form here. */
export function FormSaveCancel({ saving, pristine, onCancel }: Readonly<FormSaveCancelProps>) {
  const { t } = useTranslation();
  return (
    <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
      <DuncitButton onClick={onCancel} disabled={saving}>
        {t('shell.common.cancel')}
      </DuncitButton>
      <DuncitButton type="submit" variant="contained" disabled={saving || pristine}>
        {saving ? t('shell.common.saving') : t('shell.common.save')}
      </DuncitButton>
    </Stack>
  );
}
