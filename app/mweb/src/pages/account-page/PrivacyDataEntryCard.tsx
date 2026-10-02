import { Link as RouterLink } from 'react-router';
import { Card, CardActionArea, Stack, Typography } from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRightRounded';
import PrivacyTipOutlinedIcon from '@mui/icons-material/PrivacyTipOutlined';
import { useTranslation } from '@duncit/app-settings';
import IconDisc from './IconDisc';

/** Where tracking choices and the data download live. */
export const PRIVACY_PATH = '/account/privacy';

/** Profile Settings → Privacy & data: one row, the door to the screen. */
export default function PrivacyDataEntryCard() {
  const { t } = useTranslation();
  return (
    <Card data-testid="privacy-entry">
      <CardActionArea component={RouterLink} to={PRIVACY_PATH} sx={{ px: 2, py: 1.75 }}>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <IconDisc>
            <PrivacyTipOutlinedIcon />
          </IconDisc>
          <Stack sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: 15, fontWeight: 500 }}>{t('privacy.page.title')}</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {t('privacy.page.entryHint')}
            </Typography>
          </Stack>
          <ChevronRightIcon sx={{ color: 'text.secondary' }} />
        </Stack>
      </CardActionArea>
    </Card>
  );
}
