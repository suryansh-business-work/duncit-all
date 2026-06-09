import { useState } from 'react';
import { gql, useMutation } from '@apollo/client';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import { CREATE_HOST_LEAD, CREATE_VENUE_LEAD } from '../api/crm.gql';
import { parseApiError } from '../utils/parseApiError';
import AiRecordsTable, { type AiRow } from './ai-records/AiRecordsTable';
import { recordToRow, rowError, rowToInput } from './ai-records/aiLeadInput';

const AI_PARSE_CRM_LEADS = gql`
  mutation AiParseCrmLeads($entity: CrmAiEntity!, $text: String!) {
    aiParseCrmLeads(entity: $entity, text: $text)
  }
`;

interface Props {
  open: boolean;
  entity: 'VENUE_LEAD' | 'HOST_LEAD';
  title: string;
  onClose: () => void;
  /** Called after one or more leads are created so the list can refetch. */
  onSaved: (count: number) => void;
}

/** Paste free-form text → AI extracts MULTIPLE leads → edit → confirm → bulk create. */
export default function FillWithAiDialog({ open, entity, title, onClose, onSaved }: Readonly<Props>) {
  const [text, setText] = useState('');
  const [step, setStep] = useState<'input' | 'review'>('input');
  const [rows, setRows] = useState<AiRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [parseMut, { loading: parsing }] = useMutation<{ aiParseCrmLeads: string }>(AI_PARSE_CRM_LEADS);
  const [createMut, { loading: saving }] = useMutation(entity === 'VENUE_LEAD' ? CREATE_VENUE_LEAD : CREATE_HOST_LEAD);

  const close = () => { setText(''); setRows([]); setStep('input'); setError(null); onClose(); };

  const parse = async () => {
    setError(null);
    if (!text.trim()) { setError('Paste some text to parse first.'); return; }
    try {
      const res = await parseMut({ variables: { entity, text } });
      const raw = res.data?.aiParseCrmLeads;
      const parsed = raw ? JSON.parse(raw) : {};
      const records: any[] = Array.isArray(parsed) ? parsed : parsed.records ?? [];
      if (records.length === 0) throw new Error('No leads found in that text. Add more detail and retry.');
      setRows(records.map((r, i) => recordToRow(r, entity, i)));
      setStep('review');
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  const save = async () => {
    setError(null);
    let ok = 0;
    const next: AiRow[] = [];
    for (const row of rows) {
      const validation = rowError(row, entity);
      if (validation) { next.push({ ...row, _error: validation }); continue; }
      try {
        await createMut({ variables: { input: rowToInput(row, entity) } });
        ok += 1;
      } catch (e) {
        next.push({ ...row, _error: parseApiError(e) });
      }
    }
    setRows(next);
    if (ok > 0) onSaved(ok);
    if (next.length === 0) close();
    else setError(`${ok} created · ${next.length} need fixing (see Issue column).`);
  };

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth={step === 'review' ? 'lg' : 'sm'}>
      <DialogTitle>
        <Stack direction="row" spacing={1} alignItems="center"><AutoFixHighIcon color="secondary" /><span>{title}</span></Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5}>
          {error && <Alert severity={step === 'review' ? 'warning' : 'error'}>{error}</Alert>}
          {step === 'input' ? (
            <>
              <Typography variant="body2" color="text.secondary">
                Paste text describing one or more {entity === 'VENUE_LEAD' ? 'venues' : 'hosts'} — a list, a brief,
                multiple messages. We'll extract each as a row you can edit before saving.
              </Typography>
              <TextField label="Paste text here" multiline minRows={8} maxRows={16} fullWidth value={text} onChange={(e) => setText(e.target.value)} />
            </>
          ) : (
            <>
              <Typography variant="body2" color="text.secondary">
                {rows.length} record{rows.length === 1 ? '' : 's'} found. Edit any cell, then Confirm & save.
              </Typography>
              <AiRecordsTable entity={entity} rows={rows} onChange={setRows} />
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={close} disabled={parsing || saving}>Cancel</Button>
        {step === 'input' ? (
          <Button variant="contained" onClick={parse} disabled={parsing} startIcon={<AutoFixHighIcon />}>
            {parsing ? 'Parsing…' : 'Parse'}
          </Button>
        ) : (
          <>
            <Button onClick={() => setStep('input')} disabled={saving}>Back</Button>
            <Button variant="contained" onClick={save} disabled={saving || rows.length === 0}>
              {saving ? 'Saving…' : `Confirm & save ${rows.length}`}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
