import { Avatar, Box, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { StatusChip } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import { BRAND_STATUS_COLOR } from '../brandStatus';
import type { EcommBrandRow } from '../queries';

interface Props {
  brand: EcommBrandRow;
  /** Opens the approve/reject dialog. Only offered while the brand awaits review. */
  onReview: () => void;
}

const DASH = '—';

export default function BrandHeaderCard({ brand, onReview }: Readonly<Props>) {
  const { t } = useTranslation();
  const location = [brand.city, brand.state].filter(Boolean).join(', ') || DASH;
  const contact = brand.contact_email || brand.contact_phone || t('products.brandReview.noContact');
  const paused = brand.is_active === false;
  return (
    <Card variant="outlined" sx={{ borderRadius: 3 }}>
      <CardContent>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}>
          <Avatar alt="" src={brand.logo_url || undefined} variant="rounded" sx={{ width: 64, height: 64 }}>
            {brand.brand_name?.[0]?.toUpperCase() ?? '?'}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 0.5 }}>
              <Typography component="h1" variant="h5" sx={{ fontWeight: 800 }}>
                {brand.brand_name}
              </Typography>
              <StatusChip status={brand.status} colorMap={BRAND_STATUS_COLOR} />
              {paused && (
                <Chip size="small" color="warning" variant="outlined" label={t('products.brandReview.paused')} />
              )}
            </Stack>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {location} · {contact}
            </Typography>
          </Box>
          <Chip
            color="primary"
            variant="outlined"
            label={t('products.brandReview.approvedProducts', { vars: { count: brand.approved_product_count } })}
          />
          {brand.status === 'SUBMITTED' && (
            <DuncitButton variant="contained" onClick={onReview} data-testid="brand-review-open">
              {t('products.review.action')}
            </DuncitButton>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
