import { Paper, Stack } from '@mui/material';
import { useState } from 'react';
import { DuncitButton } from '@duncit/buttons';
import { InfoRow, Loader, LoadingOverlay, TopProgressBar, type LoaderVariant } from '@duncit/ui';

export interface LoaderMock {
  variant: LoaderVariant;
  serverMs: number;
  rows: string[];
}

/**
 * The wait every console page has: a list that is already on screen, refreshing.
 * Hoisted for the same reason as `SpotsDemo`.
 */
export function LoaderDemo({ mock }: Readonly<{ mock: LoaderMock }>) {
  const [busy, setBusy] = useState(false);
  const refresh = () =>
    new Promise<void>((resolve) => {
      setBusy(true);
      setTimeout(() => {
        setBusy(false);
        resolve();
      }, mock.serverMs);
    });
  const rows = (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
      <Stack spacing={1}>
        {mock.rows.map((row) => (
          <InfoRow key={row} variant="split" label={row} value="APPROVED" />
        ))}
      </Stack>
    </Paper>
  );
  return (
    <Stack spacing={2}>
      <TopProgressBar busy={busy} />
      <DuncitButton variant="contained" onClick={refresh}>
        Refresh venues
      </DuncitButton>
      {mock.variant === 'overlay' ? (
        <LoadingOverlay open={busy} showLabel label="Refreshing venues…">
          {rows}
        </LoadingOverlay>
      ) : (
        <>{busy ? <Loader variant={mock.variant} showLabel /> : rows}</>
      )}
    </Stack>
  );
}
