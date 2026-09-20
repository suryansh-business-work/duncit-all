import { Box, Chip, Stack, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useDateFormat } from '@duncit/app-settings';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import type { RunMessage } from '../types';

interface Props {
  message: RunMessage;
  onOpenEmail: (message: RunMessage) => void;
}

/**
 * One line of the transcript. The contact's words sit on the left, the flow's on
 * the right; a note from the engine sits centred and quiet. A WhatsApp template
 * shows its buttons under the text, an email shows its subject and opens the
 * rendered body on request. A preview that never left says so on its face.
 */
export default function MessageBubble({ message, onOpenEmail }: Readonly<Props>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { formatTime } = useDateFormat();

  if (message.direction === 'SYSTEM') {
    return (
      <Typography
        variant="caption"
        sx={{ alignSelf: 'center', color: 'text.secondary', textAlign: 'center', whiteSpace: 'pre-wrap', px: 2, maxWidth: '90%' }}
      >
        {message.text}
      </Typography>
    );
  }

  const mine = message.direction === 'OUT';
  const badge = message.delivered ? t('ai.automation.test.deliveredBadge') : t('ai.automation.test.previewBadge');
  const badgeColor = message.delivered ? 'success' : 'default';

  return (
    <Box
      sx={{
        alignSelf: mine ? 'flex-end' : 'flex-start',
        maxWidth: '85%',
        px: 1.5,
        py: 1,
        borderRadius: 2.5,
        borderTopLeftRadius: mine ? 20 : 4,
        borderTopRightRadius: mine ? 4 : 20,
        bgcolor: mine ? alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.28 : 0.1) : 'action.hover',
      }}
      data-testid={`automation-message-${message.direction.toLowerCase()}`}
    >
      {message.kind === 'email' ? (
        <Stack spacing={0.75}>
          <Typography variant="subtitle2">{message.subject}</Typography>
          <DuncitButton size="small" variant="outlined" onClick={() => onOpenEmail(message)} sx={{ alignSelf: 'flex-start' }}>
            {t('ai.automation.test.emailPreviewTitle')}
          </DuncitButton>
        </Stack>
      ) : (
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {message.text}
        </Typography>
      )}
      {message.buttons.length > 0 && (
        <Stack spacing={0.5} sx={{ mt: 1 }}>
          {message.buttons.map((label) => (
            <Box
              key={label}
              sx={{ textAlign: 'center', py: 0.5, borderRadius: 1, border: '1px solid', borderColor: 'divider', fontSize: 13, color: 'primary.main' }}
            >
              {label}
            </Box>
          ))}
        </Stack>
      )}
      <Stack direction="row" spacing={1} sx={{ mt: 0.5, alignItems: 'center', justifyContent: 'flex-end' }}>
        {mine && <Chip size="small" label={badge} color={badgeColor} variant="outlined" sx={{ height: 18, fontSize: 10 }} />}
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {formatTime(message.at)}
        </Typography>
      </Stack>
    </Box>
  );
}
