import { useState } from 'react';
import { Box, Button, Stack, TextField, Typography } from '@mui/material';
import { StatusChip, type StatusColorMap } from '@duncit/ui';
import type { ProductListingRow } from './queries';

/** Only APPROVED/DENIED are mapped — everything else (incl. SUBMITTED) stays warning. */
const LISTING_STATUS_COLORS: StatusColorMap = { APPROVED: 'success', DENIED: 'error' };

export const renderProduct = (product: ProductListingRow) => (
  <Stack direction="row" spacing={1.25} alignItems="center">
    <Box
      component="img"
      src={product.image_url || product.images?.[0]}
      alt={product.product_name}
      sx={{ width: 32, height: 32, borderRadius: 1, objectFit: 'cover', bgcolor: 'action.hover' }}
    />
    <Box sx={{ minWidth: 0, lineHeight: 1.2 }}>
      <Typography variant="body2" fontWeight={900} noWrap component="div">
        {product.product_name}
      </Typography>
      <Typography variant="caption" color="text.secondary" noWrap component="div">
        {product.images?.length || 0} images · {product.size_label || 'No size'}
      </Typography>
    </Box>
  </Stack>
);

export const renderListingStatus = (product: ProductListingRow) => (
  <StatusChip
    status={product.listing_review_status}
    colorMap={LISTING_STATUS_COLORS}
    fallbackColor="warning"
  />
);

interface QuantityCellProps {
  product: ProductListingRow;
  disabled: boolean;
  onSave: (product: ProductListingRow, quantity: number) => void;
}

/** Inline quantity editor — each cell owns its draft, seeded from the row. */
export function QuantityCell({ product, disabled, onSave }: Readonly<QuantityCellProps>) {
  const [value, setValue] = useState(String(product.inventory_count ?? 0));
  return (
    <Stack direction="row" spacing={1} alignItems="center" component="span">
      <TextField
        size="small"
        type="number"
        value={value}
        disabled={disabled}
        onChange={(event) => setValue(event.target.value)}
        inputProps={{ min: 0 }}
        sx={{ width: 92 }}
      />
      <Button size="small" disabled={disabled} onClick={() => onSave(product, Number(value || 0))}>
        Update
      </Button>
    </Stack>
  );
}
