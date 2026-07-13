import { useEffect, useState } from 'react';
import { useMutation } from '@apollo/client';
import { Alert, Button, Stack, TextField } from '@mui/material';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import {
  CALL_ECOMM_LEAD,
  CALL_HOST_LEAD,
  CALL_VENUE_LEAD,
  EMAIL_ECOMM_LEAD,
  EMAIL_HOST_LEAD,
  EMAIL_VENUE_LEAD,
} from '../api/crm.gql';
import { parseApiError } from '../utils/parseApiError';
import CommsProviderSelect from './CommsProviderSelect';
import ComposeWindow from './compose/ComposeWindow';
import EmailComposeFields, { type EmailPayload } from './compose/EmailComposeFields';

type Mode = 'email' | 'call';

type EntityKind = 'VENUE_LEAD' | 'HOST_LEAD' | 'ECOMM_LEAD';

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
  /** Slug → value map from the full lead, used to auto-fill template variables. */
  variableValues?: Record<string, string>;
  onClose: () => void;
  onResult: (message: string, ok: boolean) => void;
}

const EMAIL_MUTATIONS = { VENUE_LEAD: EMAIL_VENUE_LEAD, HOST_LEAD: EMAIL_HOST_LEAD, ECOMM_LEAD: EMAIL_ECOMM_LEAD } as const;
const CALL_MUTATIONS = { VENUE_LEAD: CALL_VENUE_LEAD, HOST_LEAD: CALL_HOST_LEAD, ECOMM_LEAD: CALL_ECOMM_LEAD } as const;
const EMAIL_KEYS = { VENUE_LEAD: 'emailVenueLeadContact', HOST_LEAD: 'emailHostLeadContact', ECOMM_LEAD: 'emailEcommLeadContact' } as const;
const CALL_KEYS = { VENUE_LEAD: 'callVenueLeadContact', HOST_LEAD: 'callHostLeadContact', ECOMM_LEAD: 'callEcommLeadContact' } as const;

const mutationFor = (entity: EntityKind, mode: Mode) => {
  if (mode === 'email') return EMAIL_MUTATIONS[entity];
  return CALL_MUTATIONS[entity];
};

const responseKey = (entity: EntityKind, mode: Mode) => {
  if (mode === 'email') return EMAIL_KEYS[entity];
  return CALL_KEYS[entity];
};

export default function ContactComposeDialog({ open, mode, entity, lead, variableValues, onClose, onResult }: Readonly<Props>) {
  const [target, setTarget] = useState('');
  const [defaultSubject, setDefaultSubject] = useState('');
  const [emailPayload, setEmailPayload] = useState<EmailPayload>({ subject: '', body: '', valid: false, attachments: [] });
  const [providerId, setProviderId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [runMutation, { loading }] = useMutation(mutationFor(entity, mode));

  useEffect(() => {
    if (!open || !lead) return;
    setError(null);
    setTarget(mode === 'email' ? lead.primary_email ?? '' : lead.primary_mobile ?? '');
    setDefaultSubject(`Regarding ${lead.display_name}`);
    setEmailPayload({ subject: '', body: '', valid: false, attachments: [] });
  }, [open, mode, lead]);

  const submit = async () => {
    if (!lead) return;
    setError(null);
    try {
      const variables: Record<string, unknown> = { id: lead.id, provider_id: providerId || null };
      if (mode === 'email') {
        variables.contact_email = target;
        variables.subject = emailPayload.subject || defaultSubject;
        variables.body = emailPayload.body;
        variables.attachments = emailPayload.attachments.map(({ url, name }) => ({ url, name }));
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

  const providerType: 'SMTP' | 'TWILIO_CALL' = mode === 'email' ? 'SMTP' : 'TWILIO_CALL';
  const disabled = loading || !target.trim() || (mode === 'email' && !emailPayload.valid);
  const submitLabel = mode === 'email' ? 'Send email' : 'Start call';

  return (
    <ComposeWindow
      open={open}
      title={mode === 'email' ? `Email · ${lead?.display_name ?? ''}` : `Call · ${lead?.display_name ?? ''}`}
      icon={mode === 'email' ? <EmailIcon fontSize="small" /> : <PhoneIcon fontSize="small" />}
      onClose={onClose}
      actions={
        <>
          <Button onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant="contained" onClick={submit} disabled={disabled}>
            {loading ? 'Sending…' : submitLabel}
          </Button>
        </>
      }
    >
      <Stack spacing={1.5}>
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
          <EmailComposeFields
            entity={entity}
            leadName={lead?.display_name ?? ''}
            leadEmail={target}
            variableValues={variableValues ?? {}}
            defaultSubject={defaultSubject}
            onChange={setEmailPayload}
          />
        )}
      </Stack>
    </ComposeWindow>
  );
}
