import { Box, Button, Chip, Divider, Stack, Typography } from '@mui/material';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import StorefrontIcon from '@mui/icons-material/Storefront';

interface Props {
  pod: any;
  priceFormat: (amount: number) => string;
}

export default function PodCommercePreview({ pod, priceFormat }: Props) {
  const requests = (pod.product_requests ?? []).filter((item: any) => item?.product_name);
  const perks = (pod.available_perks ?? []).filter(Boolean).slice(0, 3);
  const hasItems = requests.length > 0 || perks.length > 0;

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 4,
        color: '#fff',
        background: 'linear-gradient(145deg, #15111c 0%, #2a1926 54%, #111827 100%)',
        boxShadow: '0 18px 44px rgba(17, 24, 39, 0.24)',
        overflow: 'hidden',
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1.5}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
          <StorefrontIcon sx={{ color: '#ff8b5f' }} />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.62)', letterSpacing: 0, lineHeight: 1 }}>
              Pod Shop
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 900, lineHeight: 1.1 }} noWrap>
              Add-ons for this pod
            </Typography>
          </Box>
        </Stack>
        <Chip size="small" label={pod.products_enabled ? 'Live' : 'Preview'} sx={{ bgcolor: 'rgba(255,255,255,0.12)', color: '#fff', fontWeight: 800 }} />
      </Stack>

      <Stack spacing={1.1} sx={{ mt: 2 }}>
        {requests.map((item: any) => (
          <Stack key={`${item.product_id}-${item.product_name}`} direction="row" spacing={1.2} alignItems="center" sx={{ p: 1.15, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.08)' }}>
            <Box sx={{ width: 42, height: 42, borderRadius: 2.25, display: 'grid', placeItems: 'center', bgcolor: 'rgba(255,139,95,0.18)' }}>
              <AddShoppingCartIcon fontSize="small" />
            </Box>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 900 }} noWrap>{item.product_name}</Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.64)' }}>Qty {item.quantity || 1}</Typography>
            </Box>
            <Typography variant="body2" sx={{ fontWeight: 900 }}>{priceFormat(Number(item.total_cost ?? item.unit_cost ?? 0))}</Typography>
          </Stack>
        ))}
        {requests.length === 0 && perks.map((perk: string) => (
          <Stack key={perk} direction="row" spacing={1.2} alignItems="center" sx={{ p: 1.15, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.08)' }}>
            <Box sx={{ width: 42, height: 42, borderRadius: 2.25, display: 'grid', placeItems: 'center', bgcolor: 'rgba(237,79,122,0.2)' }}>
              <AddShoppingCartIcon fontSize="small" />
            </Box>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 900 }} noWrap>{perk}</Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.64)' }}>Included with booking</Typography>
            </Box>
            <Typography variant="body2" sx={{ fontWeight: 900 }}>Included</Typography>
          </Stack>
        ))}
        {!hasItems && (
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
            Add-ons will appear here when the host enables pod products.
          </Typography>
        )}
      </Stack>

      <Divider sx={{ my: 1.5, borderColor: 'rgba(255,255,255,0.16)' }} />
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.64)' }}>Add-on total</Typography>
        <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>{priceFormat(Number(pod.product_cost_total ?? 0))}</Typography>
      </Stack>
      <Button fullWidth variant="contained" disabled={!pod.products_enabled} sx={{ mt: 1.5, borderRadius: 3, fontWeight: 900, background: 'linear-gradient(90deg, #ff4f73 0%, #ff8b5f 100%)' }}>
        Add to booking
      </Button>
    </Box>
  );
}
