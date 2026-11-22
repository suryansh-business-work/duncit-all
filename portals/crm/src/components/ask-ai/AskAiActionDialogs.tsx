import type { CrmLeadEntityType } from '../../api/crm.types';
import { CRM_REMINDERS } from '../../api/reminders.gql';
import ContactComposeDialog from '../ContactComposeDialog';
import ReminderFormDialog from '../reminders-tab/ReminderFormDialog';
import type { useAskAiActions } from './useAskAiActions';
import { fireAndForget, logs } from '@duncit/logs';

/** The lead details the drawer needs to address an email and to file a reminder. */
export interface AskAiLead {
  id: string;
  display_name: string;
  primary_email?: string | null;
  primary_mobile?: string | null;
}

interface Props {
  entity: CrmLeadEntityType;
  lead: AskAiLead;
  variableValues?: Record<string, string>;
  actions: ReturnType<typeof useAskAiActions>;
}

/**
 * The lead page's own email composer and reminder dialog, opened from a
 * proposal: the agent edits the draft there and it is sent or saved exactly as
 * if they had written it by hand.
 */
export default function AskAiActionDialogs({ entity, lead, variableValues, actions }: Readonly<Props>) {
  const refetchQueries = [{ query: CRM_REMINDERS, variables: { filter: { entity_type: entity, lead_id: lead.id } } }];
  return (
    <>
      <ContactComposeDialog
        open={!!actions.emailFor}
        mode="email"
        entity={entity}
        lead={lead}
        variableValues={variableValues}
        draft={actions.emailFor?.action ?? null}
        onClose={actions.closeEmail}
        onResult={(message, ok) => fireAndForget(actions.emailResult(message, ok), logs.portal.crm, 'AskAiActionDialogs', 'emailResult')}
      />
      <ReminderFormDialog
        open={!!actions.reminderFor}
        entity={entity}
        leadId={lead.id}
        reminder={null}
        draft={actions.reminderFor?.action ?? null}
        refetchQueries={refetchQueries}
        onClose={actions.closeReminder}
        onSaved={() => fireAndForget(actions.reminderSaved(), logs.portal.crm, 'AskAiActionDialogs', 'reminderSaved')}
      />
    </>
  );
}
