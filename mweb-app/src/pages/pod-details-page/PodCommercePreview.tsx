import { useMemo, useState } from 'react';
import { Box, Button, Checkbox, Chip, Divider, Stack, Typography } from '@mui/material';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import StorefrontIcon from '@mui/icons-material/Storefront';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { alpha, useTheme } from '@mui/material/styles';

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
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
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
  const textColor = isDark ? '#fff' : 'text.primary';
  const mutedColor = isDark ? 'rgba(255,255,255,0.62)' : 'text.secondary';
  const itemBg = isDark ? 'rgba(255,255,255,0.05)' : alpha(theme.palette.background.paper, 0.72);
  const selectedBg = isDark ? 'rgba(255,139,95,0.14)' : alpha(theme.palette.primary.main, 0.1);
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : alpha(theme.palette.text.primary, 0.1);
  const selectedBorder = isDark ? 'rgba(255,139,95,0.6)' : alpha(theme.palette.primary.main, 0.45);

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
        <Chip size="small" label={pod.products_enabled ? 'Live' : 'Preview'} sx={{ bgcolor: isDark ? 'rgba(255,255,255,0.12)' : alpha(theme.palette.text.primary, 0.08), color: textColor, fontWeight: 800 }} />
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
                borderColor: selected ? selectedBorder : borderColor,
                bgcolor: selected ? selectedBg : itemBg,
                transition: 'all 0.18s ease',
              }}
            >
              <Checkbox
                checked={selected}
                onChange={() => togglePick(item.id)}
                onClick={(e) => e.stopPropagation()}
                sx={{
                  p: 0.5,
                  color: mutedColor,
                  '&.Mui-checked': { color: '#ff8b5f' },
                }}
              />
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 800 }} noWrap>{item.name}</Typography>
                <Typography variant="caption" sx={{ color: mutedColor }} noWrap>{item.hint}</Typography>
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 900, color: isDark ? '#ffe1b8' : 'primary.dark' }}>
                +{priceFormat(item.price)}
              </Typography>
            </Stack>
          );
        })}
      </Stack>

      {hasItems && (
        <>
          <Divider sx={{ my: 1.5, borderColor: isDark ? 'rgba(255,255,255,0.16)' : 'divider' }} />
          <Stack spacing={1}>
            {requests.map((item: any) => (
              <Stack key={`${item.product_id}-${item.product_name}`} direction="row" spacing={1.2} alignItems="center" sx={{ p: 1, borderRadius: 3, bgcolor: itemBg }}>
                <Box sx={{ width: 36, height: 36, borderRadius: 2, display: 'grid', placeItems: 'center', bgcolor: 'rgba(255,139,95,0.18)' }}>
                  <AddShoppingCartIcon fontSize="small" />
                </Box>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 800 }} noWrap>{item.product_name}</Typography>
                  <Typography variant="caption" sx={{ color: mutedColor }}>Qty {item.quantity || 1}</Typography>
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 900 }}>{priceFormat(Number(item.total_cost ?? item.unit_cost ?? 0))}</Typography>
              </Stack>
            ))}
            {requests.length === 0 && perks.map((perk: string) => (
              <Stack key={perk} direction="row" spacing={1.2} alignItems="center" sx={{ p: 1, borderRadius: 3, bgcolor: itemBg }}>
                <Typography variant="body2" sx={{ fontWeight: 800 }} noWrap>{perk}</Typography>
                <Box sx={{ flex: 1 }} />
                <Typography variant="caption" sx={{ color: mutedColor }}>Included</Typography>
              </Stack>
            ))}
          </Stack>
        </>
      )}

      <Divider sx={{ my: 1.5, borderColor: isDark ? 'rgba(255,255,255,0.16)' : 'divider' }} />
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="caption" sx={{ color: mutedColor }}>
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
