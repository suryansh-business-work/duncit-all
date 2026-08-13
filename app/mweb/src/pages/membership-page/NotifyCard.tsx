import { useState } from 'react';
import { useMutation } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import { useTranslation } from '../../i18n/useTranslation';
import { SUBSCRIBE_MEMBERSHIP_NEWS } from './queries';

interface Props {
  /** The signed-in account's address. Read-only: the server stamps the address
   * from the profile, so a typed one would be ignored anyway. */
  email: string;
  /** Whether the caller is already on the list, per the pricing query. */
  subscribed: boolean;
}

export default function NotifyCard({ email, subscribed }: Readonly<Props>) {
  const { t } = useTranslation();
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);
  const [subscribe, { loading }] = useMutation(SUBSCRIBE_MEMBERSHIP_NEWS);
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
      <Alert severity="success" icon={<MarkEmailReadIcon fontSize="small" />}>
        <Typography variant="body2" fontWeight={700}>
          {t('mweb.membership.notifyDone')}
        </Typography>
        <Typography variant="body2">{t('mweb.membership.notifyDoneBody')}</Typography>
      </Alert>
    );
  }

  return (
    <Card variant="outlined" sx={{ borderRadius: '16px' }}>
      <CardContent>
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1} alignItems="center">
            <NotificationsActiveIcon fontSize="small" color="primary" />
            <Typography variant="subtitle1" fontWeight={700}>
              {t('mweb.membership.notifyTitle')}
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {t('mweb.membership.notifyBody')}
          </Typography>

          <TextField
            size="small"
            fullWidth
            label={t('mweb.membership.notifyEmailLabel')}
            value={email}
            helperText={email ? t('mweb.membership.notifyEmailHint') : t('mweb.membership.notifyNoEmail')}
            error={!email}
            InputProps={{ readOnly: true }}
          />

          {failed && <Alert severity="error">{t('mweb.membership.notifyError')}</Alert>}

          <Box>
            <Button
              variant="contained"
              disabled={loading || !email}
              onClick={onSubscribe}
            >
              {loading ? t('mweb.membership.notifySubmitting') : t('mweb.membership.notifyCta')}
            </Button>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
