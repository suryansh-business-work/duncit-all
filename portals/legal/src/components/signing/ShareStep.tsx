import { Alert, Stack, TextField, Typography } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { isEmail } from '@duncit/regex';

/** Good enough to stop an obvious typo; the server checks it again. */
export const canShareTo = (address: string): boolean => isEmail(address.trim());

interface Props {
  to: string;
  message: string;
  sending: boolean;
  onToChange: (to: string) => void;
  onMessageChange: (message: string) => void;
  onSend: () => void;
}

/**
 * Sending the executed copy on, once there is one.
 *
 * Only reachable after signing, because the server refuses to share an unsigned
 * record at all: passing a draft off as though it were executed is the mistake
 * this whole workflow exists to prevent.
 */
export default function ShareStep({
  to,
  message,
  sending,
  onToChange,
  onMessageChange,
  onSend,
}: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <Stack spacing={2} sx={{ mt: 2 }}>
      <Alert severity="success">{t('legal.sign.lockedNotice')}</Alert>
      <Typography variant="subtitle2" sx={{
        fontWeight: 700
      }}>
        {t('legal.sign.shareHeading')}
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label={t('legal.sign.sendTo')}
          value={to}
          onChange={(e) => onToChange(e.target.value)}
          placeholder={t('legal.sign.sharePlaceholder')}
          fullWidth
        />
        <DuncitButton
          variant="contained"
          startIcon={<SendIcon />}
          disabled={sending || !canShareTo(to)}
          onClick={onSend}
          sx={{ flexShrink: 0 }}
        >
          {sending ? t('legal.sign.sending') : t('legal.sign.sendEmail')}
        </DuncitButton>
      </Stack>
      <TextField
        label={t('legal.sign.message')}
        value={message}
        onChange={(e) => onMessageChange(e.target.value)}
        multiline
        minRows={2}
        fullWidth
      />
    </Stack>
  );
}
