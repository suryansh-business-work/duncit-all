import { Chip, Stack } from '@mui/material';
import type { IntelMessageAttachment } from '@duncit/gql-types';
import { useTranslation } from '@duncit/app-settings';
import { notifyError } from '@duncit/dialogs';
import { fireAndForget } from '@duncit/logs';
import { intelLog } from '../../../lib/logger';
import { fileObjectUrl, RestError } from '../../../lib/rest';
import { attachmentIcon } from '../composer/AttachmentTray';

/** The images and PDFs sent with a question; each opens the stored file in a new tab. */
export default function MessageAttachments({ attachments }: Readonly<{ attachments: readonly IntelMessageAttachment[] }>) {
  const { t } = useTranslation();
  if (attachments.length === 0) return null;
  const open = async (file: IntelMessageAttachment) => {
    try {
      const url = await fileObjectUrl(file.id);
      window.open(url, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      notifyError(err instanceof RestError && err.status === 404 ? t('intel.chat.attachmentGone') : t('intel.chat.attachmentOpenFailed'));
    }
  };
  return (
    <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.75, justifyContent: 'flex-end', mt: 0.75, maxWidth: { xs: '92%', md: '75%' } }}>
      {attachments.map((file) => (
        <Chip
          key={file.id}
          size="small"
          variant="outlined"
          icon={attachmentIcon(file.mime)}
          label={file.name}
          clickable
          aria-label={t('intel.chat.openAttachment', { vars: { name: file.name } })}
          onClick={() => fireAndForget(open(file), intelLog, '/c', 'MessageAttachments.open')}
          sx={{ maxWidth: 240 }}
        />
      ))}
    </Stack>
  );
}
