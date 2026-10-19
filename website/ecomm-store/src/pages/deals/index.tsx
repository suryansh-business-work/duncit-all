import { Stack } from '@mui/material';

import { usePageSeo } from '../../lib/usePageSeo';
import { useStoreT } from '../../i18n';
import { DealsHero } from './DealsHero';
import { DealsResults } from './DealsResults';
import { DiscountTiers } from './DiscountTiers';
import { useDealTiers } from './useDealTiers';

/** /deals — everything on sale, biggest discount first, narrowed by the flash sale's tiers. */
export function DealsPage() {
  const { t } = useStoreT();
  usePageSeo(t('ecommStore.deals.title'), t('ecommStore.deals.subtitle'));
  const { tiers, flash, min, setMin } = useDealTiers();
  return (
    <Stack spacing={{ xs: 3, md: 4 }}>
      <DealsHero flash={flash} />
      <DiscountTiers tiers={tiers} min={min} onChange={setMin} />
      <DealsResults key={min ?? 'all'} min={min} onShowAll={() => setMin(null)} />
    </Stack>
  );
}
