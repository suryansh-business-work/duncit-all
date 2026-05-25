import { useEffect, useState } from 'react';
import { useMutation } from '@apollo/client';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from '@mui/material';
import { CALL_VENUE_LEAD, EMAIL_VENUE_LEAD } from '../../api/crm.gql';
import type { VenueLead } from '../../api/crm.types';
import { parseApiError } from '../../utils/parseApiError';

interface Props {
  open: boolean;
  mode: 'email' | 'call';
  lead: VenueLead | null;
  onClose: () => void;
  onResult: (message: string, ok: boolean) => void;
}

export default function VobizContactDialog({ open, mode, lead, onClose, onResult }: Props) {
  const primary = lead?.contacts?.[0];
  const [target, setTarget] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [emailLead, { loading: emailing }] = useMutation(EMAIL_VENUE_LEAD);
  const [callLead, { loading: calling }] = useMutation(CALL_VENUE_LEAD);
  const loading = emailing || calling;

  useEffect(() => {
    if (!open) return;
    setError(null);
    setTarget(mode === 'email' ? primary?.email ?? '' : primary?.mobile_number ?? '');
    setSubject(`Regarding ${lead?.venue_name ?? 'your venue'}`);
    setBody('');
  }, [open, mode, lead, primary]);

  const submit = async () => {
    if (!lead) return;
    setError(null);
    try {
      const res =
        mode === 'email'
          ? await emailLead({ variables: { id: lead.id, contact_email: target, subject, body } })
          : await callLead({ variables: { id: lead.id, contact_number: target } });
      const payload = mode === 'email' ? res.data?.emailVenueLeadContact : res.data?.callVenueLeadContact;
      onResult(payload?.message ?? 'Done', !!payload?.ok);
      onClose();
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{mode === 'email' ? 'Send email via Vobiz' : 'Call via Vobiz'}</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ mt: 0.5 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            size="small"
            label={mode === 'email' ? 'To (email)' : 'To (number)'}
            value={target}
            onChange={(event) => setTarget(event.target.value)}
            fullWidth
          />
          {mode === 'email' && (
            <>
              <TextField size="small" label="Subject" value={subject} onChange={(event) => setSubject(event.target.value)} fullWidth />
              <TextField size="small" label="Message" value={body} onChange={(event) => setBody(event.target.value)} fullWidth multiline minRows={4} />
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={loading || !target.trim() || (mode === 'email' && !subject.trim())}>
          {loading ? 'Sending…' : mode === 'email' ? 'Send email' : 'Start call'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
