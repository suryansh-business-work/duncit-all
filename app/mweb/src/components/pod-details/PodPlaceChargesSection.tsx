import { Box, Stack, Typography } from '@mui/material';

interface Charge {
  label: string;
  amount: number;
  note?: string | null;
}

interface Props {
  charges: Charge[];
  currency?: string;
}

export default function PodPlaceChargesSection({ charges, currency = '\u20b9' }: Readonly<Props>) {
  if (!charges || charges.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No additional venue charges listed.
      </Typography>
    );
  }
  return (
    <Stack divider={<Box sx={{ borderBottom: '1px dashed', borderColor: 'divider' }} />}>
      {charges.map((c, i) => (
        <Stack
          key={`${c.label}-${i}`}
          direction="row"
          alignItems="flex-start"
          justifyContent="space-between"
          sx={{ py: 1 }}
        >
          <Box sx={{ flex: 1, pr: 1 }}>
            <Typography variant="body2" fontWeight={500}>
              {c.label}
            </Typography>
            {c.note && (
              <Typography variant="caption" color="text.secondary">
                {c.note}
              </Typography>
            )}
          </Box>
          <Typography variant="body2" fontWeight={600}>
            {currency}
            {c.amount}
          </Typography>
        </Stack>
      ))}
    </Stack>
  );
}
