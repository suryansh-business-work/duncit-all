import { useQuery } from '@apollo/client';
import {
  Avatar, Box, Chip, Divider, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography,
} from '@mui/material';
import { formatINR } from '@duncit/utils';
import {
  MY_BRAND_WAREHOUSES,
  type BrandWarehouse,
} from '../../ecomm-brand-page/brand-settings/warehouse.queries';
import type { ProductListingValues, ProductVariantValues } from './list-products.types';

const dimensions = (variant: ProductVariantValues) =>
  `${Number(variant.length_cm) || 0} × ${Number(variant.breadth_cm) || 0} × ${Number(variant.height_cm) || 0} cm · ${Number(variant.weight_kg) || 0} kg`;

/** Stable content-derived key — variants carry no id inside the form values. */
const variantKey = (variant: ProductVariantValues) =>
  variant.option_values.map((option) => `${option.name}=${option.value}`).join('|') ||
  variant.option_label ||
  `${variant.size_label}-${variant.unit_cost}-${variant.image_urls[0] ?? ''}`;

/** One row of the per-variant summary table. Hoisted to module scope (S6478). */
function VariantRow({ variant }: Readonly<{ variant: ProductVariantValues }>) {
  return (
    <TableRow>
      <TableCell>
        <Stack direction="row" spacing={1} alignItems="center">
          <Avatar src={variant.image_urls[0]} variant="rounded" sx={{ width: 36, height: 36 }} />
          <Typography variant="body2" fontWeight={700}>
            {variant.option_label || 'Default'}
          </Typography>
        </Stack>
      </TableCell>
      <TableCell>{formatINR(Number(variant.unit_cost) || 0)}</TableCell>
      <TableCell>{Number(variant.inventory_count) || 0}</TableCell>
      <TableCell sx={{ whiteSpace: 'nowrap' }}>{dimensions(variant)}</TableCell>
    </TableRow>
  );
}

interface Props {
  values: ProductListingValues;
  brandId: string;
}

/** Final review step: everything the listing will submit, at a glance. */
export default function ListProductsPreview({ values, brandId }: Readonly<Props>) {
  const { data } = useQuery(MY_BRAND_WAREHOUSES, {
    variables: { brand_doc_id: brandId },
    skip: !brandId,
  });
  const warehouse: BrandWarehouse | null =
    data?.myBrandPickupLocations?.find((item: BrandWarehouse) => item.id === values.pickup_location_id) ?? null;
  const totalStock = values.variants.reduce(
    (sum, variant) => sum + (Number(variant.inventory_count) || 0),
    0,
  );
  const freeDeliveryLabel =
    values.free_delivery_above === ''
      ? 'No free-delivery offer'
      : `Free delivery on orders of ${formatINR(Number(values.free_delivery_above))} or more`;

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="h6" fontWeight={950}>
          {values.product_name || 'Product preview'}
        </Typography>
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 0.75 }}>
          {values.categories.map((category) => (
            <Chip
              key={`${category.super_id}-${category.category_id}-${category.sub_id}`}
              size="small"
              variant="outlined"
              label={[category.super_name, category.category_name, category.sub_name].filter(Boolean).join(' › ') || 'Category'}
            />
          ))}
        </Stack>
      </Box>
      <Divider />
      <Box sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Variant</TableCell>
              <TableCell>Price</TableCell>
              <TableCell>Stock</TableCell>
              <TableCell>L × B × H · Weight</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {values.variants.map((variant) => (
              <VariantRow key={variantKey(variant)} variant={variant} />
            ))}
          </TableBody>
        </Table>
      </Box>
      <Divider />
      <Stack spacing={0.5}>
        <Typography variant="body2">
          <strong>Commission:</strong> {values.commission_pct}% · <strong>Total stock:</strong> {totalStock}
        </Typography>
        <Typography variant="body2">
          <strong>Delivery:</strong> ShipRocket
          {warehouse ? ` · from ${warehouse.nickname} (${warehouse.city})` : ''}
        </Typography>
        <Typography variant="body2" color={values.free_delivery_above === '' ? 'text.secondary' : 'success.main'}>
          {freeDeliveryLabel}
        </Typography>
      </Stack>
    </Stack>
  );
}
