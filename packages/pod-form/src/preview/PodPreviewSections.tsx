import type { ReactNode } from 'react';
import { Box, Chip, Divider, Stack, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircleOutlined';
import RedeemIcon from '@mui/icons-material/RedeemOutlined';

/** A titled block of the pod page, hidden entirely when it has nothing to say. */
export function PreviewSection({
  title,
  children,
}: Readonly<{ title: string; children: ReactNode }>) {
  return (
    <Box>
      <Typography
        variant="subtitle2"
        sx={{
          fontWeight: 800,
          mb: 0.75
        }}>
        {title}
      </Typography>
      {children}
    </Box>
  );
}

/** The apps render offers and perks as ticked lists, not prose. */
export function PreviewBullets({
  items,
  kind,
}: Readonly<{ items: string[]; kind: 'OFFER' | 'PERK' }>) {
  const icon =
    kind === 'OFFER' ? (
      <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main', mt: '2px' }} />
    ) : (
      <RedeemIcon sx={{ fontSize: 16, color: 'primary.main', mt: '2px' }} />
    );

  return (
    <Stack spacing={0.5}>
      {items.map((item) => (
        <Stack key={item} direction="row" spacing={0.75} sx={{
          alignItems: "flex-start"
        }}>
          {icon}
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            {item}
          </Typography>
        </Stack>
      ))}
    </Stack>
  );
}

export function PreviewChips({ items, prefix }: Readonly<{ items: string[]; prefix: string }>) {
  return (
    <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', gap: 0.75 }}>
      {items.map((item) => (
        <Chip key={item} size="small" label={`${prefix}${item}`} variant="outlined" />
      ))}
    </Stack>
  );
}

/** Extra charges collected at the venue — shown to the member before booking. */
export function PreviewCharges({
  charges,
  money,
}: Readonly<{ charges: { label: string; amount: number; note: string }[]; money: (n: number) => string }>) {
  return (
    <Stack spacing={0.5} divider={<Divider flexItem />}>
      {charges.map((charge) => (
        <Stack key={charge.label} direction="row" spacing={1} sx={{
          justifyContent: "space-between"
        }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2">{charge.label}</Typography>
            {charge.note && (
              <Typography variant="caption" sx={{
                color: "text.secondary"
              }}>
                {charge.note}
              </Typography>
            )}
          </Box>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 700,
              flex: '0 0 auto'
            }}>
            {money(charge.amount)}
          </Typography>
        </Stack>
      ))}
    </Stack>
  );
}
