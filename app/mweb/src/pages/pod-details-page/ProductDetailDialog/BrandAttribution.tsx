import { Link, Stack, Typography } from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

/** Brand attribution — a tappable link that opens the brand dialog when the
 * product carries a brand link, else a plain label. Renders nothing when the
 * product has no brand name. */
export default function BrandAttribution({
  brandName,
  brandId,
  onOpenBrand,
}: Readonly<{ brandName?: string | null; brandId: string | null; onOpenBrand: (id: string) => void }>) {
  if (!brandName) return null;
  if (brandId) {
    return (
      <Link
        component="button"
        type="button"
        onClick={() => onOpenBrand(brandId)}
        underline="hover"
        data-testid="product-detail-brand"
        sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, fontWeight: 600, width: 'fit-content' }}
      >
        <StorefrontIcon sx={{ fontSize: 16 }} />
        by {brandName}
        <ChevronRightIcon sx={{ fontSize: 16 }} />
      </Link>
    );
  }
  return (
    <Stack direction="row" spacing={0.5} data-testid="product-detail-brand" sx={{
      alignItems: "center"
    }}>
      <StorefrontIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
      <Typography
        variant="body2"
        sx={{
          color: "text.secondary",
          fontWeight: 700
        }}>
        by {brandName}
      </Typography>
    </Stack>
  );
}
