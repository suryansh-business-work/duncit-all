import { Stack } from '@mui/material';
import { useSchemaForm } from '../../../../components/form/useSchemaForm';
import type { StoreListing } from '../../queries';
import ListingContentSection from './ListingContentSection';
import ListingPriceSection from './ListingPriceSection';
import { ListingRulesSection, ListingSeoSection } from './ListingSeoSection';
import ListingShelfSection from './ListingShelfSection';
import { makeListingSchema, toListingInput, toListingValues, type ListingValues } from './listing.types';

interface ListingFormProps {
  /** The page's Save button submits this form by id. */
  formId: string;
  listing: StoreListing;
  onSubmit: (input: ReturnType<typeof toListingInput>) => Promise<void>;
}

/** Everything the store says about one product, section by section. */
export default function ListingForm({ formId, listing, onSubmit }: Readonly<ListingFormProps>) {
  const { t, form } = useSchemaForm<ListingValues>(makeListingSchema, toListingValues(listing));
  const { control, handleSubmit } = form;
  return (
    <form id={formId} noValidate onSubmit={handleSubmit((values) => onSubmit(toListingInput(values)))} aria-label={t('ecommPortal.listing.form')}>
      <Stack spacing={3}>
        <ListingShelfSection control={control} />
        <ListingPriceSection control={control} price={listing.price} variants={listing.variants} />
        <ListingContentSection control={control} />
        <ListingSeoSection control={control} />
        <ListingRulesSection control={control} />
      </Stack>
    </form>
  );
}
