import { Card, Stack, TextField, ToggleButton, ToggleButtonGroup } from '@mui/material';
import SectionHeader from '../../components/SectionHeader';
import { useTranslation } from '../../i18n/useTranslation';
import { SEGMENTED_TOGGLE_SX } from './segmentedSx';

interface GiftRecipientFieldsProps {
  gift: boolean;
  onGift: (gift: boolean) => void;
  email: string;
  onEmail: (email: string) => void;
  /** True once a non-empty entry fails the shared EMAIL pattern. */
  emailError: boolean;
  name: string;
  onName: (name: string) => void;
  message: string;
  onMessage: (message: string) => void;
}

/** "For myself / send as a gift" — the recipient fields appear only when it is
 * a gift; a self card is emailed to the buyer's own address server-side. */
export default function GiftRecipientFields({
  gift,
  onGift,
  email,
  onEmail,
  emailError,
  name,
  onName,
  message,
  onMessage,
}: Readonly<GiftRecipientFieldsProps>) {
  const { t } = useTranslation();
  const emailHelper = emailError
    ? t('mweb.auth.validation.emailInvalid')
    : t('mweb.giftCards.recipientEmailHint');

  return (
    <Card sx={{ p: 2 }}>
      <SectionHeader title={t('mweb.giftCards.forHeading')} />
      <ToggleButtonGroup
        exclusive
        fullWidth
        size="small"
        value={gift ? 'gift' : 'self'}
        onChange={(_event, next: string | null) => next && onGift(next === 'gift')}
        sx={{ ...SEGMENTED_TOGGLE_SX, mt: 1.5 }}
      >
        <ToggleButton value="self">{t('mweb.giftCards.forMyself')}</ToggleButton>
        <ToggleButton value="gift">{t('mweb.giftCards.forSomeone')}</ToggleButton>
      </ToggleButtonGroup>
      {gift && (
        <Stack spacing={1.5} sx={{ mt: 2 }}>
          <TextField
            required
            fullWidth
            type="email"
            label={t('mweb.giftCards.recipientEmailLabel')}
            value={email}
            onChange={(event) => onEmail(event.target.value)}
            error={emailError}
            helperText={emailHelper}
          />
          <TextField
            fullWidth
            label={t('mweb.giftCards.recipientNameLabel')}
            value={name}
            onChange={(event) => onName(event.target.value)}
            slotProps={{
              htmlInput: { maxLength: 160 }
            }}
          />
          <TextField
            fullWidth
            multiline
            minRows={2}
            label={t('mweb.giftCards.messageLabel')}
            value={message}
            onChange={(event) => onMessage(event.target.value)}
            helperText={t('mweb.giftCards.messageHint')}
            slotProps={{
              htmlInput: { maxLength: 300 }
            }}
          />
        </Stack>
      )}
    </Card>
  );
}
