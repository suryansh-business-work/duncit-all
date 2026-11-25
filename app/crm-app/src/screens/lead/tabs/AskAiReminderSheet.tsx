import { useState } from 'react';

import { CUSTOM_DUE, ReminderForm, reminderDueDate, type ReminderValues } from '@/forms/reminder';
import { CrmAppCreateReminderDocument } from '@/graphql/reminders';
import type { LeadKind } from '@/features/leads/leadKinds';
import { useTranslation } from '@/hooks/useTranslation';
import { gqlRequest } from '@/services/graphql.client';
import { errorMessage } from '@/utils/errors';
import type { AskAiAction } from './AskAiState';
import { TabSheet } from './TabSheet';

interface Props {
  kind: LeadKind;
  id: string;
  /** The proposal being edited; closed while null. */
  draft: AskAiAction | null;
  onClose: () => void;
  onSaved: () => void;
}

/** A proposal's start values: its title, its due time (when it named one) and notes. */
const valuesOf = (draft: AskAiAction): Partial<ReminderValues> => ({
  title: draft.title ?? '',
  ...(draft.due_at ? { due: CUSTOM_DUE, at: new Date(draft.due_at) } : {}),
  notes: draft.notes ?? '',
});

/** "Edit" on a proposed reminder: the lead's own reminder form, filled in, saved as a new reminder. */
export function AskAiReminderSheet({ kind, id, draft, onClose, onSaved }: Readonly<Props>) {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const submit = async (values: ReminderValues) => {
    setError(null);
    try {
      await gqlRequest(CrmAppCreateReminderDocument, {
        input: {
          entity_type: kind,
          lead_id: id,
          title: values.title,
          due_at: reminderDueDate(values).toISOString(),
          notes: values.notes || null,
        },
      });
      onSaved();
    } catch (err) {
      setError(errorMessage(err, t('crmApp.common.saveFailed')));
    }
  };
  return (
    <TabSheet
      open={Boolean(draft)}
      title={t('crm.askAi.newReminder')}
      onClose={() => {
        setError(null);
        onClose();
      }}
      testID="ask-ai-reminder"
    >
      {draft ? (
        <ReminderForm initialValues={valuesOf(draft)} onSubmit={submit} error={error} />
      ) : null}
    </TabSheet>
  );
}
