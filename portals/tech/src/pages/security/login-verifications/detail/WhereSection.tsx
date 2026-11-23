import { Alert, Stack, Typography } from '@mui/material';
import { SecurityLocationMap } from '@duncit/shell';
import { SectionCard } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import Facts from '../../Facts';
import { joinParts, noLocationText } from '../../labels';
import type { LogDetail } from '../queries';

/**
 * The full address, the place it maps to, and the position the person shared.
 *
 * The place is worked out from the address and is only ever as good as the
 * provider's database, so it is labelled approximate every time — it must never
 * be read as where somebody actually was. The map is drawn only from coordinates
 * the person consented to share; without them the section says why not.
 */
export default function WhereSection({ detail }: Readonly<{ detail: LogDetail }>) {
  const { t } = useTranslation();
  const { latitude, longitude } = detail;
  return (
    <SectionCard title={t('tech.loginVerifications.where.title')}>
      <Stack spacing={2}>
        <Facts
          items={[
            { label: t('tech.common.ipAddress'), value: detail.ip, mono: true, testId: 'login-verification-ip' },
            {
              label: t('tech.loginVerifications.where.place'),
              value: (
                <>
                  {joinParts([detail.ip_city, detail.ip_region, detail.ip_country], ', ')}
                  <Typography
                    variant="caption"
                    component="div"
                    sx={{ color: 'text.secondary' }}
                    data-testid="login-verification-approximate"
                  >
                    {t('tech.loginVerifications.where.approximateNote')}
                  </Typography>
                </>
              ),
            },
          ]}
        />
        {typeof latitude === 'number' && typeof longitude === 'number' ? (
          <SecurityLocationMap
            latitude={latitude}
            longitude={longitude}
            accuracyMeters={detail.accuracy_m}
            title={t('tech.loginVerifications.where.mapTitle')}
          />
        ) : (
          <Alert severity="info" variant="outlined" data-testid="login-verification-no-location">
            {noLocationText(t, detail)}
          </Alert>
        )}
      </Stack>
    </SectionCard>
  );
}
