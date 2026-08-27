import type { ReactNode } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { DuncitButton } from '@duncit/buttons';
import { splitAutoPods, type AutoPodRole, type AutoPodRow, type AutoPodLabels } from '@duncit/utils';
import { AutoPodCard } from './AutoPodCard';

export interface AutoPodQueueProps {
  role: AutoPodRole;
  rows: AutoPodRow[];
  labels: AutoPodLabels;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  formatWhen: (iso: string) => string;
  formatMoney: (amount: number) => string;
  /** The role's button for a row it can still act on. */
  renderAction: (row: AutoPodRow) => ReactNode;
  /** Anything to show on a row this viewer already enrolled in (e.g. a pod link). */
  renderMineAction?: (row: AutoPodRow) => ReactNode;
}

interface SectionProps {
  heading: string;
  rows: AutoPodRow[];
  labels: AutoPodLabels;
  formatWhen: (iso: string) => string;
  formatMoney: (amount: number) => string;
  renderAction: (row: AutoPodRow) => ReactNode;
}

/** One titled block of cards. Hoisted to module scope so it is never redefined
 * per render of the queue (S6478). */
function AutoPodSection({
  heading,
  rows,
  labels,
  formatWhen,
  formatMoney,
  renderAction,
}: Readonly<SectionProps>) {
  if (rows.length === 0) return null;
  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom sx={{
        color: "text.secondary"
      }}>
        {heading}
      </Typography>
      <Grid container spacing={2}>
        {rows.map((row) => (
          <Grid
            key={row.id}
            size={{
              xs: 12,
              sm: 6,
              md: 4
            }}>
            <AutoPodCard
              row={row}
              labels={labels}
              formatWhen={formatWhen}
              formatMoney={formatMoney}
              action={renderAction(row)}
            />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

/**
 * A role's whole Auto Pod queue: what still needs them, then what they already
 * enrolled in. Both sections render the same card, so a venue watching its
 * accepted offer sees exactly the enrolment state a host does.
 */
export function AutoPodQueue({
  role,
  rows,
  labels,
  loading,
  error,
  onRetry,
  formatWhen,
  formatMoney,
  renderAction,
  renderMineAction,
}: Readonly<AutoPodQueueProps>) {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert
        severity="error"
        action={
          <DuncitButton color="inherit" size="small" onClick={onRetry}>
            {labels.retry}
          </DuncitButton>
        }
      >
        {labels.loadFailed}
      </Alert>
    );
  }

  const { actionable, mine } = splitAutoPods(rows, role);
  if (actionable.length === 0 && mine.length === 0) {
    return <Alert severity="info">{labels.empty(role)}</Alert>;
  }

  const mineAction = renderMineAction ?? (() => null);
  return (
    <Stack spacing={3}>
      <AutoPodSection
        heading={labels.needsAction}
        rows={actionable}
        labels={labels}
        formatWhen={formatWhen}
        formatMoney={formatMoney}
        renderAction={renderAction}
      />
      <AutoPodSection
        heading={labels.claimedByYou}
        rows={mine}
        labels={labels}
        formatWhen={formatWhen}
        formatMoney={formatMoney}
        renderAction={mineAction}
      />
    </Stack>
  );
}
