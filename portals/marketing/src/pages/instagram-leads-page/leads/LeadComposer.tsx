import { useMutation, useQuery } from '@apollo/client/react';
import { Alert } from '@mui/material';
import { notify } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import {
  DRAFT_IG_LEAD_MESSAGE,
  IG_LEAD_SETTINGS,
  MARK_IG_LEAD_SENT,
  type IgLead,
  type IgLeadSettings,
} from '../queries';
import { LeadMessageForm, type LeadMessageFormValues } from '../lead-message-form';

/** The sent-today count on the page moves with every send. */
const REFRESH = ['IgLeadSettings'];

interface Props {
  lead: IgLead;
  onChanged: (lead: IgLead) => void;
}

/** The lead's next message, or a note that every follow-up has gone. */
export default function LeadComposer({ lead, onChanged }: Readonly<Props>) {
  const { t } = useTranslation();
  const { data } = useQuery<{ igLeadSettings: IgLeadSettings }>(IG_LEAD_SETTINGS, { fetchPolicy: 'cache-first' });
  const [draftMut, { loading: drafting }] = useMutation<{ draftIgLeadMessage: IgLead }>(DRAFT_IG_LEAD_MESSAGE);
  const [sentMut, { loading: sending }] = useMutation<{ markIgLeadSent: IgLead }>(MARK_IG_LEAD_SENT, { refetchQueries: REFRESH });
  const maxFollowUps = data?.igLeadSettings.max_follow_ups ?? null;
  const step = lead.messages.length;

  if (maxFollowUps !== null && step > maxFollowUps) {
    return <Alert severity="info">{t('marketing.igLeads.allFollowUpsSent')}</Alert>;
  }

  const draft = async () => {
    try {
      const { data: drafted } = await draftMut({ variables: { id: lead.id } });
      if (drafted) onChanged(drafted.draftIgLeadMessage);
    } catch (err) {
      notify(parseApiError(err), 'error');
    }
  };

  const send = async (values: LeadMessageFormValues) => {
    try {
      const { data: sent } = await sentMut({ variables: { id: lead.id, text: values.text } });
      if (sent) onChanged(sent.markIgLeadSent);
    } catch (err) {
      notify(parseApiError(err), 'error');
    }
  };

  const stepLabel =
    step === 0
      ? t('marketing.igLeads.stepOpener')
      : t('marketing.igLeads.stepFollowUp', { vars: { step, max: maxFollowUps ?? step } });

  return (
    <LeadMessageForm
      // A new draft or a new step starts the box afresh.
      key={`${lead.id}:${step}:${lead.draft}`}
      draft={lead.draft}
      stepLabel={stepLabel}
      chatUrl={`https://ig.me/m/${lead.username}`}
      drafting={drafting}
      sending={sending}
      onDraft={draft}
      onSend={send}
    />
  );
}
