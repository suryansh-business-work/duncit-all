import { Chip, Stack, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import type { CrmLeadQualitySettings } from '@duncit/gql-types';
import { formatDateTime } from '@duncit/app-settings';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { CONFIG_STATUS_COLOR, CONFIG_STATUS_KEY } from './configStatus';

interface Props {
  settings: CrmLeadQualitySettings;
  busy: boolean;
  /** Start a draft from the published version (shown only while there is no draft). */
  onEdit: () => void;
  onDiscard: () => void;
}

/** The version in use, who published it and when, and the draft being edited (if any). */
export default function ConfigHeader({ settings, busy, onEdit, onDiscard }: Readonly<Props>) {
  const { t } = useTranslation();
  const { published, draft } = settings;

  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { md: 'flex-start' } }} data-testid="lead-quality-header">
      <Stack spacing={0.5}>
        <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography variant="h6" component="h2" sx={{ fontWeight: 700 }}>
            {t('crm.leadQualitySettings.publishedVersion', { vars: { version: published.version } })}
          </Typography>
          <Chip size="small" color={CONFIG_STATUS_COLOR.PUBLISHED} label={t(CONFIG_STATUS_KEY.PUBLISHED)} />
          {draft && (
            <Chip size="small" color={CONFIG_STATUS_COLOR.DRAFT} label={t('crm.leadQualitySettings.draftChip', { vars: { version: draft.version } })} />
          )}
        </Stack>
        {published.published_at && (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('crm.leadQualitySettings.publishedBy', {
              vars: { name: published.published_by?.name ?? '', date: formatDateTime(published.published_at) },
            })}
          </Typography>
        )}
        <Typography variant="body2" sx={{ color: 'text.secondary' }} data-testid="lead-quality-draft-status">
          {draft
            ? t('crm.leadQualitySettings.draftStatus', {
                vars: { version: draft.version, name: draft.updated_by.name, date: draft.updated_at ? formatDateTime(draft.updated_at) : '' },
              })
            : t('crm.leadQualitySettings.draftNone')}
        </Typography>
      </Stack>
      {draft ? (
        <DuncitButton variant="outlined" color="error" startIcon={<DeleteIcon />} disabled={busy} onClick={onDiscard} data-testid="lead-quality-discard">
          {t('crm.leadQualitySettings.discardDraft')}
        </DuncitButton>
      ) : (
        <DuncitButton variant="contained" startIcon={<EditIcon />} disabled={busy} onClick={onEdit} data-testid="lead-quality-edit">
          {t('crm.leadQualitySettings.edit')}
        </DuncitButton>
      )}
    </Stack>
  );
}
