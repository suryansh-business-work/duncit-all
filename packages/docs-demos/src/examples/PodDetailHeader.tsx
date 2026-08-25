import { Button, Divider, Stack } from '@mui/material';
import { BackHeader, InfoRow, STATUS_CHIP_COLORS, StatusChip } from '@duncit/ui';
import { formatINR } from '@duncit/utils';

/** The top of a portal detail page: back header, status, then the fact rows. */
export function PodDetailHeader() {
  return (
    <Stack sx={{ gap: 2 }}>
      <BackHeader
        eyebrow="Pod"
        title="Saturday Supper Club — Indiranagar"
        onBack={() => undefined}
        actions={<Button size="small" variant="outlined">Edit</Button>}
      />

      <Stack
        direction="row"
        sx={{
          flexWrap: "wrap",
          gap: 1
        }}>
        <StatusChip status="APPROVED" />
        <StatusChip status="PENDING" />
        {/* products renders DRAFT as default, not the repo-wide warning. */}
        <StatusChip status="DRAFT" colorMap={{ ...STATUS_CHIP_COLORS, DRAFT: 'default' }} />
        <StatusChip status="BACKOUT_IN_PROCESS" label="Backout in process" fallbackColor="warning" />
      </Stack>

      <Divider />

      <Stack
        direction="row"
        sx={{
          flexWrap: "wrap",
          gap: 4
        }}>
        <InfoRow label="Pod ID" value="DUN-POD-4821" />
        <InfoRow label="Host" value="Ananya Rao" />
        <InfoRow label="Venue" value="The Table, 12th Main" />
      </Stack>

      <Stack sx={{ gap: 0.5, maxWidth: 380 }}>
        <InfoRow variant="inline" label="Spots" value="8 total · 7 payable" />
        <InfoRow variant="split" label="Per seat" value={formatINR(1250)} />
        <InfoRow variant="split" label="Platform fee" value={`− ${formatINR(875)}`} />
        <InfoRow variant="split" bold boldColor="#15803d" label="Host earns" value={formatINR(7875)} />
      </Stack>
    </Stack>
  );
}
