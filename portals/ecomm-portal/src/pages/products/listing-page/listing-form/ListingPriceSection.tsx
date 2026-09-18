import type { Control } from 'react-hook-form';
import { Box, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { SectionCard } from '@duncit/ui';
import RhfNumberField from '../../../../components/form/RhfNumberField';
import { money } from '../../../../lib/format';
import type { StoreListingVariant } from '../../queries';
import type { ListingValues } from './listing.types';

interface ListingPriceSectionProps {
  control: Control<ListingValues>;
  price: number;
  variants: readonly StoreListingVariant[];
}

/**
 * The compare-at price (MRP) the store strikes through beside the selling
 * price — for the product, and for each variant. The selling price itself is
 * the catalogue's, set in the Products console.
 */
export default function ListingPriceSection({ control, price, variants }: Readonly<ListingPriceSectionProps>) {
  const { t } = useTranslation();
  return (
    <SectionCard title={t('ecommPortal.listing.pricing')} subtitle={t('ecommPortal.listing.pricingHint')}>
      <Stack spacing={1}>
        <RhfNumberField
          control={control}
          name="mrp"
          label={t('ecommPortal.products.mrp')}
          hint={t('ecommPortal.listing.sellingAt', { vars: { price: money(price) } })}
        />
        {variants.length > 0 && (
          <Typography component="h3" variant="subtitle2">
            {t('ecommPortal.listing.variantMrps')}
          </Typography>
        )}
        {variants.map((variant, index) => (
          <Box
            key={variant.id}
            sx={{ display: 'grid', gap: 2, alignItems: 'center', gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr' } }}
          >
            <Stack>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {variant.label || variant.sku}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {t('ecommPortal.listing.variantFacts', { vars: { sku: variant.sku, price: money(variant.price), stock: variant.available } })}
              </Typography>
            </Stack>
            <RhfNumberField
              control={control}
              name={`variant_mrps.${index}.mrp`}
              label={t('ecommPortal.listing.variantMrp', { vars: { name: variant.label || variant.sku } })}
            />
          </Box>
        ))}
      </Stack>
    </SectionCard>
  );
}
