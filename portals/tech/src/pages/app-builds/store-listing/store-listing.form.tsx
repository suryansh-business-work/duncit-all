import { useEffect, useMemo } from 'react';
import { useForm, type FieldErrors, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { DuncitTabs, useTabParam, type DuncitTabItem } from '@duncit/tabs';
import CopyFields from './CopyFields';
import ScreenshotFields from './ScreenshotFields';
import ReviewFields from './ReviewFields';
import ManualChecklist from './ManualChecklist';
import {
  sectionOf,
  storeListingSchema,
  toFormValues,
  type ListingSection,
  type StoreListing,
  type StoreListingMessages,
  type StoreListingValues,
} from './store-listing.types';

interface Props {
  listing: StoreListing;
  categories: string[];
  busy: boolean;
  onSubmit: (values: StoreListingValues) => void;
}

type Translate = ReturnType<typeof useTranslation>['t'];

const sections = (t: Translate): DuncitTabItem<ListingSection>[] => [
  { value: 'copy', label: t('tech.storeListing.tabCopy') },
  { value: 'screenshots', label: t('tech.storeListing.tabScreenshots') },
  { value: 'review', label: t('tech.storeListing.tabReview') },
  { value: 'checklist', label: t('tech.storeListing.tabChecklist') },
];

const makeMessages = (t: Translate): StoreListingMessages => ({
  tooLong: (max) => t('tech.storeListing.tooLong', { vars: { max: String(max) } }),
  invalidUrl: t('tech.storeListing.invalidUrl'),
  invalidEmail: t('tech.storeListing.invalidEmail'),
  tooManyImages: (max) => t('tech.storeListing.tooManyImages', { vars: { max: String(max) } }),
});

/**
 * One form across four tabs. Values live in react-hook-form whichever tab is
 * showing, so switching tabs loses nothing, and a save refused by validation
 * opens the tab that holds the first error rather than failing silently.
 */
export default function StoreListingForm({ listing, categories, busy, onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const schema = useMemo(() => storeListingSchema(makeMessages(t)), [t]);
  const { control, handleSubmit, reset, watch } = useForm<StoreListingValues, any, StoreListingValues>({
    defaultValues: toFormValues(listing, schema),
    resolver: zodResolver(schema) as unknown as Resolver<StoreListingValues, any, StoreListingValues>,
    mode: 'all',
  });
  const tabs = useTabParam<ListingSection>({ items: sections(t), fallback: 'copy' });
  const currentCategory = watch('primary_category');

  // Server round-trips (load + save) re-arm the form with what is now stored.
  useEffect(() => {
    reset(toFormValues(listing, schema));
  }, [listing, schema, reset]);

  const onInvalid = (errors: FieldErrors<StoreListingValues>) => {
    const first = Object.keys(errors)[0] as keyof StoreListingValues | undefined;
    if (first) tabs.onChange(sectionOf(first));
  };

  let body = <ManualChecklist />;
  if (tabs.value === 'copy') {
    body = <CopyFields control={control} categories={categories} currentCategory={currentCategory} />;
  } else if (tabs.value === 'screenshots') {
    body = <ScreenshotFields control={control} />;
  } else if (tabs.value === 'review') {
    body = <ReviewFields control={control} />;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalid)} noValidate data-testid="store-listing-form">
      <Stack spacing={2.5}>
        <DuncitTabs {...tabs} />
        {body}
        <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
          <DuncitButton type="submit" variant="contained" loading={busy} data-testid="store-listing-save">
            {busy ? t('tech.storeListing.saving') : t('tech.storeListing.save')}
          </DuncitButton>
        </Stack>
      </Stack>
    </form>
  );
}
