import { Paper, Stack } from '@mui/material';
import { ChipList, InfoRow, PageHeader, StatusChip } from '@duncit/ui';
import { formatMoney } from '@duncit/utils';

export interface RowsMock {
  pod_id: string;
  venue: string;
  spots: string;
  total: number;
  perks: string[];
  statuses: string[];
}

/** What the `rows-and-chips` demo renders. */
export function RowsAndChipsDemo({ mock }: Readonly<{ mock: RowsMock }>) {
  return (
    <Stack spacing={2}>
      <PageHeader title="Pod detail" subtitle={mock.pod_id} />
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
        <InfoRow label="Venue" value={mock.venue} />
        <InfoRow label="Spots" value={mock.spots} />
        <InfoRow variant="split" bold label="Collected" value={formatMoney(mock.total)} />
        <InfoRow label="Available perks" value={<ChipList items={mock.perks} empty="—" />} />
      </Paper>
      <Stack direction="row" spacing={1} useFlexGap sx={{
        flexWrap: "wrap"
      }}>
        {mock.statuses.map((status) => (
          <StatusChip key={status} status={status} />
        ))}
      </Stack>
    </Stack>
  );
}
