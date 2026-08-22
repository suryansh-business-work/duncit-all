import { Box, Stack, Switch, Tooltip, Typography } from '@mui/material';
import { StatusChip, type StatusColorMap } from '@duncit/ui';
import { EM_DASH } from '@duncit/table';
import type { WaCategoryCopy } from '@duncit/app-settings';
import { BLOCKER_COLORS, statusKey } from './helpers';
import type { WaScenario } from './queries';

interface ScenarioCellProps {
  row: WaScenario;
  firesLabel: string;
}

/** Stable id plus the sentence that says what sets it off. */
export function ScenarioCell({ row, firesLabel }: Readonly<ScenarioCellProps>) {
  return (
    <Box sx={{ minWidth: 0, lineHeight: 1.3 }}>
      <Typography variant="body2" fontWeight={700} sx={{ fontFamily: 'monospace', fontSize: 12 }}>
        {row.event_key}
      </Typography>
      <Tooltip title={firesLabel}>
        <Typography
          variant="caption"
          color="text.secondary"
          component="div"
          sx={{ whiteSpace: 'normal' }}
        >
          {row.fires}
        </Typography>
      </Tooltip>
    </Box>
  );
}

/** The consent category under the same name mWeb and the app give it. */
export function CategoryCell({ copy }: Readonly<{ copy: WaCategoryCopy }>) {
  return (
    <Tooltip title={copy.description}>
      <Typography variant="body2">{copy.label}</Typography>
    </Tooltip>
  );
}

interface NamedStatusProps {
  name: string;
  status: string;
  /** The vocabulary this state belongs to — campaign states or template states. */
  colorMap: StatusColorMap;
}

/** A campaign or template name with whatever state AiSensy reports for it. */
export function NamedStatusCell({ name, status, colorMap }: Readonly<NamedStatusProps>) {
  return (
    <Stack spacing={0.5} sx={{ minWidth: 0, py: 0.5 }}>
      <Typography variant="body2" noWrap title={name}>
        {name || EM_DASH}
      </Typography>
      {status ? (
        <StatusChip
          status={statusKey(status)}
          label={status}
          colorMap={colorMap}
          sx={{ alignSelf: 'flex-start' }}
        />
      ) : null}
    </Stack>
  );
}

/** Each value the code sends, numbered so the order is readable at a glance. */
const paramsHint = (row: WaScenario) =>
  row.params.map((label, position) => `${position + 1}. ${label}`).join('\n');

interface ValuesCellProps {
  row: WaScenario;
  paramsLabel: string;
}

/**
 * What the code sends beside what the live template expects. A mismatch is the
 * commonest reason a scenario is blocked, so the two numbers sit next to each
 * other rather than in two columns nobody compares.
 */
export function ValuesCell({ row, paramsLabel }: Readonly<ValuesCellProps>) {
  const mismatch = row.params.length !== row.template_params;
  const title = (
    <Box>
      <Typography variant="caption" fontWeight={700} component="div">
        {paramsLabel}
      </Typography>
      <Typography variant="caption" component="div" sx={{ whiteSpace: 'pre-line' }}>
        {paramsHint(row)}
      </Typography>
    </Box>
  );
  return (
    <Tooltip title={title}>
      <Typography
        variant="body2"
        fontWeight={mismatch ? 700 : 400}
        color={mismatch ? 'error.main' : 'text.primary'}
        sx={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {row.params.length} / {row.template_params}
      </Typography>
    </Tooltip>
  );
}

interface BlockerCellProps {
  row: WaScenario;
  readyLabel: string;
}

/** The whole point of the table: why this cannot send, in the server's words. */
export function BlockerCell({ row, readyLabel }: Readonly<BlockerCellProps>) {
  if (!row.blocker) {
    return (
      <Typography variant="caption" color="success.main">
        {readyLabel}
      </Typography>
    );
  }
  return (
    <StatusChip
      status="BLOCKED"
      label={row.blocker}
      colorMap={BLOCKER_COLORS}
      sx={{ height: 'auto', py: 0.5, '& .MuiChip-label': { whiteSpace: 'normal' } }}
    />
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
      <Typography variant="caption" fontWeight={700} component="div">
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
          inputProps={{ 'aria-label': row.event_key }}
          onChange={(event) => onToggle(row.event_key, event.target.checked)}
        />
      </span>
    </Tooltip>
  );
}
