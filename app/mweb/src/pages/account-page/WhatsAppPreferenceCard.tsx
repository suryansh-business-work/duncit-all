import { Link as RouterLink } from 'react-router-dom';
import { Card, CardActionArea, CardContent, Stack, Typography } from '@mui/material';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useTranslation } from '@duncit/app-settings';

/**
 * Profile → WhatsApp Preference. A door rather than the controls themselves,
 * for the same reason the mail one is: eight categories with a sentence each
 * would push the account page's own information off the first screen.
 */
export default function WhatsAppPreferenceCard() {
  const { t } = useTranslation();

  return (
    <Card variant="outlined" sx={{ borderRadius: '16px' }}>
      <CardActionArea component={RouterLink} to="/account/whatsapp-preference">
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <WhatsAppIcon color="action" />
            <Stack sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle1" fontWeight={600}>
                {t('whatsappPreference.title')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('whatsappPreference.entryHint')}
              </Typography>
            </Stack>
            <ChevronRightIcon color="action" />
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
