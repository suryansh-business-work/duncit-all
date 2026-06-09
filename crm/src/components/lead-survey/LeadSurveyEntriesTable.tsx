import { useState } from 'react';
import {
  Button, Chip, Dialog, DialogContent, DialogTitle, IconButton, Paper, Stack, Table,
  TableBody, TableCell, TableHead, TableRow, Tooltip, Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import BlockIcon from '@mui/icons-material/Block';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import { surveyLinkUrl, type LeadSurveyDef, type LeadSurveyEntry } from './queries';

interface Props {
  entries: LeadSurveyEntry[];
  survey: LeadSurveyDef | null;
  onRevoke: (entryId: string) => void;
  onDelete: (entryId: string) => void;
  onFill: (entry: LeadSurveyEntry) => void;
  revoking: boolean;
  deleting: boolean;
}

const SOURCE_COLOR: Record<string, 'primary' | 'secondary' | 'info'> = { MANUAL: 'primary', LINK: 'secondary', APP: 'info' };
const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : '—');

const statusChip = (e: LeadSurveyEntry) => {
  if (e.source === 'LINK' && e.token_revoked) return <Chip size="small" label="Revoked" variant="outlined" />;
  if (e.filled) return <Chip size="small" color="success" label="Filled" variant="outlined" />;
  return <Chip size="small" color="warning" label="Pending" variant="outlined" />;
};

/** Per-lead log of every survey generation/response (manual, link, app). */
export default function LeadSurveyEntriesTable({ entries, survey, onRevoke, onDelete, onFill, revoking, deleting }: Readonly<Props>) {
  const [view, setView] = useState<LeadSurveyEntry | null>(null);
  const labelFor = (qid: string) => survey?.questions.find((q) => q.qid === qid)?.label ?? qid;
  const copy = (token: string) => navigator.clipboard?.writeText(surveyLinkUrl(token));

  if (entries.length === 0) {
    return <Typography variant="body2" color="text.secondary">No surveys generated yet. Click “Fill manually” or “Generate link”.</Typography>;
  }

  return (
    <>
      <Paper variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Source</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Generated</TableCell>
              <TableCell>Submitted</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {entries.map((e) => (
              <TableRow
                key={e.id}
                hover
                sx={{ cursor: 'pointer' }}
                onClick={() => onFill(e)}
                title="Open to fill / edit this survey"
              >
                <TableCell><Chip size="small" color={SOURCE_COLOR[e.source]} label={e.source} variant="outlined" /></TableCell>
                <TableCell>{statusChip(e)}</TableCell>
                <TableCell>
                  <Typography variant="body2">{fmt(e.created_at)}</Typography>
                  {e.generated_by && <Typography variant="caption" color="text.secondary">by {e.generated_by}</Typography>}
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{fmt(e.submitted_at)}</Typography>
                  {e.submitted_by && <Typography variant="caption" color="text.secondary">{e.submitted_by}</Typography>}
                </TableCell>
                <TableCell align="right" onClick={(ev) => ev.stopPropagation()}>
                  {e.source === 'LINK' && !e.token_revoked && e.token && (
                    <>
                      <Tooltip title="Copy link"><IconButton size="small" onClick={() => copy(e.token!)}><ContentCopyIcon fontSize="small" /></IconButton></Tooltip>
                      <Tooltip title="Revoke link"><span><IconButton size="small" color="warning" disabled={revoking} onClick={() => onRevoke(e.id)}><BlockIcon fontSize="small" /></IconButton></span></Tooltip>
                    </>
                  )}
                  {e.filled && (
                    <Tooltip title="View answers"><IconButton size="small" onClick={() => setView(e)}><VisibilityIcon fontSize="small" /></IconButton></Tooltip>
                  )}
                  <Tooltip title="Delete"><span><IconButton size="small" color="error" disabled={deleting} onClick={() => onDelete(e.id)}><DeleteIcon fontSize="small" /></IconButton></span></Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={!!view} onClose={() => setView(null)} fullWidth maxWidth="sm">
        <DialogTitle>Survey answers</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.25}>
            {(view?.answers ?? []).map((a) => (
              <Stack key={a.qid} spacing={0.25}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>{labelFor(a.qid)}</Typography>
                <Typography variant="body2">{(a.values && a.values.length ? a.values.join(', ') : a.value) || '—'}</Typography>
              </Stack>
            ))}
            {(view?.answers?.length ?? 0) === 0 && <Typography variant="body2" color="text.secondary">No answers recorded.</Typography>}
          </Stack>
        </DialogContent>
        <Stack direction="row" justifyContent="flex-end" sx={{ p: 1.5 }}>
          <Button onClick={() => setView(null)}>Close</Button>
        </Stack>
      </Dialog>
    </>
  );
}
