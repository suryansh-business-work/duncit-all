import { useState } from 'react';
import { Chip, Dialog, DialogContent, DialogTitle, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Tooltip, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import BlockIcon from '@mui/icons-material/Block';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { surveyLinkUrl, type LeadSurveyDef, type LeadSurveyEntry } from './queries';
import { formatDateTime } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';

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
const fmt = (iso?: string | null) => (iso ? formatDateTime(iso) : '—');

type Translate = ReturnType<typeof useTranslation>['t'];

const statusChip = (e: LeadSurveyEntry, t: Translate) => {
  if (e.source === 'LINK' && e.token_revoked) return <Chip size="small" label={t('crm.components.revoked')} variant="outlined" />;
  if (e.filled) return <Chip size="small" color="success" label={t('crm.components.filled')} variant="outlined" />;
  return <Chip size="small" color="warning" label={t('crm.components.pending')} variant="outlined" />;
};

/** Per-lead log of every survey generation/response (manual, link, app). */
export default function LeadSurveyEntriesTable({ entries, survey, onRevoke, onDelete, onFill, revoking, deleting }: Readonly<Props>) {
  const { t } = useTranslation();
  const [view, setView] = useState<LeadSurveyEntry | null>(null);
  const labelFor = (qid: string) => survey?.questions.find((q) => q.qid === qid)?.label ?? qid;
  const copy = (token: string) => navigator.clipboard?.writeText(surveyLinkUrl(token));

  if (entries.length === 0) {
    return (
      <Typography variant="body2" sx={{
        color: "text.secondary"
      }}>{t('crm.components.noSurveysGeneratedYetClickFill')}</Typography>
    );
  }

  return (
    <>
      <Paper variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('crm.common.source')}</TableCell>
              <TableCell>{t('shell.common.status')}</TableCell>
              <TableCell>{t('crm.components.generated')}</TableCell>
              <TableCell>{t('crm.components.submitted')}</TableCell>
              <TableCell align="right">{t('shell.common.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {entries.map((e) => (
              <TableRow
                key={e.id}
                hover
                sx={{ cursor: 'pointer' }}
                onClick={() => onFill(e)}
                title={t('crm.components.openToFillEditThisSurvey')}
              >
                <TableCell><Chip size="small" color={SOURCE_COLOR[e.source]} label={e.source} variant="outlined" /></TableCell>
                <TableCell>{statusChip(e, t)}</TableCell>
                <TableCell>
                  <Typography variant="body2">{fmt(e.created_at)}</Typography>
                  {e.generated_by && <Typography variant="caption" sx={{
                    color: "text.secondary"
                  }}>by {e.generated_by}</Typography>}
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{fmt(e.submitted_at)}</Typography>
                  {e.submitted_by && <Typography variant="caption" sx={{
                    color: "text.secondary"
                  }}>{e.submitted_by}</Typography>}
                </TableCell>
                <TableCell align="right" onClick={(ev) => ev.stopPropagation()}>
                  {e.source === 'LINK' && !e.token_revoked && e.token && (
                    <>
                      <Tooltip title={t('crm.components.copyLink')}><DuncitIconButton size="small" onClick={() => copy(e.token!)}><ContentCopyIcon fontSize="small" /></DuncitIconButton></Tooltip>
                      <Tooltip title={t('crm.components.revokeLink')}><span><DuncitIconButton size="small" color="warning" disabled={revoking} onClick={() => onRevoke(e.id)}><BlockIcon fontSize="small" /></DuncitIconButton></span></Tooltip>
                    </>
                  )}
                  {e.filled && (
                    <Tooltip title={t('crm.components.viewAnswers')}><DuncitIconButton size="small" onClick={() => setView(e)}><VisibilityIcon fontSize="small" /></DuncitIconButton></Tooltip>
                  )}
                  <Tooltip title={t('shell.common.delete')}><span><DuncitIconButton size="small" color="error" disabled={deleting} onClick={() => onDelete(e.id)}><DeleteIcon fontSize="small" /></DuncitIconButton></span></Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={!!view} onClose={() => setView(null)} fullWidth maxWidth="sm">
        <DialogTitle>{t('crm.components.surveyAnswers')}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.25}>
            {(view?.answers ?? []).map((a) => (
              <Stack key={a.qid} spacing={0.25}>
                <Typography
                  variant="caption"
                  sx={{
                    color: "text.secondary",
                    fontWeight: 700
                  }}>{labelFor(a.qid)}</Typography>
                <Typography variant="body2">{(a.values?.length ? a.values.join(', ') : a.value) || '—'}</Typography>
              </Stack>
            ))}
            {(view?.answers?.length ?? 0) === 0 && <Typography variant="body2" sx={{
              color: "text.secondary"
            }}>{t('crm.components.noAnswersRecorded')}</Typography>}
          </Stack>
        </DialogContent>
        <Stack
          direction="row"
          sx={{
            justifyContent: "flex-end",
            p: 1.5
          }}>
          <DuncitButton onClick={() => setView(null)}>{t('shell.common.close')}</DuncitButton>
        </Stack>
      </Dialog>
    </>
  );
}
