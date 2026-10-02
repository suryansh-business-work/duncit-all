import { Card, CardContent, Stack, Typography } from '@mui/material';
import { makeConsent, type ConsentCategory } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import { useWebConsent } from '../../app/useWebConsent';
import { applyWebConsent, ConsentSwitches } from '../../components/consent';
import { notifySuccess } from '../../components/notify';

/**
 * The tracking choices, changeable at any time — withdrawing consent is as
 * easy as giving it. A switch saves at once; the signed-in sync
 * (useConsentSync) records the new answer on the server.
 */
export default function TrackingChoicesCard() {
  const { t } = useTranslation();
  const choice = useWebConsent();
  const values = { analytics: choice?.analytics === true, marketing: choice?.marketing === true };

  const change = (category: ConsentCategory, checked: boolean) => {
    applyWebConsent(makeConsent({ ...values, [category]: checked }));
    notifySuccess(t('privacy.page.saved'));
  };

  return (
    <Card data-testid="privacy-tracking-card">
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Stack spacing={1.5}>
          <Stack spacing={0.25}>
            <Typography component="h2" sx={{ fontSize: 16, fontWeight: 600 }}>
              {t('privacy.page.trackingTitle')}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {t('privacy.page.trackingBlurb')}
            </Typography>
          </Stack>
          <ConsentSwitches values={values} onChange={change} />
        </Stack>
      </CardContent>
    </Card>
  );
}
