import { MenuItem, Stack, Typography } from '@mui/material';
import type { Control } from 'react-hook-form';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import { LISTING_LIMITS, type StoreListingValues } from './store-listing.types';

interface Props {
  control: Control<StoreListingValues>;
  /** Apple's category ids. Empty until App Store Connect is connected. */
  categories: string[];
  /** What is stored now, so an id Apple no longer lists still shows. */
  currentCategory: string;
}

const max = (n: number) => ({ max: String(n) });

/** `SOCIAL_NETWORKING` → `Social networking`, for the picker. The id is what is saved. */
const humanize = (id: string): string => {
  const words = id.toLowerCase().replaceAll('_', ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
};

const SectionTitle = ({ label }: Readonly<{ label: string }>) => (
  <Typography variant="subtitle2" sx={{ mt: 1 }}>
    {label}
  </Typography>
);

/** Apple's categories as a picker when they are known, a plain field to hold the id otherwise. */
function CategoryField({ control, categories, currentCategory }: Readonly<Props>) {
  const { t } = useTranslation();
  const label = t('tech.storeListing.primaryCategory');
  if (categories.length === 0) {
    return (
      <RhfTextField
        control={control}
        name="primary_category"
        label={label}
        hint={t('tech.storeListing.primaryCategoryUnavailable')}
      />
    );
  }
  const options = categories.includes(currentCategory) || !currentCategory ? categories : [currentCategory, ...categories];
  return (
    <RhfTextField control={control} name="primary_category" label={label} hint={t('tech.storeListing.primaryCategoryHint')} select>
      {options.map((id) => (
        <MenuItem key={id} value={id}>
          {humanize(id)}
        </MenuItem>
      ))}
    </RhfTextField>
  );
}

/** The copy and links: what both stores share first, then each store's own. */
export default function CopyFields({ control, categories, currentCategory }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={2} data-testid="store-listing-copy">
      <SectionTitle label={t('tech.storeListing.sectionShared')} />
      <RhfTextField control={control} name="locale" label={t('tech.storeListing.locale')} hint={t('tech.storeListing.localeHint')} />
      <RhfTextField
        control={control}
        name="name"
        label={t('tech.storeListing.name')}
        hint={t('tech.storeListing.nameHint', { vars: max(LISTING_LIMITS.name) })}
      />
      <RhfTextField
        control={control}
        name="description"
        label={t('tech.storeListing.description')}
        hint={t('tech.storeListing.descriptionHint', { vars: max(LISTING_LIMITS.description) })}
        multiline
        minRows={6}
      />
      <RhfTextField
        control={control}
        name="whats_new"
        label={t('tech.storeListing.whatsNew')}
        hint={t('tech.storeListing.whatsNewHint', { vars: max(LISTING_LIMITS.whats_new) })}
        multiline
        minRows={3}
      />
      <RhfTextField
        control={control}
        name="privacy_policy_url"
        label={t('tech.storeListing.privacyPolicyUrl')}
        hint={t('tech.storeListing.privacyPolicyUrlHint')}
        type="url"
      />
      <RhfTextField
        control={control}
        name="support_url"
        label={t('tech.storeListing.supportUrl')}
        hint={t('tech.storeListing.supportUrlHint')}
        type="url"
      />
      <SectionTitle label={t('tech.storeListing.sectionApple')} />
      <RhfTextField
        control={control}
        name="subtitle"
        label={t('tech.storeListing.subtitleField')}
        hint={t('tech.storeListing.subtitleHint', { vars: max(LISTING_LIMITS.subtitle) })}
      />
      <RhfTextField
        control={control}
        name="keywords"
        label={t('tech.storeListing.keywords')}
        hint={t('tech.storeListing.keywordsHint', { vars: max(LISTING_LIMITS.keywords) })}
      />
      <RhfTextField
        control={control}
        name="copyright"
        label={t('tech.storeListing.copyright')}
        hint={t('tech.storeListing.copyrightHint')}
      />
      <CategoryField control={control} categories={categories} currentCategory={currentCategory} />
      <RhfTextField
        control={control}
        name="marketing_url"
        label={t('tech.storeListing.marketingUrl')}
        hint={t('tech.storeListing.marketingUrlHint')}
        type="url"
      />
      <SectionTitle label={t('tech.storeListing.sectionPlay')} />
      <RhfTextField
        control={control}
        name="short_description"
        label={t('tech.storeListing.shortDescription')}
        hint={t('tech.storeListing.shortDescriptionHint', { vars: max(LISTING_LIMITS.short_description) })}
      />
    </Stack>
  );
}
