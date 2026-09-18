import type { Control } from 'react-hook-form';
import { MenuItem } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import type { Option } from '../../../lib/translate';
import type { HomeSectionValues } from './home-section.types';

interface CollectionSelectProps {
  control: Control<HomeSectionValues>;
  options: readonly Option[];
  /** Offer "the whole store" as a blank choice — a flash sale may run storewide. */
  allLabel?: string;
}

/** The collection a section draws its products from. */
export default function CollectionSelect({ control, options, allLabel }: Readonly<CollectionSelectProps>) {
  const { t } = useTranslation();
  return (
    <RhfTextField control={control} name="collection_id" label={t('ecommPortal.homePage.collection')} select required={!allLabel}>
      {allLabel && <MenuItem value="">{allLabel}</MenuItem>}
      {options.map((option) => (
        <MenuItem key={option.value} value={option.value}>
          {option.label}
        </MenuItem>
      ))}
    </RhfTextField>
  );
}
