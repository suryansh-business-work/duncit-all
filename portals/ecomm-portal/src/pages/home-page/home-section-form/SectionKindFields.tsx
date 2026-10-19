import type { Control } from 'react-hook-form';
import { Stack, Typography } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import RhfMultiSelect from '../../../components/form/RhfMultiSelect';
import RhfNumberField from '../../../components/form/RhfNumberField';
import type { Option } from '../../../lib/translate';
import type { SectionKind } from '../queries';
import { CATEGORY_KINDS, ITEM_KINDS } from '../section-kinds';
import CollectionSelect from './CollectionSelect';
import ProductSliderFields from './ProductSliderFields';
import SectionItemsEditor from './SectionItemsEditor';
import { TIER_MAX, TIER_MIN, type HomeSectionValues } from './home-section.types';

type SectionControl = Control<HomeSectionValues>;

interface SectionKindFieldsProps {
  kind: SectionKind;
  control: SectionControl;
  collectionOptions: readonly Option[];
  categoryOptions: readonly Option[];
}

/** A flash sale: storewide or one collection, and the discount tabs it offers. */
function FlashSaleFields({ control, collectionOptions }: Readonly<{ control: SectionControl; collectionOptions: readonly Option[] }>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={1}>
      <CollectionSelect control={control} options={collectionOptions} allLabel={t('ecommPortal.homePage.wholeStore')} />
      <RhfTextField
        control={control}
        name="discount_tiers"
        label={t('ecommPortal.homePage.discountTiers')}
        hint={t('ecommPortal.homePage.discountTiersHint', { vars: { min: TIER_MIN, max: TIER_MAX } })}
        required
      />
    </Stack>
  );
}

/** The part of a home section that depends on what it shows. */
export default function SectionKindFields({ kind, control, collectionOptions, categoryOptions }: Readonly<SectionKindFieldsProps>) {
  const { t } = useTranslation();
  if (ITEM_KINDS.has(kind)) return <SectionItemsEditor kind={kind} control={control} />;
  if (kind === 'FLASH_SALE') return <FlashSaleFields control={control} collectionOptions={collectionOptions} />;
  if (kind === 'PRODUCT_SLIDER') {
    return <ProductSliderFields control={control} collectionOptions={collectionOptions} categoryOptions={categoryOptions} />;
  }
  if (kind === 'COLLECTION_CAROUSEL') {
    return (
      <Stack spacing={1}>
        <CollectionSelect control={control} options={collectionOptions} />
        <RhfNumberField control={control} name="product_limit" label={t('ecommPortal.homePage.productLimit')} whole />
      </Stack>
    );
  }
  if (CATEGORY_KINDS.has(kind)) {
    const hint = kind === 'CATEGORY_ICONS' ? t('ecommPortal.homePage.categoryIconsHint') : t('ecommPortal.homePage.categoriesHint');
    return <RhfMultiSelect control={control} name="category_ids" label={t('ecommPortal.nav.categories')} options={categoryOptions} hint={hint} />;
  }
  return (
    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
      {t('ecommPortal.homePage.nothingElse')}
    </Typography>
  );
}
