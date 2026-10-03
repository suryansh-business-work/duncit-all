import { Stack, Typography } from '@mui/material';
import type { DnsHostPair } from '@duncit/gql-types';

export const EM_DASH = '—';
const MONO = { fontFamily: 'monospace', wordBreak: 'break-all', py: 0.5 } as const;

/** A side's values, or an em-dash when that stack answers for nothing here. */
function ValueCell({ values, missing }: Readonly<{ values: string[]; missing: boolean }>) {
  if (values.length === 0) {
    return (
      <Typography variant="body2" sx={{ ...MONO, color: missing ? 'error.main' : 'text.secondary', fontWeight: 700 }}>
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
  <ValueCell values={row.production_values} missing={row.state === 'MISSING_PRODUCTION'} />
);

export const renderStagingValues = (row: DnsHostPair) => (
  <ValueCell values={row.staging_values} missing={row.state === 'MISSING_STAGING'} />
);
