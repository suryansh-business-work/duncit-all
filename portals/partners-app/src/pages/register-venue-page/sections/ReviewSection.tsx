import { Box, Chip, Divider, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { useAdminCategories, type AdminCategoryValue } from '@duncit/category';
import { InfoRow } from '@duncit/ui';
import type { RegisterVenueValues } from '../register-venue';
import { useTranslation } from '@duncit/shell';

/** "Sports › Racket › Badminton" for every category row that names anything,
 * primary first. Names come from the admin tree the picker already fetched
 * (so this resolves from cache); a row's own stored name stands in for a
 * category the tree no longer has. */
function useCategoryPaths(rows: AdminCategoryValue[]): string[] {
  const { categories } = useAdminCategories();
  const nameOf = (id: string, stored: string) => categories.find((item) => item.id === id)?.name ?? stored;
  const paths = rows
    .map((row) =>
      [nameOf(row.super_id, row.super_name), nameOf(row.category_id, row.category_name), nameOf(row.sub_id, row.sub_name)]
        .filter(Boolean)
        .join(' › ')
    )
    .filter(Boolean);
  // A repeated row is refused at save; until then it is still one category.
  return [...new Set(paths)];
}

function Row({ label, value }: Readonly<{ label: string; value: ReactNode }>) {
  return (
    <InfoRow
      variant="inline"
      labelWidth={130}
      labelVariant="caption"
      labelWeight={700}
      label={label}
      value={value || '—'}
    />
  );
}

interface Props {
  form: UseFormReturn<RegisterVenueValues>;
}

export default function ReviewSection({ form }: Readonly<Props>) {
  const { t } = useTranslation();
  const values = form.watch();
  const categoryPaths = useCategoryPaths(values.venue_categories);
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
  const foodLine = values.offers_food
    ? t('partners.registerVenuePage.foodReviewYes', {
        vars: {
          items: values.food_menu.length,
          ordering: values.food_ordering.enabled
            ? t('partners.registerVenuePage.foodReviewOrderingOn')
            : t('partners.registerVenuePage.foodReviewOrderingOff'),
        },
      })
    : t('partners.registerVenuePage.foodReviewNo');
  const payoutDetailLine =
    values.payout_method === 'UPI'
      ? values.upi_id
      : [values.account_number, values.ifsc_code].filter(Boolean).join(' · ');

  return (
    <Stack spacing={2}>
      <Typography variant="subtitle1" sx={{
        fontWeight: 900
      }}>
        Review your registration
      </Typography>
      <Stack spacing={1}>
        <Row label={t('partners.registerVenuePage.venueName')} value={values.venue_name} />
        <Row label={t('partners.registerVenuePage.venueType')} value={values.venue_type} />
        <Row
          label={categoryPaths.length > 1 ? t('partners.registerVenuePage.categories') : t('partners.common.category')}
          value={
            categoryPaths.length > 0 && (
              <Stack component="ul" spacing={0.25} sx={{ m: 0, p: 0, listStyle: 'none' }} data-testid="review-venue-categories">
                {categoryPaths.map((path) => (
                  <Box component="li" key={path}>
                    {path}
                  </Box>
                ))}
              </Stack>
            )
          }
        />
        <Row label={t('partners.common.address')} value={addressLine} />
        <Divider flexItem sx={{ my: 0.5 }} />
        <Row label={t('partners.registerVenuePage.totalCapacity')} value={totalCapacity ? String(totalCapacity) : ''} />
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, pl: '146px' }}>
          {values.capacity_items
            .filter((item) => item.label)
            .map((item) => (
              <Chip key={item.label} size="small" label={`${item.label}: ${item.capacity}`} />
            ))}
        </Box>
        <Divider flexItem sx={{ my: 0.5 }} />
        <Row label={t('partners.registerVenuePage.food')} value={foodLine} />
        <Divider flexItem sx={{ my: 0.5 }} />
        <Row label={t('shell.nav.documents')} value={documentsLine} />
        <Row label="GSTIN" value={values.has_gstin ? values.gstin : ''} />
        <Row label="PAN" value={values.has_pan ? values.pan : ''} />
        <Divider flexItem sx={{ my: 0.5 }} />
        <Row label={t('partners.registerVenuePage.owner')} value={values.owner_name} />
        <Row label={t('partners.registerVenuePage.ownerEmail')} value={values.owner_email} />
        <Row label={t('partners.registerVenuePage.ownerPhone')} value={values.owner_phone} />
        <Divider flexItem sx={{ my: 0.5 }} />
        <Row label={t('partners.registerVenuePage.payoutMethod')} value={values.payout_method} />
        <Row label={t('partners.registerVenuePage.accountHolderName')} value={values.account_holder_name} />
        <Row label={t('partners.registerVenuePage.payoutDetails')} value={payoutDetailLine} />
      </Stack>
      <Typography variant="caption" sx={{
        color: "text.secondary"
      }}>
        Submitting sends your application for review. You can keep editing until it is submitted;
        rejected applications can be updated and resubmitted.
      </Typography>
    </Stack>
  );
}
