import { Alert, Stack, Typography } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import PublishIcon from '@mui/icons-material/Publish';
import { DuncitButton } from '@duncit/buttons';
import { FormField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import type { LeadQualityConfigFormValues } from '../lead-quality-config.schema';
import { useLiveIssues } from './LiveIssues';

interface Props {
  busy: boolean;
  /** The last Publish press was refused by the publish rules. */
  refused: boolean;
  onPublish: () => void;
}

/** The change note, what still blocks publishing, and Save draft / Publish. */
export default function FormActions({ busy, refused, onPublish }: Readonly<Props>) {
  const { t } = useTranslation();
  const { issues } = useLiveIssues();

  return (
    <Stack spacing={1.5}>
      <FormField<LeadQualityConfigFormValues>
        name="change_note"
        label={t('crm.leadQualitySettings.changeNote')}
        hint={t('crm.leadQualitySettings.changeNoteHint')}
        size="small"
        multiline
        minRows={2}
        slotProps={{ htmlInput: { 'data-testid': 'lead-quality-change-note' } }}
      />
      <Typography variant="body2" role="status" sx={{ color: issues.length > 0 ? 'warning.main' : 'success.main' }} data-testid="lead-quality-publish-hint">
        {issues.length > 0
          ? t('crm.leadQualitySettings.publishBlocked', { count: issues.length })
          : t('crm.leadQualitySettings.publishReady')}
      </Typography>
      {refused && (
        <Alert severity="error" data-testid="lead-quality-publish-refused">
          {t('crm.leadQualitySettings.publishRefused')}
        </Alert>
      )}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'flex-end' }}>
        <DuncitButton type="submit" variant="outlined" startIcon={<SaveIcon />} loading={busy} data-testid="lead-quality-save">
          {t('crm.leadQualitySettings.saveDraft')}
        </DuncitButton>
        <DuncitButton variant="contained" startIcon={<PublishIcon />} disabled={busy} onClick={onPublish} data-testid="lead-quality-publish">
          {t('crm.leadQualitySettings.publish')}
        </DuncitButton>
      </Stack>
    </Stack>
  );
}
