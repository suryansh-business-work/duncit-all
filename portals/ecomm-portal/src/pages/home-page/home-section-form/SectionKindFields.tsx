import type { Control } from 'react-hook-form';
import { Stack, Typography } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import RhfFieldList from '../../../components/form/FieldList';
import RhfMultiSelect from '../../../components/form/RhfMultiSelect';
import RhfNumberField from '../../../components/form/RhfNumberField';
import type { Option } from '../../../lib/translate';
import type { SectionKind } from '../queries';
import { CATEGORY_KINDS, ITEM_KINDS } from '../section-kinds';
import CollectionSelect from './CollectionSelect';
import ProductSliderFields from './ProductSliderFields';
import { BLANK_SECTION_ITEM, TIER_MAX, TIER_MIN, type HomeSectionValues } from './home-section.types';

type SectionControl = Control<HomeSectionValues>;

interface SectionKindFieldsProps {
  kind: SectionKind;
  control: SectionControl;
  collectionOptions: readonly Option[];
  categoryOptions: readonly Option[];
}

/** Banner slides, promo tiles or USP points — each with its pictures, words and link. */
function ItemsEditor({ control }: Readonly<{ control: SectionControl }>) {
  const { t } = useTranslation();
  return (
    <RhfFieldList
      control={control}
      name="items"
      blank={BLANK_SECTION_ITEM}
      max={24}
      columns={[
        { key: 'image_url', label: t('ecommPortal.form.image'), kind: 'image' },
        { key: 'mobile_image_url', label: t('ecommPortal.homePage.mobileImage'), kind: 'image' },
        { key: 'title', label: t('shell.common.title') },
        { key: 'subtitle', label: t('ecommPortal.homePage.subtitleField') },
        { key: 'cta_label', label: t('ecommPortal.homePage.ctaLabel') },
        { key: 'link', label: t('ecommPortal.homePage.link') },
      ]}
      addLabel={t('ecommPortal.homePage.addItem')}
      itemLabel={(position) => t('ecommPortal.homePage.itemN', { vars: { n: position } })}
      emptyText={t('ecommPortal.homePage.noItems')}
    />
  );
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
  if (ITEM_KINDS.has(kind)) return <ItemsEditor control={control} />;
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
