import { useMemo, useState } from 'react';
import { Box, Button, Checkbox, Chip, Divider, Stack, Typography } from '@mui/material';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import StorefrontIcon from '@mui/icons-material/Storefront';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

interface Props {
  pod: any;
  priceFormat: (amount: number) => string;
}

interface SpecialItem {
  id: string;
  name: string;
  hint: string;
  price: number;
}

const SPECIAL_ADDONS: SpecialItem[] = [
  { id: 'cake', name: 'Surprise birthday cake', hint: 'Lit candles + custom message', price: 499 },
  { id: 'flowers', name: 'Fresh flower bouquet', hint: 'Hand-picked, delivered chilled', price: 299 },
  { id: 'photographer', name: '15-min photo capture', hint: 'Pro shots of your moment', price: 799 },
  { id: 'decor', name: 'Mini balloon arch', hint: 'Set up before you arrive', price: 599 },
  { id: 'champagne', name: 'Bottle of bubbly', hint: 'Sparkling, served chilled', price: 1299 },
];

export default function PodCommercePreview({ pod, priceFormat }: Props) {
  const requests = (pod.product_requests ?? []).filter((item: any) => item?.product_name);
  const perks = (pod.available_perks ?? []).filter(Boolean).slice(0, 3);
  const hasItems = requests.length > 0 || perks.length > 0;
  const [picked, setPicked] = useState<Record<string, boolean>>({});

  const togglePick = (id: string) => setPicked((prev) => ({ ...prev, [id]: !prev[id] }));

  const specialTotal = useMemo(
    () => SPECIAL_ADDONS.reduce((sum, item) => (picked[item.id] ? sum + item.price : sum), 0),
    [picked]
  );
  const specialCount = Object.values(picked).filter(Boolean).length;

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
            <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 900, lineHeight: 1.1 }} noWrap>
                Add-ons
              </Typography>
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.5,
                  px: 1,
                  py: 0.25,
                  borderRadius: 999,
                  background: 'linear-gradient(90deg, rgba(255,79,115,0.22) 0%, rgba(255,139,95,0.22) 100%)',
                  border: '1px solid rgba(255,139,95,0.4)',
                }}
              >
                <AutoAwesomeIcon sx={{ fontSize: 14, color: '#ffd089' }} />
                <Typography variant="caption" sx={{ fontWeight: 900, color: '#ffe1b8', whiteSpace: 'nowrap' }}>
                  make it special
                </Typography>
              </Box>
            </Stack>
          </Box>
        </Stack>
        <Chip size="small" label={pod.products_enabled ? 'Live' : 'Preview'} sx={{ bgcolor: 'rgba(255,255,255,0.12)', color: '#fff', fontWeight: 800 }} />
      </Stack>

      <Stack spacing={0.9} sx={{ mt: 2 }}>
        {SPECIAL_ADDONS.map((item) => {
          const selected = !!picked[item.id];
          return (
            <Stack
              key={item.id}
              onClick={() => togglePick(item.id)}
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{
                p: 1,
                borderRadius: 3,
                cursor: 'pointer',
                border: '1px solid',
                borderColor: selected ? 'rgba(255,139,95,0.6)' : 'rgba(255,255,255,0.1)',
                bgcolor: selected ? 'rgba(255,139,95,0.14)' : 'rgba(255,255,255,0.05)',
                transition: 'all 0.18s ease',
              }}
            >
              <Checkbox
                checked={selected}
                onChange={() => togglePick(item.id)}
                onClick={(e) => e.stopPropagation()}
                sx={{
                  p: 0.5,
                  color: 'rgba(255,255,255,0.55)',
                  '&.Mui-checked': { color: '#ff8b5f' },
                }}
              />
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 800 }} noWrap>{item.name}</Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.58)' }} noWrap>{item.hint}</Typography>
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 900, color: '#ffe1b8' }}>
                +{priceFormat(item.price)}
              </Typography>
            </Stack>
          );
        })}
      </Stack>

      {hasItems && (
        <>
          <Divider sx={{ my: 1.5, borderColor: 'rgba(255,255,255,0.16)' }} />
          <Stack spacing={1}>
            {requests.map((item: any) => (
              <Stack key={`${item.product_id}-${item.product_name}`} direction="row" spacing={1.2} alignItems="center" sx={{ p: 1, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.06)' }}>
                <Box sx={{ width: 36, height: 36, borderRadius: 2, display: 'grid', placeItems: 'center', bgcolor: 'rgba(255,139,95,0.18)' }}>
                  <AddShoppingCartIcon fontSize="small" />
                </Box>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 800 }} noWrap>{item.product_name}</Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.58)' }}>Qty {item.quantity || 1}</Typography>
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 900 }}>{priceFormat(Number(item.total_cost ?? item.unit_cost ?? 0))}</Typography>
              </Stack>
            ))}
            {requests.length === 0 && perks.map((perk: string) => (
              <Stack key={perk} direction="row" spacing={1.2} alignItems="center" sx={{ p: 1, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.06)' }}>
                <Typography variant="body2" sx={{ fontWeight: 800 }} noWrap>{perk}</Typography>
                <Box sx={{ flex: 1 }} />
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>Included</Typography>
              </Stack>
            ))}
          </Stack>
        </>
      )}

      <Divider sx={{ my: 1.5, borderColor: 'rgba(255,255,255,0.16)' }} />
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.64)' }}>
          {specialCount > 0 ? `${specialCount} special add-on${specialCount === 1 ? '' : 's'}` : 'Add-on total'}
        </Typography>
        <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>
          {priceFormat(Number(pod.product_cost_total ?? 0) + specialTotal)}
        </Typography>
      </Stack>
      <Button
        fullWidth
        variant="contained"
        disabled={specialCount === 0 && !pod.products_enabled}
        sx={{ mt: 1.5, borderRadius: 3, fontWeight: 900, background: 'linear-gradient(90deg, #ff4f73 0%, #ff8b5f 100%)' }}
      >
        {specialCount > 0 ? `Add ${specialCount} to booking` : 'Add to booking'}
      </Button>
    </Box>
  );
}
