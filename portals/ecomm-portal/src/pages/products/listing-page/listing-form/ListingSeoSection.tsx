import type { Control } from 'react-hook-form';
import { Box, Divider, Stack, Typography } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import { SectionCard } from '@duncit/ui';
import { SeoFields } from '../../../../components/form/IdentityFields';
import RhfNumberField from '../../../../components/form/RhfNumberField';
import RhfSwitch from '../../../../components/form/RhfSwitch';
import type { ListingValues } from './listing.types';

type ListingControl = Control<ListingValues>;

/** How the product is found — search engines and the store's own search — and its video. */
export function ListingSeoSection({ control }: Readonly<{ control: ListingControl }>) {
  const { t } = useTranslation();
  return (
    <SectionCard title={t('ecommPortal.common.seo')}>
      <Stack spacing={1}>
        <SeoFields control={control} />
        <RhfTextField control={control} name="search_keywords" label={t('ecommPortal.listing.keywords')} hint={t('ecommPortal.form.commaHint')} />
        <RhfTextField control={control} name="video_url" label={t('ecommPortal.listing.videoUrl')} />
      </Stack>
    </SectionCard>
  );
}

/** The buying rules for this product: cash on delivery, returns and the per-order cap. */
export function ListingRulesSection({ control }: Readonly<{ control: ListingControl }>) {
  const { t } = useTranslation();
  return (
    <SectionCard title={t('ecommPortal.listing.rules')}>
      <Stack spacing={1}>
        <RhfSwitch control={control} name="cod_available" label={t('ecommPortal.listing.codAvailable')} />
        <RhfSwitch control={control} name="returnable" label={t('ecommPortal.listing.returnable')} />
        <Divider />
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('ecommPortal.listing.rulesHint')}
        </Typography>
        <Box sx={{ display: 'grid', columnGap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
          <RhfNumberField
            control={control}
            name="return_window_days"
            label={t('ecommPortal.listing.returnWindow')}
            hint={t('ecommPortal.listing.blankStoreDefault')}
            unit={t('ecommPortal.common.days')}
            whole
          />
          <RhfNumberField control={control} name="max_per_order" label={t('ecommPortal.listing.maxPerOrder')} hint={t('ecommPortal.listing.zeroNoLimit')} whole />
        </Box>
      </Stack>
    </SectionCard>
  );
}
