import { gql, useQuery } from '@apollo/client';
import { Box, Chip, Divider, Stack, Typography } from '@mui/material';
import type { UseFormReturn } from 'react-hook-form';
import type { RegisterVenueValues } from '../register-venue';

const CATEGORY_NAMES = gql`
  query VenueCategoryNames($ids: CategoryFilterInput) {
    categories(filter: $ids) {
      id
      name
    }
  }
`;

function useCategoryPath(values: RegisterVenueValues) {
  // The cascade already fetched these lists, so these resolve from cache.
  const supers = useQuery(CATEGORY_NAMES, { variables: { ids: { level: 'SUPER' } } });
  const cats = useQuery(CATEGORY_NAMES, {
    variables: { ids: { level: 'CATEGORY', parent_id: values.super_category_id } },
    skip: !values.super_category_id,
  });
  const subs = useQuery(CATEGORY_NAMES, {
    variables: { ids: { level: 'SUB', parent_id: values.category_id } },
    skip: !values.category_id,
  });
  const nameOf = (data: any, id: string) =>
    data?.categories?.find((item: any) => item.id === id)?.name ?? '';
  return [
    nameOf(supers.data, values.super_category_id),
    nameOf(cats.data, values.category_id),
    nameOf(subs.data, values.sub_category_id),
  ]
    .filter(Boolean)
    .join(' › ');
}

function Row({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <Stack direction="row" spacing={1.5} alignItems="baseline">
      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 130, fontWeight: 700 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {value || '—'}
      </Typography>
    </Stack>
  );
}

interface Props {
  form: UseFormReturn<RegisterVenueValues>;
}

export default function ReviewSection({ form }: Readonly<Props>) {
  const values = form.watch();
  const categoryPath = useCategoryPath(values);
  const totalCapacity = values.capacity_items.reduce(
    (sum, item) => sum + (Number(item.capacity) || 0),
    0
  );
  const addressLine = [values.address_line1, values.locality, values.city, values.state, values.postal_code]
    .filter(Boolean)
    .join(', ');
  const documentsLine = values.documents
    .filter((doc) => doc.url)
    .map((doc) => doc.type)
    .join(', ');

  return (
    <Stack spacing={2}>
      <Typography variant="subtitle1" fontWeight={900}>
        Review your registration
      </Typography>
      <Stack spacing={1}>
        <Row label="Venue name" value={values.venue_name} />
        <Row label="Venue type" value={values.venue_type} />
        <Row label="Category" value={categoryPath} />
        <Row label="Address" value={addressLine} />
        <Divider flexItem sx={{ my: 0.5 }} />
        <Row label="Total capacity" value={totalCapacity ? String(totalCapacity) : ''} />
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, pl: '146px' }}>
          {values.capacity_items
            .filter((item) => item.label)
            .map((item) => (
              <Chip key={item.label} size="small" label={`${item.label}: ${item.capacity}`} />
            ))}
        </Box>
        <Divider flexItem sx={{ my: 0.5 }} />
        <Row label="Documents" value={documentsLine} />
        <Row label="GSTIN" value={values.gstin} />
        <Row label="PAN" value={values.pan} />
        <Divider flexItem sx={{ my: 0.5 }} />
        <Row label="Owner" value={values.owner_name} />
        <Row label="Owner email" value={values.owner_email} />
        <Row label="Owner phone" value={values.owner_phone} />
      </Stack>
      <Typography variant="caption" color="text.secondary">
        Submitting sends your application for review. You can keep editing until it is submitted;
        rejected applications can be updated and resubmitted.
      </Typography>
    </Stack>
  );
}
