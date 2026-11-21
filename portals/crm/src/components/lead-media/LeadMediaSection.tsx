import { Alert, CircularProgress, Divider, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import type { CrmLeadMedia, CrmLeadMediaEntity } from '../../api/leadMedia.gql';
import { useImageDialogs } from '../image-library/useImageDialogs';
import LeadMediaGroup from './LeadMediaGroup';
import { LEAD_MEDIA_GROUPS, LEAD_MEDIA_TYPES } from './leadMediaConfig';
import { useLeadMedia } from './useLeadMedia';

interface Props {
  entity: CrmLeadMediaEntity;
  leadId: string;
}

/**
 * Lead Details › Logos & Images — the same section on every lead kind. Logos
 * and images are kept apart (a logo is shown whole, an image fills its frame),
 * and each can be previewed, replaced, renamed, moved to the other group or
 * deleted. Every change is saved as it happens; there is no Save button.
 */
export default function LeadMediaSection({ entity, leadId }: Readonly<Props>) {
  const { t } = useTranslation();
  const media = useLeadMedia(entity, leadId);
  const dialogs = useImageDialogs<CrmLeadMedia>({
    accept: LEAD_MEDIA_TYPES,
    busy: media.busy,
    error: media.actionError,
    clearError: media.clearActionError,
    onReplace: media.replace,
    onRename: media.rename,
    onDelete: media.remove,
    deleteMessage: (name) => t('crm.media.deleteMessage', { vars: { name } }),
    testIdPrefix: 'lead-media',
  });

  if (media.loading) {
    return (
      <Stack sx={{ alignItems: 'center', py: 4 }}>
        <CircularProgress aria-label={t('crm.media.loading')} />
      </Stack>
    );
  }
  if (media.loadError) {
    return (
      <Alert
        severity="error"
        action={<DuncitButton size="small" onClick={() => media.refetch()}>{t('shell.common.retry')}</DuncitButton>}
      >
        {media.loadError}
      </Alert>
    );
  }

  const actions = {
    ...dialogs.open,
    move: (item: CrmLeadMedia) => media.move(item, item.kind === 'LOGO' ? 'IMAGE' : 'LOGO'),
  };

  return (
    <Stack spacing={2.5}>
      {media.uploadErrors.length > 0 && (
        <Alert severity="warning" onClose={media.clearUploadErrors}>
          {media.uploadErrors.map((message, index) => (
            <div key={`${index}-${message}`}>{message}</div>
          ))}
        </Alert>
      )}
      {media.actionError && !dialogs.renaming && (
        <Alert severity="error" onClose={media.clearActionError}>
          {media.actionError}
        </Alert>
      )}

      {LEAD_MEDIA_GROUPS.map((group, index) => (
        <Stack key={group.kind} spacing={2.5}>
          {index > 0 && <Divider />}
          <LeadMediaGroup
            group={group}
            items={media.items.filter((item) => item.kind === group.kind)}
            busy={media.busy}
            onUpload={(files) => media.add(group.kind, files)}
            actions={actions}
          />
        </Stack>
      ))}

      {dialogs.dialogs}
    </Stack>
  );
}
