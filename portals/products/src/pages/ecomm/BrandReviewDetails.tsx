import { Box, Chip, Link, Stack } from '@mui/material';
import { InfoRow } from '@duncit/ui';
import type { EcommBrandRow } from './queries';
import { useTranslation } from '@duncit/shell';

interface Props {
  brand: EcommBrandRow;
}

const DASH = '—';

/** Everything the partner submitted, laid out for the reviewer — the brand
 * sibling of ListingReviewDetails, so both inboxes read the same way. */
export default function BrandReviewDetails({ brand }: Readonly<Props>) {
  const { t } = useTranslation();
  const contact = [brand.contact_person, brand.contact_email, brand.contact_phone]
    .filter(Boolean)
    .join(' · ');
  const location = [brand.city, brand.state].filter(Boolean).join(', ');
  const business = [
    brand.registered_business_name,
    brand.gstin && `GSTIN ${brand.gstin}`,
    brand.pan && `PAN ${brand.pan}`,
  ]
    .filter(Boolean)
    .join(' · ');
  const categories = (brand.product_categories ?? []).join(', ');
  const documents = brand.documents ?? [];

  return (
    <Stack spacing={1.5}>
      {brand.cover_image_url && (
        <Box
          component="img"
          src={brand.cover_image_url}
          alt={brand.brand_name}
          sx={{ width: '100%', maxHeight: 150, objectFit: 'cover', borderRadius: 1.5 }}
        />
      )}
      <InfoRow label={t('products.review.brandId')} value={brand.brand_no || DASH} />
      <InfoRow label={t('products.brandForm.tagline')} value={brand.tagline || DASH} />
      <InfoRow label={t('shell.common.description')} value={brand.description || DASH} />
      <InfoRow label={t('products.review.categories')} value={categories || DASH} />
      <InfoRow label={t('products.brandForm.contactSection')} value={contact || DASH} />
      <InfoRow label={t('products.brands.colLocation')} value={location || DASH} />
      <InfoRow label={t('products.brandForm.businessSection')} value={business || DASH} />

      {(brand.website_url || brand.instagram_url) && (
        <Stack direction="row" spacing={2} flexWrap="wrap">
          {brand.website_url && (
            <Link href={brand.website_url} target="_blank" rel="noreferrer" variant="body2">
              Website
            </Link>
          )}
          {brand.instagram_url && (
            <Link href={brand.instagram_url} target="_blank" rel="noreferrer" variant="body2">
              Instagram
            </Link>
          )}
        </Stack>
      )}

      {documents.length > 0 && (
        <InfoRow
          label={t('products.review.documents')}
          value={
            <Stack direction="row" spacing={1} flexWrap="wrap" rowGap={1}>
              {documents.map((doc) => (
                <Chip
                  key={doc.url}
                  size="small"
                  component={Link}
                  href={doc.url}
                  target="_blank"
                  rel="noreferrer"
                  clickable
                  variant="outlined"
                  label={doc.type}
                />
              ))}
            </Stack>
          }
        />
      )}
    </Stack>
  );
}
