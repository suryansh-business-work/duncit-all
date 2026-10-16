import { useState, type ReactNode } from 'react';
import { Accordion, AccordionDetails, AccordionSummary, Paper, Stack, TextField, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { DuncitButton } from '@duncit/buttons';
import type { SeriesRequestLabels } from './labels';

/** What the group reads off each date's request row. */
export interface SeriesRequestRow {
  slot_id: string;
  pod_title: string;
  start_at: string;
  series_id?: string | null;
}

export interface SeriesRequestGroupProps<T extends SeriesRequestRow> {
  /** The series' pending dates, in date order (see `groupSlotRequestsBySeries`). */
  rows: T[];
  busy: boolean;
  labels: SeriesRequestLabels;
  /** The surface's own date-time format (admin-set zone and pattern). */
  formatWhen: (iso: string) => string;
  onApproveAll: () => void;
  onDeclineAll: (reason: string) => void;
  /** Each date's own request card, so a single date can still be answered alone. */
  renderRow: (row: T) => ReactNode;
}

/**
 * Every pending date of one recurring pod, as one card: the venue accepts or
 * declines them all at once, or opens the list and answers each date on its
 * own. Each date is a separate pod, so answering one never touches another.
 * Rendered by mWeb's and the Partners console's slot request pages.
 */
export function SeriesRequestGroup<T extends SeriesRequestRow>({
  rows,
  busy,
  labels,
  formatWhen,
  onApproveAll,
  onDeclineAll,
  renderRow,
}: Readonly<SeriesRequestGroupProps<T>>) {
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState('');
  const [first] = rows;
  if (!first) return null;
  const last = rows.reduce((_, row) => row, first);
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }} data-testid={`slot-series-${first.series_id}`}>
      <Stack spacing={1.5}>
        <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 600 }}>
          {first.pod_title}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {labels.summary(rows.length, formatWhen(first.start_at), formatWhen(last.start_at))}
        </Typography>
        {declining ? (
          <Stack spacing={1}>
            <TextField
              size="small"
              label={labels.declineReason}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              slotProps={{ htmlInput: { maxLength: 500 } }}
            />
            <Stack direction="row" spacing={1}>
              <DuncitButton variant="outlined" onClick={() => setDeclining(false)} disabled={busy}>
                {labels.cancel}
              </DuncitButton>
              <DuncitButton
                color="error"
                onClick={() => onDeclineAll(reason.trim())}
                disabled={busy}
                data-testid="slot-series-decline-confirm"
              >
                {labels.declineAll(rows.length)}
              </DuncitButton>
            </Stack>
          </Stack>
        ) : (
          <Stack direction="row" spacing={1}>
            <DuncitButton onClick={onApproveAll} disabled={busy} data-testid="slot-series-approve-all">
              {labels.acceptAll(rows.length)}
            </DuncitButton>
            <DuncitButton
              variant="outlined"
              color="error"
              onClick={() => setDeclining(true)}
              disabled={busy}
              data-testid="slot-series-decline-all"
            >
              {labels.declineAllShort}
            </DuncitButton>
          </Stack>
        )}
        <Accordion disableGutters elevation={0} sx={{ bgcolor: 'transparent', '&:before': { display: 'none' } }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />} data-testid="slot-series-each">
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{labels.answerEach}</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ px: 0 }}>
            <Stack spacing={1.5}>{rows.map((row) => renderRow(row))}</Stack>
          </AccordionDetails>
        </Accordion>
      </Stack>
    </Paper>
  );
}
