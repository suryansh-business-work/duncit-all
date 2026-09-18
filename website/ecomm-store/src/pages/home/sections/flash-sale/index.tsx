import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Box, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { Loader } from '@duncit/ui';

import { ProductCard } from '../../../../components/product-card';
import { SectionHeading } from '../../../../components/SectionHeading';
import { STORE_SEARCH } from '../../../../graphql/catalog';
import { paths } from '../../../../lib/paths';
import { useStoreT } from '../../../../i18n';
import { STORE_TOKENS as T } from '../../../../theme/tokens';
import type { SectionProps } from '../types';
import { CountdownBoxes } from './CountdownBoxes';
import { useCountdown } from './useCountdown';

const TIER_STYLE = {
  flex: 1,
  border: 0,
  fontWeight: 800,
  color: T.ink,
  '&.Mui-selected, &.Mui-selected:hover': { bgcolor: T.cta, color: T.onBrand },
} as const;

/** Flash sale: a countdown, discount tabs, and the products at least that far off. */
export function FlashSale({ section }: Readonly<SectionProps>) {
  const { t } = useStoreT();
  const countdown = useCountdown(section.ends_at);
  const tiers = section.discount_tiers;
  const [tier, setTier] = useState(tiers[0] ?? 0);
  const { data, loading } = useQuery(STORE_SEARCH, {
    variables: {
      input: {
        on_sale: true,
        min_discount_pct: tier,
        collection: section.collection?.slug,
        sort: 'DISCOUNT',
        page_size: 4,
      },
    },
    skip: countdown.over,
  });
  if (countdown.over) return null;
  const products = data?.storeSearch.items ?? [];
  const viewAll = section.collection ? paths.collection(section.collection.slug) : undefined;
  return (
    <Stack component="section" aria-label={section.title || t('ecommStore.flash.title')} spacing={2}>
      <Stack spacing={2} sx={{ bgcolor: T.brandTint, borderRadius: `${T.radius.card}px`, p: 2 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Stack>
            <Typography variant="h2" component="h2">
              {section.title || t('ecommStore.flash.title')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {section.subtitle || t('ecommStore.flash.subtitle')}
            </Typography>
          </Stack>
          {countdown.ends ? <CountdownBoxes countdown={countdown} /> : null}
        </Stack>
        {tiers.length > 0 ? (
          <ToggleButtonGroup
            exclusive
            value={tier}
            onChange={(_event, next: number | null) => {
              if (next !== null) setTier(next);
            }}
            aria-label={t('ecommStore.flash.chooseDiscount')}
            sx={{ bgcolor: T.surface, borderRadius: T.radius.pill, p: 0.5, gap: 0.5 }}
          >
            {tiers.map((value) => (
              <ToggleButton key={value} value={value} sx={TIER_STYLE}>
                {t('ecommStore.flash.tier', { vars: { pct: value } })}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        ) : null}
      </Stack>
      {viewAll ? <SectionHeading title={t('ecommStore.flash.deals')} viewAll={viewAll} /> : null}
      {loading && products.length === 0 ? <Loader label={t('ecommStore.common.loading')} /> : null}
      <Box component="ul" aria-live="polite" sx={{ listStyle: 'none', p: 0, m: 0, display: 'grid', gap: 1.5, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
        {products.map((product, position) => (
          <Box component="li" key={product.id}>
            <ProductCard product={product} position={position} />
          </Box>
        ))}
      </Box>
    </Stack>
  );
}
