import { Link as RouterLink } from 'react-router-dom';
import { Card, CardActionArea, CardContent, Stack, Typography } from '@mui/material';
import MarkEmailReadOutlinedIcon from '@mui/icons-material/MarkEmailReadOutlined';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useTranslation } from '@duncit/app-settings';

/**
 * Profile → Mail Preference. A door rather than the controls themselves: there
 * are nine categories with a sentence each, and inlining them would push the
 * account page's own information off the first screen.
 */
export default function MailPreferenceCard() {
  const { t } = useTranslation();

  return (
    <Card variant="outlined" sx={{ borderRadius: '16px' }}>
      <CardActionArea component={RouterLink} to="/account/mail-preference">
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <MarkEmailReadOutlinedIcon color="action" />
            <Stack sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle1" fontWeight={600}>
                {t('mailPreference.title')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('mailPreference.entryHint')}
              </Typography>
            </Stack>
            <ChevronRightIcon color="action" />
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
