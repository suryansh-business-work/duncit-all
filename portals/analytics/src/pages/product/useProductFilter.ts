import { useMemo, useState } from 'react';
import { initialPeriod, type PeriodState } from '../entity-analytics/period-state';
import type { ProductAnalyticsFilter } from './queries';

/**
 * The period and platform a Product page reads — the same rolling presets and
 * calendar ranges as every Analytics dashboard, as the server's filter input.
 */
export function useProductFilter() {
  const [period, setPeriod] = useState<PeriodState>(initialPeriod);
  const filter = useMemo<ProductAnalyticsFilter>(
    () => ({
      ...(period.range ? { from: period.range.from, to: period.range.to } : { days: period.days }),
      platform: period.platform,
    }),
    [period]
  );
  return { period, setPeriod, filter };
}
