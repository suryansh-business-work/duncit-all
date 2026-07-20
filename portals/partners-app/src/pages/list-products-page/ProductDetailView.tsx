import { Box, Card, CardContent, Chip, Divider, Stack, Typography } from '@mui/material';
import { StatusChip, type StatusColorMap } from '@duncit/ui';

const STATUS_COLORS: StatusColorMap = { APPROVED: 'success', DENIED: 'error' };
const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

const categoryLabel = (category: any): string =>
  [category.super_category_name, category.category_name, category.sub_category_name]
    .filter(Boolean)
    .join(' › ') ||
  [category.super_category_id, category.category_id, category.sub_category_id].filter(Boolean).join(' › ') ||
  'Category';

function CategoryChips({ categories }: Readonly<{ categories: any[] }>) {
  if (!categories?.length) return null;
  return (
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
      {categories.map((category) => (
        <Chip
          key={`${category.super_category_id ?? ''}-${category.category_id ?? ''}-${category.sub_category_id ?? ''}`}
          label={categoryLabel(category)}
          size="small"
        />
      ))}
    </Stack>
  );
}

function VariantImages({ images }: Readonly<{ images: string[] }>) {
  if (!images?.length) return null;
  return (
    <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: 'repeat(3, 1fr)', sm: 'repeat(6, 1fr)' } }}>
      {images.map((url) => (
        <Box
          key={url}
          component="img"
          src={url}
          alt="Variant"
          sx={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', borderRadius: 1, border: 1, borderColor: 'divider' }}
        />
      ))}
    </Box>
  );
}

function VariantCard({ variant, index }: Readonly<{ variant: any; index: number }>) {
  const dims = [variant.length_cm, variant.breadth_cm, variant.height_cm].map((value) => Number(value) || 0);
  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent>
        <Stack spacing={1}>
          <Typography fontWeight={800}>{variant.option_label || `Variant ${index + 1}`}</Typography>
          <VariantImages images={Array.isArray(variant.images) ? variant.images : []} />
          {variant.description && <Typography color="text.secondary" variant="body2">{variant.description}</Typography>}
          <Typography variant="body2">
            {currency.format(Number(variant.unit_cost) || 0)} · {Number(variant.inventory_count) || 0} in stock
            {variant.size_label ? ` · Size ${variant.size_label}` : ''}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {dims[0]} × {dims[1]} × {dims[2]} cm · {Number(variant.weight_kg) || 0} kg
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function ProductDetailView({ product }: Readonly<{ product: any }>) {
  const variants: any[] = Array.isArray(product.variants) && product.variants.length > 0 ? product.variants : [];
  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
            <Typography variant="h6" fontWeight={950}>{product.product_name}</Typography>
            <StatusChip status={product.listing_review_status} colorMap={STATUS_COLORS} fallbackColor="warning" />
          </Stack>
          <CategoryChips categories={product.categories ?? []} />
          {product.description && <Typography color="text.secondary">{product.description}</Typography>}
          <Typography variant="body2">
            Delivery: {product.delivery_target === 'SHIPROCKET' ? 'ShipRocket' : product.delivery_target} · Commission:{' '}
            {product.commission_pct ?? 0}%
          </Typography>
          {product.listing_review_notes && <Typography variant="body2" color="text.secondary">Review notes: {product.listing_review_notes}</Typography>}
          <Divider />
          <Typography variant="subtitle2" fontWeight={800}>Variants ({variants.length})</Typography>
          <Stack spacing={1.5}>
            {variants.map((variant, index) => (
              <VariantCard key={variant.id ?? variant.sku ?? variant.option_label} variant={variant} index={index} />
            ))}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
