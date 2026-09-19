import { Divider, Stack, Typography } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import { SectionCard } from '@duncit/ui';
import { SeoFields } from '../../../../components/form/IdentityFields';
import RhfNumberField from '../../../../components/form/RhfNumberField';
import RhfSwitch from '../../../../components/form/RhfSwitch';
import type { ProductControl } from './product.types';

/** How the product is found — search engines and the store's own search — and its video. */
export function SeoSection({ control }: Readonly<{ control: ProductControl }>) {
  const { t } = useTranslation();
  return (
    <SectionCard title={t('ecommPortal.common.seo')}>
      <Stack spacing={1} data-testid="product-section-seo">
        <SeoFields control={control} />
        <RhfTextField
          control={control}
          name="search_keywords"
          label={t('ecommPortal.listing.keywords')}
          hint={t('ecommPortal.listing.tagsHint')}
          data-testid="product-keywords"
        />
        <RhfTextField control={control} name="video_url" label={t('ecommPortal.listing.videoUrl')} data-testid="product-video-url" />
      </Stack>
    </SectionCard>
  );
}

/** The buying rules for this product: cash on delivery, returns and the per-order cap. */
export function RulesSection({ control }: Readonly<{ control: ProductControl }>) {
  const { t } = useTranslation();
  return (
    <SectionCard title={t('ecommPortal.listing.rules')}>
      <Stack spacing={1} data-testid="product-section-rules">
        <RhfSwitch control={control} name="cod_available" label={t('ecommPortal.listing.codAvailable')} testId="product-cod" />
        <RhfSwitch control={control} name="returnable" label={t('ecommPortal.listing.returnable')} testId="product-returnable" />
        <Divider />
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('ecommPortal.listing.rulesHint')}
        </Typography>
        <RhfNumberField
          control={control}
          name="return_window_days"
          label={t('ecommPortal.listing.returnWindow')}
          hint={t('ecommPortal.listing.blankStoreDefault')}
          unit={t('ecommPortal.common.days')}
          whole
          testId="product-return-window"
        />
        <RhfNumberField
          control={control}
          name="max_per_order"
          label={t('ecommPortal.listing.maxPerOrder')}
          hint={t('ecommPortal.listing.zeroNoLimit')}
          whole
          testId="product-max-per-order"
        />
      </Stack>
    </SectionCard>
  );
}
