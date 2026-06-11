import { useMemo, useState } from 'react';
import { Box, Button, Checkbox, Chip, Divider, IconButton, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import StorefrontIcon from '@mui/icons-material/Storefront';
import { alpha, useTheme } from '@mui/material/styles';

interface Props {
  pod: any;
  priceFormat: (amount: number) => string;
  selectedProducts: Record<string, number>;
  onSelectionChange: (next: Record<string, number>) => void;
  onCheckout: () => void;
}

/** Footer label: a count of selected products, or a neutral total caption. */
function productCountLabel(count: number): string {
  if (count === 0) return 'Selected product total';
  return `${count} product${count === 1 ? '' : 's'} selected`;
}

export default function PodCommercePreview({ pod, priceFormat, selectedProducts, onSelectionChange, onCheckout }: Readonly<Props>) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const requests = (pod.product_requests ?? []).filter((item: any) => item?.product_name);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  const selectedTotal = useMemo(
    () => requests.reduce((sum: number, item: any) => sum + (selectedProducts[item.product_id] || 0) * Number(item.unit_cost || 0), 0),
    [requests, selectedProducts]
  );
  const selectedCount = Object.values(selectedProducts).filter((quantity) => quantity > 0).length;
  const textColor = isDark ? '#fff' : 'text.primary';
  const mutedColor = isDark ? 'rgba(255,255,255,0.62)' : 'text.secondary';
  const itemBg = isDark ? 'rgba(255,255,255,0.05)' : alpha(theme.palette.background.paper, 0.72);
  const selectedBg = isDark ? 'rgba(255,139,95,0.14)' : alpha(theme.palette.primary.main, 0.1);
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : alpha(theme.palette.text.primary, 0.1);
  const selectedBorder = isDark ? 'rgba(255,139,95,0.6)' : alpha(theme.palette.primary.main, 0.45);
  const updateQuantity = (productId: string, quantity: number) => {
    const next = { ...selectedProducts };
    if (quantity <= 0) delete next[productId];
    else next[productId] = quantity;
    onSelectionChange(next);
  };

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 4,
        color: textColor,
        background: isDark
          ? 'linear-gradient(145deg, #15111c 0%, #2a1926 54%, #111827 100%)'
          : `linear-gradient(145deg, ${alpha(theme.palette.background.paper, 0.96)} 0%, ${alpha(theme.palette.primary.light, 0.16)} 54%, ${alpha(theme.palette.background.paper, 0.98)} 100%)`,
        boxShadow: isDark ? '0 18px 44px rgba(17, 24, 39, 0.24)' : `0 18px 44px ${alpha(theme.palette.primary.dark, 0.12)}`,
        border: '1px solid',
        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'divider',
        overflow: 'hidden',
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1.5}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
          <StorefrontIcon sx={{ color: '#ff8b5f' }} />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="overline" sx={{ color: mutedColor, letterSpacing: 0, lineHeight: 1 }}>
              Pod Shop
            </Typography>
            <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 900, lineHeight: 1.1 }} noWrap>
                Products
              </Typography>
            </Stack>
          </Box>
        </Stack>
        <Chip size="small" label={pod.products_enabled ? 'Available' : 'Closed'} sx={{ bgcolor: isDark ? 'rgba(255,255,255,0.12)' : alpha(theme.palette.text.primary, 0.08), color: textColor, fontWeight: 800 }} />
      </Stack>

      {requests.length === 0 ? (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 2 }}>
          <Typography variant="body2" sx={{ color: mutedColor }}>
            No products available yet.
          </Typography>
        </Stack>
      ) : (
        <Stack spacing={0.9} sx={{ mt: 2 }}>
          {requests.map((item: any) => {
          const maxQuantity = Number(item.available_count ?? item.quantity ?? 0);
          const quantity = selectedProducts[item.product_id] || 0;
          const selected = quantity > 0;
          const imageUrl = item.image_url || item.images?.[0] || '';
          return (
            <Stack
              key={`${item.product_id}-${item.product_name}`}
              onClick={() => updateQuantity(item.product_id, selected ? 0 : 1)}
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{
                p: 1,
                borderRadius: 3,
                cursor: 'pointer',
                border: '1px solid',
                borderColor: selected ? selectedBorder : borderColor,
                bgcolor: selected ? selectedBg : itemBg,
                transition: 'all 0.18s ease',
              }}
            >
              <Checkbox
                checked={selected}
                onChange={() => updateQuantity(item.product_id, selected ? 0 : 1)}
                onClick={(event) => event.stopPropagation()}
                sx={{
                  p: 0.5,
                  color: mutedColor,
                  '&.Mui-checked': { color: '#ff8b5f' },
                }}
              />
              <Box sx={{ width: 54, height: 54, borderRadius: 2, overflow: 'hidden', flex: '0 0 auto', bgcolor: 'rgba(255,139,95,0.18)' }}>
                {imageUrl && !imageErrors[item.product_id] && <Box component="img" src={imageUrl} alt={item.product_name} onError={() => setImageErrors((prev) => ({ ...prev, [item.product_id]: true }))} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
              </Box>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 800 }} noWrap>{item.product_name}</Typography>
                <Typography variant="caption" sx={{ color: mutedColor }} noWrap>Available {maxQuantity}</Typography>
                {selected && <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.75 }} onClick={(event) => event.stopPropagation()}>
                  <IconButton size="small" onClick={() => updateQuantity(item.product_id, quantity - 1)}><RemoveIcon fontSize="small" /></IconButton>
                  <Typography variant="body2" fontWeight={900}>{quantity}</Typography>
                  <IconButton size="small" disabled={quantity >= maxQuantity} onClick={() => updateQuantity(item.product_id, Math.min(maxQuantity, quantity + 1))}><AddIcon fontSize="small" /></IconButton>
                </Stack>}
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 900, color: isDark ? '#ffe1b8' : 'primary.dark' }}>
                +{priceFormat(Number(item.unit_cost ?? 0) * Math.max(quantity, 1))}
              </Typography>
            </Stack>
          );
        })}
        </Stack>
      )}

      <Divider sx={{ my: 1.5, borderColor: isDark ? 'rgba(255,255,255,0.16)' : 'divider' }} />
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="caption" sx={{ color: mutedColor }}>
          {productCountLabel(selectedCount)}
        </Typography>
        <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>
          {priceFormat(selectedTotal)}
        </Typography>
      </Stack>
      <Button
        fullWidth
        variant="contained"
        disabled={selectedCount === 0}
        onClick={onCheckout}
        sx={{ mt: 1.5, borderRadius: 3, fontWeight: 900, background: 'linear-gradient(90deg, #ff4f73 0%, #ff8b5f 100%)' }}
      >
        Add to booking · {priceFormat(Number(pod.pod_amount || 0) + selectedTotal)}
      </Button>
    </Box>
  );
}
