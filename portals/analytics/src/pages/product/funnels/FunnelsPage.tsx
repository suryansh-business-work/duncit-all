import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, Stack } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { SectionCard } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';
import ProductPage from '../ProductPage';
import { PAGE_COPY } from '../page-copy';
import ProductFilterBar from '../ProductFilterBar';
import { useProductFilter } from '../useProductFilter';
import { PRODUCT_EVENT_NAMES, PRODUCT_FUNNEL } from '../queries';
import { FunnelForm, STARTER_FUNNEL, type FunnelValues } from './funnel-form';
import FunnelResult from './FunnelResult';

/**
 * Analytics > Product > Funnels — any ordered path through the app: tracked
 * events, screens, presses and server-confirmed outcomes. The steps are kept
 * when the period or platform changes, and the funnel re-reads on its own.
 */
export default function FunnelsPage() {
  const { t } = useTranslation();
  const { period, setPeriod, filter } = useProductFilter();
  const [funnel, setFunnel] = useState<FunnelValues>(STARTER_FUNNEL);
  const names = useQuery(PRODUCT_EVENT_NAMES, { variables: { filter } });
  const { data, loading, error } = useQuery(PRODUCT_FUNNEL, {
    variables: { steps: funnel.steps, window_days: funnel.window_days, filter },
  });
  const result = data?.productFunnel;
  return (
    <ProductPage
      copy={PAGE_COPY.funnels}
      actions={<ProductFilterBar value={period} onChange={setPeriod} />}
      testId="product-funnels"
    >
      <SectionCard title={t('analytics.product.funnels.builder')}>
        <FunnelForm
          defaultValues={funnel}
          events={(names.data?.productEventNames ?? []).map((row) => row.key)}
          screens={(names.data?.productScreenNames ?? []).map((row) => row.key)}
          busy={loading}
          onSubmit={setFunnel}
        />
      </SectionCard>
      <Stack spacing={2}>
        {error && <Alert severity="error">{parseApiError(error)}</Alert>}
        {result && <FunnelResult funnel={result} />}
      </Stack>
    </ProductPage>
  );
}
