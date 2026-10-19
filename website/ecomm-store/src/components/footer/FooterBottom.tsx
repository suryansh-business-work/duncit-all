import { Stack, Typography } from '@mui/material';
import AccessibilityNewRoundedIcon from '@mui/icons-material/AccessibilityNewRounded';
import { useDateFormat } from '@duncit/app-settings';
import { DuncitButton } from '@duncit/buttons';

import { useStoreSettings } from '../../app/providers/StoreSettingsProvider';
import { useStoreT } from '../../i18n';
import { CookiePreferencesButton, usePreferencesDrawer } from '../preferences';
import { PaymentBadges } from './PaymentBadges';

/** The copyright, the accessibility and cookie controls, and the accepted payment marks. */
export function FooterBottom() {
  const { t } = useStoreT();
  const { store_name: storeName, payment_badges: badges } = useStoreSettings();
  const { openPreferences } = usePreferencesDrawer();
  const dates = useDateFormat();
  return (
    <Stack spacing={2} direction={{ xs: 'column', md: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { md: 'center' } }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1, sm: 2 }} sx={{ alignItems: { sm: 'center' }, flexWrap: 'wrap' }}>
        <Typography variant="body2" color="text.secondary">
          {t('ecommStore.footer.copyright', { vars: { year: dates.now().getFullYear(), name: storeName } })}
        </Typography>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
          <DuncitButton
            variant="outlined"
            color="inherit"
            startIcon={<AccessibilityNewRoundedIcon />}
            aria-haspopup="dialog"
            onClick={openPreferences}
            data-testid="footer-accessibility"
          >
            {t('ecommStore.footer.accessibility')}
          </DuncitButton>
          <CookiePreferencesButton />
        </Stack>
      </Stack>
      <PaymentBadges badges={badges} />
    </Stack>
  );
}
