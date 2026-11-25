import { useEffect, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Alert, Stack, TextField } from '@mui/material';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import { DuncitButton } from '@duncit/buttons';
import {
  CALL_ECOMM_LEAD,
  CALL_HOST_LEAD,
  CALL_VENUE_LEAD,
  EMAIL_ECOMM_LEAD,
  EMAIL_HOST_LEAD,
  EMAIL_VENUE_LEAD,
} from '../api/crm.gql';
import { CALL_CRM_LEAD, EMAIL_CRM_LEAD } from '../api/prospectLeads.gql';
import type { CrmLeadEntityType } from '../api/crm.types';
import { parseApiError } from '@duncit/utils';
import { isEmail } from '@duncit/regex';
import { EmailStatusBadge } from './email-status';
import CommsProviderSelect from './CommsProviderSelect';
import ComposeWindow from './compose/ComposeWindow';
import EmailComposeFields, { type EmailPayload } from './compose/EmailComposeFields';
import { useTranslation } from '@duncit/shell';

type Mode = 'email' | 'call';

type EntityKind = CrmLeadEntityType;
/** Kinds served by the generic emailCrmLeadContact / callCrmLeadContact mutations. */
const GENERIC = new Set<EntityKind>(['CREATOR_LEAD', 'COMMUNITY_LEAD']);

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
  /** An email already written (an Ask AI draft) to review, edit and send. */
  draft?: { to?: string | null; subject?: string | null; body_html?: string | null } | null;
  onClose: () => void;
  onResult: (message: string, ok: boolean) => void;
}

const EMAIL_MUTATIONS = {
  VENUE_LEAD: EMAIL_VENUE_LEAD,
  HOST_LEAD: EMAIL_HOST_LEAD,
  ECOMM_LEAD: EMAIL_ECOMM_LEAD,
  CREATOR_LEAD: EMAIL_CRM_LEAD,
  COMMUNITY_LEAD: EMAIL_CRM_LEAD,
} as const;
const CALL_MUTATIONS = {
  VENUE_LEAD: CALL_VENUE_LEAD,
  HOST_LEAD: CALL_HOST_LEAD,
  ECOMM_LEAD: CALL_ECOMM_LEAD,
  CREATOR_LEAD: CALL_CRM_LEAD,
  COMMUNITY_LEAD: CALL_CRM_LEAD,
} as const;
const EMAIL_KEYS = {
  VENUE_LEAD: 'emailVenueLeadContact',
  HOST_LEAD: 'emailHostLeadContact',
  ECOMM_LEAD: 'emailEcommLeadContact',
  CREATOR_LEAD: 'emailCrmLeadContact',
  COMMUNITY_LEAD: 'emailCrmLeadContact',
} as const;
const CALL_KEYS = {
  VENUE_LEAD: 'callVenueLeadContact',
  HOST_LEAD: 'callHostLeadContact',
  ECOMM_LEAD: 'callEcommLeadContact',
  CREATOR_LEAD: 'callCrmLeadContact',
  COMMUNITY_LEAD: 'callCrmLeadContact',
} as const;

const mutationFor = (entity: EntityKind, mode: Mode) => {
  if (mode === 'email') return EMAIL_MUTATIONS[entity];
  return CALL_MUTATIONS[entity];
};

const responseKey = (entity: EntityKind, mode: Mode) => {
  if (mode === 'email') return EMAIL_KEYS[entity];
  return CALL_KEYS[entity];
};

export default function ContactComposeDialog({ open, mode, entity, lead, variableValues, draft, onClose, onResult }: Readonly<Props>) {
  const { t } = useTranslation();
  const [target, setTarget] = useState('');
  const [defaultSubject, setDefaultSubject] = useState('');
  const [emailPayload, setEmailPayload] = useState<EmailPayload>({ subject: '', body: '', valid: false, attachments: [] });
  const [providerId, setProviderId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [runMutation, { loading }] = useMutation<any>(mutationFor(entity, mode));

  useEffect(() => {
    if (!open || !lead) return;
    setError(null);
    setTarget(mode === 'email' ? draft?.to || lead.primary_email || '' : lead.primary_mobile ?? '');
    setDefaultSubject(draft?.subject || t('crm.compose.regarding', { vars: { name: lead.display_name } }));
    setEmailPayload({ subject: '', body: '', valid: false, attachments: [] });
  }, [open, mode, lead, draft, t]);

  const submit = async () => {
    if (!lead) return;
    setError(null);
    try {
      const variables: Record<string, unknown> = { id: lead.id, provider_id: providerId || null };
      if (GENERIC.has(entity)) variables.entity_type = entity;
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
      onResult(payload?.message ?? t('crm.compose.done'), !!payload?.ok);
      onClose();
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  const providerType: 'SMTP' | 'TWILIO_CALL' = mode === 'email' ? 'SMTP' : 'TWILIO_CALL';
  const disabled = loading || !target.trim() || (mode === 'email' && !emailPayload.valid);
  const submitLabel = mode === 'email' ? t('crm.compose.sendEmail') : t('crm.compose.startCall');

  return (
    <ComposeWindow
      open={open}
      title={t(mode === 'email' ? 'crm.compose.emailTitle' : 'crm.call.title', { vars: { name: lead?.display_name ?? '' } })}
      icon={mode === 'email' ? <EmailIcon fontSize="small" /> : <PhoneIcon fontSize="small" />}
      onClose={onClose}
      actions={
        <>
          <DuncitButton onClick={onClose} disabled={loading}>{t('shell.common.cancel')}</DuncitButton>
          <DuncitButton variant="contained" onClick={submit} disabled={disabled}>
            {loading ? t('crm.compose.sending') : submitLabel}
          </DuncitButton>
        </>
      }
    >
      <Stack spacing={1.5}>
        {error && <Alert severity="error">{error}</Alert>}
        <CommsProviderSelect type={providerType} value={providerId} onChange={setProviderId} />
        <TextField
          size="small"
          label={mode === 'email' ? t('crm.compose.toEmail') : t('crm.compose.toNumber')}
          value={target}
          onChange={(event) => setTarget(event.target.value)}
          fullWidth
          slotProps={{
            input: {
              endAdornment:
                mode === 'email' && isEmail(target.trim()) ? <EmailStatusBadge email={target} /> : undefined,
            },
          }}
        />
        {mode === 'email' && (
          <EmailComposeFields
            entity={entity}
            leadName={lead?.display_name ?? ''}
            leadEmail={target}
            variableValues={variableValues ?? {}}
            defaultSubject={defaultSubject}
            initialBody={draft?.body_html ?? undefined}
            onChange={setEmailPayload}
          />
        )}
      </Stack>
    </ComposeWindow>
  );
}
