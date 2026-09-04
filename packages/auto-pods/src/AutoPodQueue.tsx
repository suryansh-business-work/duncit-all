import type { ReactNode } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { DuncitButton } from '@duncit/buttons';
import {
  autoPodQueueSections,
  type AutoPodCardChrome,
  type AutoPodRow,
} from '@duncit/utils';
import { AutoPodCard } from './AutoPodCard';

/** Stable module-scope defaults, so an omitted prop never re-renders the grid. */
const noNode = () => null;
const NO_EARNINGS: Readonly<Record<string, number>> = {};

export interface AutoPodQueueProps extends AutoPodCardChrome {
  rows: AutoPodRow[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  /** The role's button for a row it can still act on. */
  renderAction: (row: AutoPodRow) => ReactNode;
  /** Anything to show on a row this viewer already enrolled in (e.g. a pod link). */
  renderMineAction?: (row: AutoPodRow) => ReactNode;
  /** The row's "View Potential Earnings" control, drawn under its details. */
  renderEarningsAction?: (row: AutoPodRow) => ReactNode;
  /**
   * What this viewer worked out in that dialog, by Auto Pod id. It wins over
   * the server's figure on the card, because it is the number they just typed.
   */
  earnings?: Readonly<Record<string, number>>;
}

interface SectionProps extends AutoPodCardChrome {
  heading: string;
  rows: AutoPodRow[];
  renderAction: (row: AutoPodRow) => ReactNode;
  renderEarningsAction: (row: AutoPodRow) => ReactNode;
  earnings: Readonly<Record<string, number>>;
}

/** One titled block of cards. Hoisted to module scope so it is never redefined
 * per render of the queue (S6478). */
function AutoPodSection({
  heading,
  rows,
  renderAction,
  renderEarningsAction,
  earnings,
  ...chrome
}: Readonly<SectionProps>) {
  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom sx={{ color: 'text.secondary' }}>
        {heading}
      </Typography>
      <Grid container spacing={2}>
        {rows.map((row) => (
          <Grid key={row.id} size={{ xs: 12, sm: 6, md: 4 }}>
            <AutoPodCard
              row={row}
              action={renderAction(row)}
              earningsAction={renderEarningsAction(row)}
              earnings={earnings[row.id] ?? null}
              {...chrome}
            />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

/**
 * A role's whole Auto Pod queue: what is waiting on them (enrolment runs venue
 * → host → club admin, so an offer reaches a host only once a venue has fixed
 * a slot, and a club admin once a host is on it), then what they already
 * enrolled in. Both sections render the same card, so a venue watching its
 * accepted offer sees exactly what a host does; `autoPodQueueSections` decides
 * which blocks there are, and the native twin reads the same function.
 */
export function AutoPodQueue({
  rows,
  loading,
  error,
  onRetry,
  renderAction,
  renderMineAction,
  renderEarningsAction,
  earnings,
  ...chrome
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
            {chrome.labels.retry}
          </DuncitButton>
        }
      >
        {chrome.labels.loadFailed}
      </Alert>
    );
  }

  const sections = autoPodQueueSections(rows, chrome.role, chrome.labels);
  if (sections.length === 0) {
    return <Alert severity="info">{chrome.labels.empty(chrome.role)}</Alert>;
  }

  const mineAction = renderMineAction ?? noNode;
  return (
    <Stack spacing={3}>
      {sections.map((section) => (
        <AutoPodSection
          key={section.key}
          heading={section.heading}
          rows={section.rows}
          renderAction={section.key === 'actionable' ? renderAction : mineAction}
          renderEarningsAction={renderEarningsAction ?? noNode}
          earnings={earnings ?? NO_EARNINGS}
          {...chrome}
        />
      ))}
    </Stack>
  );
}
