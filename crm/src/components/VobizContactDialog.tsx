import { useEffect, useState } from 'react';
import { useMutation } from '@apollo/client';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from '@mui/material';
import {
  CALL_HOST_LEAD,
  CALL_VENUE_LEAD,
  EMAIL_HOST_LEAD,
  EMAIL_VENUE_LEAD,
} from '../api/crm.gql';
import { parseApiError } from '../utils/parseApiError';
import CommsProviderSelect from './CommsProviderSelect';

type Mode = 'email' | 'call';

type EntityKind = 'VENUE_LEAD' | 'HOST_LEAD';

interface BasicLead {
  id: string;
  display_name: string;
  primary_email?: string | null;
  primary_mobile?: string | null;
}

interface Props {
  open: boolean;
  mode: Mode;
  entity: EntityKind;
  lead: BasicLead | null;
  onClose: () => void;
  onResult: (message: string, ok: boolean) => void;
}

const mutationFor = (entity: EntityKind, mode: Mode) => {
  if (mode === 'email') return entity === 'VENUE_LEAD' ? EMAIL_VENUE_LEAD : EMAIL_HOST_LEAD;
  return entity === 'VENUE_LEAD' ? CALL_VENUE_LEAD : CALL_HOST_LEAD;
};

const responseKey = (entity: EntityKind, mode: Mode) => {
  if (mode === 'email') return entity === 'VENUE_LEAD' ? 'emailVenueLeadContact' : 'emailHostLeadContact';
  return entity === 'VENUE_LEAD' ? 'callVenueLeadContact' : 'callHostLeadContact';
};

export default function VobizContactDialog({ open, mode, entity, lead, onClose, onResult }: Props) {
  const [target, setTarget] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [providerId, setProviderId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [runMutation, { loading }] = useMutation(mutationFor(entity, mode));

  useEffect(() => {
    if (!open || !lead) return;
    setError(null);
    setTarget(mode === 'email' ? lead.primary_email ?? '' : lead.primary_mobile ?? '');
    setSubject(`Regarding ${lead.display_name}`);
    setBody('');
  }, [open, mode, lead]);

  const submit = async () => {
    if (!lead) return;
    setError(null);
    try {
      const variables: Record<string, unknown> = { id: lead.id, provider_id: providerId || null };
      if (mode === 'email') {
        variables.contact_email = target;
        variables.subject = subject;
        variables.body = body;
      } else {
        variables.contact_number = target;
      }
      const res = await runMutation({ variables });
      const payload = res.data?.[responseKey(entity, mode)];
      onResult(payload?.message ?? 'Done', !!payload?.ok);
      onClose();
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  const providerType: 'VOBIZ_EMAIL' | 'VOBIZ_CALL' = mode === 'email' ? 'VOBIZ_EMAIL' : 'VOBIZ_CALL';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{mode === 'email' ? 'Send email' : 'Place call'}</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ mt: 0.5 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <CommsProviderSelect type={providerType} value={providerId} onChange={setProviderId} />
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
