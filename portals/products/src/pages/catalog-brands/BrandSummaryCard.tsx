import { Link as RouterLink } from 'react-router-dom';
import { Alert, Avatar, Box, Button, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import InventoryIcon from '@mui/icons-material/Inventory';
import RuleIcon from '@mui/icons-material/Rule';
import { StatusChip } from '@duncit/ui';
import { BRAND_STATUS_COLOR } from '../ecomm/brandStatus';
import type { CatalogBrandDetail } from './queries';

interface Props {
  brand: CatalogBrandDetail;
  /** Route of this brand's products list. */
  productsTo: string;
}

/**
 * Catalog never approves or rejects — a brand that still needs a decision is
 * pointed at Brands Review, which owns those mutations.
 */
const REVIEW_NOTICE: Record<string, string | undefined> = {
  SUBMITTED: 'This brand is waiting for a decision. Approve or reject it in Brands Review.',
  REJECTED: 'This brand was rejected. The partner can edit and resubmit it; the decision is made in Brands Review.',
  DRAFT: 'This brand is still a draft — the partner has not submitted it for review yet.',
};

const contactLine = (brand: CatalogBrandDetail) =>
  [brand.contact_person, brand.contact_email, brand.contact_phone].filter(Boolean).join(' · ') ||
  'No contact on file';

const locationLine = (brand: CatalogBrandDetail) =>
  [brand.city, brand.state, brand.country].filter(Boolean).join(', ') || 'No address on file';

const productsLine = (brand: CatalogBrandDetail) => {
  const noun = brand.approved_product_count === 1 ? 'product' : 'products';
  return `${brand.approved_product_count} approved ${noun} in the marketplace.`;
};

/** Identity header for one brand: logo, status, reach-through to its products. */
export default function BrandSummaryCard({ brand, productsTo }: Readonly<Props>) {
  const notice = REVIEW_NOTICE[brand.status];
  const activeLabel = brand.is_active ? 'Active' : 'Deactivated';
  const activeColor = brand.is_active ? 'success' : 'default';

  return (
    <Card variant="outlined" sx={{ borderRadius: 3 }}>
      <CardContent>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{
            alignItems: { sm: 'center' }
          }}>
            <Avatar src={brand.logo_url || undefined} variant="rounded" sx={{ width: 64, height: 64 }}>
              {brand.brand_name?.[0]?.toUpperCase() ?? '?'}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack
                direction="row"
                spacing={1}
                sx={{
                  alignItems: "center",
                  flexWrap: "wrap"
                }}>
                <Typography variant="h6" sx={{
                  fontWeight: 800
                }}>
                  {brand.brand_name}
                </Typography>
                <StatusChip status={brand.status} colorMap={BRAND_STATUS_COLOR} />
                <Chip size="small" label={activeLabel} color={activeColor} variant="outlined" />
                {brand.brand_no && <Chip size="small" variant="outlined" label={brand.brand_no} />}
              </Stack>
              <Typography variant="body2" sx={{
                color: "text.secondary"
              }}>
                {contactLine(brand)}
              </Typography>
              <Typography variant="caption" sx={{
                color: "text.secondary"
              }}>
                {locationLine(brand)}
              </Typography>
            </Box>
            <Button
              component={RouterLink}
              to={productsTo}
              variant="contained"
              startIcon={<InventoryIcon />}
            >
              Products
            </Button>
          </Stack>

          <Typography variant="caption" sx={{
            color: "text.secondary"
          }}>
            {productsLine(brand)}
          </Typography>

          {notice && (
            <Alert
              severity="info"
              action={
                <Button
                  component={RouterLink}
                  to="/ecomm/brands"
                  size="small"
                  startIcon={<RuleIcon />}
                >
                  Brands Review
                </Button>
              }
            >
              {notice}
            </Alert>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
