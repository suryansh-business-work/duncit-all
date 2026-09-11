import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Alert, Box, Card, Stack, TextField, Typography } from '@mui/material';
import { alpha, type Theme } from '@mui/material/styles';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '../../i18n/useTranslation';
import { SUBSCRIBE_MEMBERSHIP_NEWS } from './queries';

interface Props {
  /** The signed-in account's address. Read-only: the server stamps the address
   * from the profile, so a typed one would be ignored anyway. */
  email: string;
  /** Whether the caller is already on the list, per the pricing query. */
  subscribed: boolean;
}

/** The "you are on the list" mark: the tick on its tonal green disc. */
const DONE_DISC_SX = {
  width: 40,
  height: 40,
  flexShrink: 0,
  borderRadius: '50%',
  display: 'grid',
  placeItems: 'center',
  color: 'success.main',
  bgcolor: (theme: Theme) => alpha(theme.palette.success.main, 0.12),
  '& svg': { fontSize: 20 },
} as const;

export default function NotifyCard({ email, subscribed }: Readonly<Props>) {
  const { t } = useTranslation();
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);
  const [subscribe, { loading }] = useMutation<any>(SUBSCRIBE_MEMBERSHIP_NEWS);
  const isOnList = subscribed || done;

  const onSubscribe = async () => {
    setFailed(false);
    try {
      await subscribe();
      setDone(true);
    } catch {
      setFailed(true);
    }
  };

  if (isOnList) {
    return (
      <Card sx={{ p: 2 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <Box sx={DONE_DISC_SX}>
            <MarkEmailReadIcon />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {t('mweb.membership.notifyDone')}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {t('mweb.membership.notifyDoneBody')}
            </Typography>
          </Box>
        </Stack>
      </Card>
    );
  }

  return (
    <Card sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Stack direction="row" spacing={1} sx={{
          alignItems: "center"
        }}>
          <NotificationsActiveIcon fontSize="small" color="secondary" />
          <Typography component="h2" sx={{ fontSize: '1.0625rem', fontWeight: 600 }}>
            {t('mweb.membership.notifyTitle')}
          </Typography>
        </Stack>

        <TextField
          size="small"
          fullWidth
          label={t('mweb.membership.notifyEmailLabel')}
          value={email}
          helperText={email ? t('mweb.membership.notifyEmailHint') : t('mweb.membership.notifyNoEmail')}
          error={!email}
          slotProps={{
            input: { readOnly: true }
          }}
        />

        {failed && <Alert severity="error">{t('mweb.membership.notifyError')}</Alert>}

        <DuncitButton
          variant="contained"
          size="large"
          fullWidth
          disabled={loading || !email}
          onClick={onSubscribe}
        >
          {loading ? t('mweb.membership.notifySubmitting') : t('mweb.membership.notifyCta')}
        </DuncitButton>
      </Stack>
    </Card>
  );
}
