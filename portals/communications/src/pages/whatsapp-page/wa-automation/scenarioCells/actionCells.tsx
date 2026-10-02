import { Box, Stack, Switch, Tooltip, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { StatusChip } from '@duncit/ui';
import { BLOCKER_COLORS } from '../helpers';
import type { WaScenario } from '../queries';

/** The button's caption and tooltip for each provisioning step. */
export interface ProvisionLabels {
  TEMPLATE: { label: string; hint: string };
  CAMPAIGN: { label: string; hint: string };
}

interface BlockerCellProps {
  row: WaScenario;
  readyLabel: string;
  busy: boolean;
  provisionLabels: ProvisionLabels;
  onProvision: (row: WaScenario) => void;
}

/**
 * The whole point of the table: why this cannot send, in the server's words —
 * and, for a scenario the code shipped with a drafted template, the one press
 * that creates what is missing at AiSensy.
 */
export function BlockerCell({
  row,
  readyLabel,
  busy,
  provisionLabels,
  onProvision,
}: Readonly<BlockerCellProps>) {
  if (!row.blocker) {
    return (
      <Typography variant="caption" sx={{
        color: "success.main"
      }}>
        {readyLabel}
      </Typography>
    );
  }
  const step = row.provision_step ? provisionLabels[row.provision_step] : null;
  return (
    <Stack spacing={0.75} sx={{ alignItems: 'flex-start', py: 0.5 }}>
      <StatusChip
        status="BLOCKED"
        label={row.blocker}
        colorMap={BLOCKER_COLORS}
        sx={{ height: 'auto', py: 0.5, '& .MuiChip-label': { whiteSpace: 'normal' } }}
      />
      {step && (
        <Tooltip title={step.hint}>
          <span>
            <DuncitButton
              size="small"
              variant="outlined"
              disabled={busy}
              onClick={() => onProvision(row)}
            >
              {step.label}
            </DuncitButton>
          </span>
        </Tooltip>
      )}
    </Stack>
  );
}

interface EnabledProps {
  row: WaScenario;
  busy: boolean;
  lockedTitle: string;
  lockedHint: string;
  onToggle: (eventKey: string, enabled: boolean) => void;
}

/**
 * A ticket, a refund and an account change have no switch to turn. The tooltip
 * hangs off the wrapping span because a disabled input fires no pointer events
 * of its own.
 */
export function EnabledCell({
  row,
  busy,
  lockedTitle,
  lockedHint,
  onToggle,
}: Readonly<EnabledProps>) {
  const locked = !row.can_disable;
  const title = locked ? (
    <Box>
      <Typography variant="caption" component="div" sx={{
        fontWeight: 700
      }}>
        {lockedTitle}
      </Typography>
      <Typography variant="caption" component="div">
        {lockedHint}
      </Typography>
    </Box>
  ) : (
    ''
  );
  return (
    <Tooltip title={title}>
      <span>
        <Switch
          checked={row.enabled}
          disabled={locked || busy}
          onChange={(event) => onToggle(row.event_key, event.target.checked)}
          slotProps={{
            input: { 'aria-label': row.event_key }
          }}
        />
      </span>
    </Tooltip>
  );
}
