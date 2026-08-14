import { Link as RouterLink } from 'react-router-dom';
import { Button, Card, CardContent, Stack, Typography } from '@mui/material';
import PhonelinkEraseOutlinedIcon from '@mui/icons-material/PhonelinkEraseOutlined';
import { useTranslation } from '@duncit/app-settings';

/**
 * The state Mail Preference has no equivalent of: an account with no sendable
 * WhatsApp number.
 *
 * Whether a number counts as sendable is the server's answer (`reachable`), not
 * a regex run again on the client — a number the account holds but WhatsApp has
 * never accepted looks perfectly valid from here.
 */
export default function NoWhatsAppNumberCard() {
  const { t } = useTranslation();

  return (
    <Card variant="outlined" sx={{ borderRadius: '16px' }}>
      <CardContent>
        <Stack direction="row" alignItems="flex-start" spacing={1.5}>
          <PhonelinkEraseOutlinedIcon color="action" />
          <Stack spacing={1} sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" fontWeight={700}>
              {t('whatsappPreference.noNumberTitle')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('whatsappPreference.noNumberBody')}
            </Typography>
            <Button
              component={RouterLink}
              to="/account"
              variant="contained"
              sx={{ alignSelf: 'flex-start' }}
            >
              {t('whatsappPreference.addNumber')}
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
