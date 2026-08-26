import { useState } from 'react';
import { Box, Button, Stack, TextField, Typography } from '@mui/material';
import { StatusChip, type StatusColorMap } from '@duncit/ui';
import type { ProductListingRow } from './queries';

/** Only APPROVED/DENIED are mapped — everything else (incl. SUBMITTED) stays warning. */
const LISTING_STATUS_COLORS: StatusColorMap = { APPROVED: 'success', DENIED: 'error' };

export const renderProduct = (product: ProductListingRow) => (
  <Stack direction="row" spacing={1.25} sx={{
    alignItems: "center"
  }}>
    <Box
      component="img"
      src={product.image_url || product.images?.[0]}
      alt={product.product_name}
      sx={{ width: 32, height: 32, borderRadius: 1, objectFit: 'cover', bgcolor: 'action.hover' }}
    />
    <Box sx={{ minWidth: 0, lineHeight: 1.2 }}>
      <Typography variant="body2" noWrap component="div" sx={{
        fontWeight: 900
      }}>
        {product.product_name}
      </Typography>
      <Typography variant="caption" noWrap component="div" sx={{
        color: "text.secondary"
      }}>
        {product.images?.length || 0} images · {product.size_label || 'No size'}
      </Typography>
    </Box>
  </Stack>
);

export const renderListingStatus = (product: ProductListingRow) => {
  // An approved-but-paused listing is hidden from the shop — surface that
  // instead of a green APPROVED chip the partner would read as "live".
  if (product.listing_review_status === 'APPROVED' && product.is_active === false) {
    return <StatusChip status="PAUSED" colorMap={LISTING_STATUS_COLORS} fallbackColor="warning" />;
  }
  return (
    <StatusChip
      status={product.listing_review_status}
      colorMap={LISTING_STATUS_COLORS}
      fallbackColor="warning"
    />
  );
};

interface QuantityCellProps {
  product: ProductListingRow;
  disabled: boolean;
  onSave: (product: ProductListingRow, quantity: number) => void;
}

/** Inline quantity editor — each cell owns its draft, seeded from the row. */
export function QuantityCell({ product, disabled, onSave }: Readonly<QuantityCellProps>) {
  const [value, setValue] = useState(String(product.inventory_count ?? 0));
  return (
    <Stack
      direction="row"
      spacing={1}
      component="span"
      data-row-click="ignore"
      sx={{ alignItems: 'center' }}
    >
      <TextField
        size="small"
        type="number"
        value={value}
        disabled={disabled}
        onChange={(event) => setValue(event.target.value)}
        sx={{ width: 92 }}
        slotProps={{
          htmlInput: { min: 0 }
        }}
      />
      <Button size="small" disabled={disabled} onClick={() => onSave(product, Number(value || 0))}>
        Update
      </Button>
    </Stack>
  );
}
