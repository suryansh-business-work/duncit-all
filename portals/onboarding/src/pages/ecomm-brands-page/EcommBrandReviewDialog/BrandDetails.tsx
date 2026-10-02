import { Box, Chip, Link, Stack, Typography } from '@mui/material';
import { InfoRow } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import type { ReviewBrand } from './types';

interface Props {
  active: ReviewBrand;
  documents: ReviewBrand[];
  address: string;
  business: string;
  bank: string;
}

/** Read-only brand profile: cover, copy, owner, legal, links, payout and documents. */
export function BrandDetails({ active, documents, address, business, bank }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <>
      {active?.cover_image_url && (
        <Box
          component="img"
          src={active.cover_image_url}
          alt={active.brand_name}
          sx={{ width: '100%', maxHeight: 150, objectFit: 'cover', borderRadius: 1.5 }}
        />
      )}
      {active?.tagline && <Typography variant="body2" sx={{
        fontStyle: "italic"
      }}>{active.tagline}</Typography>}
      <InfoRow label={t('shell.common.description')} value={active?.description || '—'} />
      <InfoRow label={t('shell.nav.categories')} value={(active?.product_categories ?? []).join(', ') || '—'} />
      <InfoRow label={t('onboarding.common.owner')} value={[active?.contact_person, active?.contact_email, active?.contact_phone].filter(Boolean).join(' · ') || '—'} />
      <InfoRow label={t('onboarding.ecommBrands.businessAndLegal')} value={business || '—'} />
      <InfoRow label={t('onboarding.common.address')} value={address || '—'} />
      {(active?.website_url || active?.instagram_url) && (
        <Stack direction="row" spacing={2} sx={{
          flexWrap: "wrap"
        }}>
          {active?.website_url && <Link href={active.website_url} target="_blank" rel="noreferrer" variant="body2">{t('onboarding.ecommBrands.website')}</Link>}
          {active?.instagram_url && <Link href={active.instagram_url} target="_blank" rel="noreferrer" variant="body2">{t('onboarding.ecommBrands.instagram')}</Link>}
        </Stack>
      )}
      {bank && <InfoRow label={t('onboarding.common.payout')} value={bank} />}
      {documents.length > 0 && (
        <Box>
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              fontWeight: 700
            }}>{t('shell.nav.documents')}</Typography>
          <Stack
            direction="row"
            spacing={1}
            sx={{
              flexWrap: "wrap",
              rowGap: 1,
              mt: 0.5
            }}>
            {documents.map((doc) => (
              <Chip key={doc.url} size="small" component={Link} href={doc.url} target="_blank" rel="noreferrer" clickable label={doc.type} variant="outlined" />
            ))}
          </Stack>
        </Box>
      )}
    </>
  );
}
