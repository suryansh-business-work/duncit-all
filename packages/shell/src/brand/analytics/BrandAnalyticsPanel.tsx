import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, Skeleton, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import { BrandAnalyticsReport } from './BrandAnalyticsReport';
import { WindowSelector } from './WindowSelector';
import {
  BRAND_ANALYTICS,
  DEFAULT_BRAND_ANALYTICS_WINDOW,
  type BrandAnalyticsWindow,
} from './queries';

export interface BrandAnalyticsPanelProps {
  /** The brand's document id. */
  brandId: string;
}

function LoadingState({ label }: Readonly<{ label: string }>) {
  return (
    <Stack role="status" aria-label={label} spacing={2} data-testid="brand-analytics-loading">
      <Skeleton variant="rounded" sx={{ height: (theme) => theme.spacing(12) }} />
      <Skeleton variant="rounded" sx={{ height: (theme) => theme.spacing(15) }} />
      <Skeleton variant="rounded" sx={{ height: (theme) => theme.spacing(20) }} />
    </Stack>
  );
}

/**
 * A brand's sales over the last 7, 30 or 90 days. The brand owner (Partners)
 * and staff (Products) mount the same panel; the server scopes which brands
 * each may read and does every calculation, so nothing here does sums.
 */
export function BrandAnalyticsPanel({ brandId }: Readonly<BrandAnalyticsPanelProps>) {
  const { t } = useTranslation();
  const [days, setDays] = useState<BrandAnalyticsWindow>(DEFAULT_BRAND_ANALYTICS_WINDOW);
  const { data, error, refetch } = useQuery(BRAND_ANALYTICS, {
    variables: { brand_doc_id: brandId, days },
    fetchPolicy: 'cache-and-network',
  });

  // A failed retry lands in the hook's `error`, which the alert below already
  // shows — the rejected promise carries nothing more to tell the reader.
  const retry = () => {
    refetch().catch(() => undefined);
  };

  let body;
  if (error) {
    body = (
      <Alert
        severity="error"
        data-testid="brand-analytics-error"
        action={
          <DuncitButton size="small" color="inherit" onClick={retry} data-testid="brand-analytics-retry">
            {t('shell.brandConsole.retry')}
          </DuncitButton>
        }
      >
        {parseApiError(error, t('shell.brandConsole.analyticsLoadFailed'))}
      </Alert>
    );
  } else if (data) {
    body = <BrandAnalyticsReport analytics={data.brandAnalytics} />;
  } else {
    body = <LoadingState label={t('shell.brandConsole.analyticsLoading')} />;
  }

  return (
    <Stack spacing={2} data-testid="brand-analytics-panel">
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' } }}
      >
        <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 'fontWeightBold' }}>
          {t('shell.brandConsole.analyticsTitle')}
        </Typography>
        <WindowSelector value={days} onChange={setDays} />
      </Stack>
      {body}
    </Stack>
  );
}
