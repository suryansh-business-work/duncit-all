import { useWatch, type Control } from 'react-hook-form';
import { MenuItem, Stack } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import ProductPicker from '../../../components/ProductPicker';
import RhfNumberField from '../../../components/form/RhfNumberField';
import type { Option } from '../../../lib/translate';
import { PRODUCT_SOURCES, PRODUCT_SOURCE_KEYS } from '../section-kinds';
import CollectionSelect from './CollectionSelect';
import { MAX_PRODUCTS, type HomeSectionValues } from './home-section.types';

interface ProductSliderFieldsProps {
  control: Control<HomeSectionValues>;
  collectionOptions: readonly Option[];
  categoryOptions: readonly Option[];
}

/** A product slider: where its products come from, what that source needs, and how many it shows. */
export default function ProductSliderFields({ control, collectionOptions, categoryOptions }: Readonly<ProductSliderFieldsProps>) {
  const { t } = useTranslation();
  const source = useWatch({ control, name: 'product_source' });
  return (
    <Stack spacing={1}>
      <RhfTextField control={control} name="product_source" label={t('ecommPortal.homePage.productSource')} select>
        {PRODUCT_SOURCES.map((value) => (
          <MenuItem key={value} value={value}>
            {t(PRODUCT_SOURCE_KEYS[value])}
          </MenuItem>
        ))}
      </RhfTextField>
      {source === 'COLLECTION' && <CollectionSelect control={control} options={collectionOptions} />}
      {source === 'CATEGORY' && (
        <RhfTextField control={control} name="slider_category_id" label={t('ecommPortal.homePage.category')} select required>
          {categoryOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </RhfTextField>
      )}
      {source === 'MANUAL' && <ProductPicker control={control} name="product_ids" max={MAX_PRODUCTS} withStrip />}
      <RhfNumberField
        control={control}
        name="product_limit"
        label={t('ecommPortal.homePage.productLimit')}
        hint={t('ecommPortal.homePage.productLimitRange', { vars: { max: MAX_PRODUCTS } })}
        whole
      />
    </Stack>
  );
}
