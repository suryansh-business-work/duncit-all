import { Box, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '../i18n/useTranslation';
import type { StaffMessage } from './queries';

interface Props {
  replyTo: StaffMessage;
  nameOf: (userId: string) => string;
  onCancel: () => void;
}

/**
 * What you are answering, until it is sent.
 *
 * A reply with no visible target is a message that reads as a non sequitur to
 * its own author.
 */
export default function ReplyStrip({ replyTo, nameOf, onCancel }: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{
        alignItems: "center",
        px: 1.5,
        py: 0.75,
        borderTop: 1,
        borderColor: 'divider',
        bgcolor: 'action.hover'
      }}>
      <Box sx={{ width: 3, alignSelf: 'stretch', bgcolor: 'primary.main', borderRadius: 1 }} />
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>
          {t('shell.chat.composer.replyingTo', { vars: { name: nameOf(replyTo.from_user_id) } })}
        </Typography>
        <Typography
          variant="caption"
          noWrap
          sx={{
            color: "text.secondary",
            display: 'block'
          }}>
          {replyTo.text || replyTo.attachment_name || t('shell.chat.composer.attachment')}
        </Typography>
      </Box>
      <DuncitIconButton size="small" onClick={onCancel} aria-label={t('shell.chat.composer.cancelReply')}>
        <CloseIcon fontSize="small" />
      </DuncitIconButton>
    </Stack>
  );
}
