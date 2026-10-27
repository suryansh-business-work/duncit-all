import { Stack, Typography } from '@mui/material';
import type { DnsHostPair } from '@duncit/gql-types';

export const EM_DASH = '—';
const MONO = { fontFamily: 'monospace', wordBreak: 'break-all', py: 0.5 } as const;

/**
 * A side's values, or a red em-dash when that stack answers for nothing here — a pair
 * is only ever listed because one of its sides has records, so an empty side IS the gap.
 */
function ValueCell({ values }: Readonly<{ values: string[] }>) {
  if (values.length === 0) {
    return (
      <Typography variant="body2" sx={{ ...MONO, color: 'error.main', fontWeight: 700 }}>
        {EM_DASH}
      </Typography>
    );
  }
  return (
    <Stack sx={{ py: 0.5 }}>
      {values.map((value) => (
        <Typography key={value} variant="body2" sx={MONO}>
          {value}
        </Typography>
      ))}
    </Stack>
  );
}

export const renderProductionValues = (row: DnsHostPair) => (
  <ValueCell values={row.production_values} />
);

export const renderStagingValues = (row: DnsHostPair) => (
  <ValueCell values={row.staging_values} />
);
