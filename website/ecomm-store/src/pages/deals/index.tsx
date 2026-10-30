import { Stack, Typography } from '@mui/material';

import { visuallyHidden } from '../../lib/a11y';
import { usePageSeo } from '../../lib/usePageSeo';
import { useStoreT } from '../../i18n';
import { Section } from '../home/sections';
import { DealsHero } from './DealsHero';
import { DealsResults } from './DealsResults';
import { DiscountTiers } from './DiscountTiers';
import { useDealsSections } from './useDealsSections';
import { useDealTiers } from './useDealTiers';

/**
 * /deals: the operator's sections (if any) over everything on sale, biggest
 * discount first, narrowed by the flash sale's tiers. The results never wait
 * for the sections.
 */
export function DealsPage() {
  const { t } = useStoreT();
  usePageSeo(t('ecommStore.deals.title'), t('ecommStore.deals.subtitle'));
  const { tiers, flash, min, setMin } = useDealTiers();
  const { sections, replacesHero, introIsTitle, needsHiddenTitle } = useDealsSections();
  return (
    <Stack spacing={{ xs: 3, md: 4 }}>
      {replacesHero ? null : <DealsHero flash={flash} />}
      {needsHiddenTitle ? (
        <Typography component="h1" sx={visuallyHidden}>
          {t('ecommStore.deals.title')}
        </Typography>
      ) : null}
      {sections.map((section, index) => (
        <Section key={section.id} section={section} pageTitle={index === 0 && introIsTitle} />
      ))}
      <DiscountTiers tiers={tiers} min={min} onChange={setMin} />
      <DealsResults key={min ?? 'all'} min={min} onShowAll={() => setMin(null)} />
    </Stack>
  );
}
