import { Stack, Typography } from '@mui/material';
import type { PostalAddressParts } from './checkout';

/** Compact read-only view of the user's main address when billing mirrors it. */
export default function BillingSummary({ address }: Readonly<{ address: PostalAddressParts }>) {
  const cityState = [address.city, address.state].filter(Boolean).join(', ');
  const cityLine = [cityState, address.pincode].filter(Boolean).join(' - ');
  const secondary = [address.line2, address.landmark].filter(Boolean).join(', ');
  const rows = [
    { key: 'line1', text: address.line1 },
    { key: 'secondary', text: secondary },
    { key: 'cityLine', text: cityLine },
    { key: 'country', text: address.country },
  ].filter((row) => row.text);

  return (
    <Stack spacing={0.25} sx={{ px: 1.5, py: 1.25, borderRadius: 2, border: '1px dashed', borderColor: 'divider' }}>
      {rows.map((row) => (
        <Typography key={row.key} variant="body2" color="text.secondary">
          {row.text}
        </Typography>
      ))}
    </Stack>
  );
}
