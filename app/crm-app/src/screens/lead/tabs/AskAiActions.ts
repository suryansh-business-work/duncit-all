import { useState } from 'react';
import { crmLeadAiReminderUpdate } from '@duncit/utils';

import { CrmAppCreateReminderDocument } from '@/graphql/reminders';
import { CrmAppUpdateReminderDocument } from '@/graphql/remindersExtra';
import type { LeadKind } from '@/features/leads/leadKinds';
import { useTranslation } from '@/hooks/useTranslation';
import { gqlRequest } from '@/services/graphql.client';
import { errorMessage } from '@/utils/errors';
import type { AskAiAction, AskAiActionStatus, AskAiMessage } from './AskAiState';

/** Which proposal a button or a sheet is for. */
export interface ActionRef {
  messageId: string;
  index: number;
  action: AskAiAction;
}

interface Options {
  kind: LeadKind;
  id: string;
  setActionStatus: (
    messageId: string,
    index: number,
    status: AskAiActionStatus,
    resultMessage?: string,
  ) => Promise<void>;
  onChanged: () => void;
}

const keyOf = (ref: { messageId: string; index: number }) => `${ref.messageId}:${ref.index}`;

/**
 * Carries out the assistant's proposals with the CRM's own mutations — the
 * Reminders tab's create and update, the lead's email composer — then records
 * the outcome on the thread. Nothing is sent or saved until the agent presses
 * a button on the proposal.
 */
export function useAskAiActions({ kind, id, setActionStatus, onChanged }: Options) {
  const { t } = useTranslation();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [emailFor, setEmailFor] = useState<ActionRef | null>(null);
  const [reminderFor, setReminderFor] = useState<ActionRef | null>(null);

  const run = async (ref: ActionRef, work: () => Promise<unknown>) => {
    setBusyKey(keyOf(ref));
    setError(null);
    try {
      await work();
      await setActionStatus(ref.messageId, ref.index, 'DONE');
      onChanged();
    } catch (err) {
      setError(errorMessage(err, t('crmApp.common.saveFailed')));
    } finally {
      setBusyKey(null);
    }
  };

  return {
    error,
    clearError: () => setError(null),
    isBusy: (ref: ActionRef) => busyKey === keyOf(ref),
    refsOf: (m: AskAiMessage): ActionRef[] =>
      m.actions.map((action, index) => ({ messageId: m.id, index, action })),
    createReminder: (ref: ActionRef) =>
      run(ref, () =>
        gqlRequest(CrmAppCreateReminderDocument, {
          input: {
            entity_type: kind,
            lead_id: id,
            title: ref.action.title ?? '',
            due_at: ref.action.due_at ?? '',
            notes: ref.action.notes ?? '',
          },
        }),
      ),
    applyUpdate: (ref: ActionRef) =>
      run(ref, () =>
        gqlRequest(CrmAppUpdateReminderDocument, {
          id: ref.action.reminder_id ?? '',
          input: crmLeadAiReminderUpdate(ref.action),
        }),
      ),
    dismiss: async (ref: ActionRef) => {
      setBusyKey(keyOf(ref));
      await setActionStatus(ref.messageId, ref.index, 'DISMISSED');
      setBusyKey(null);
    },
    emailFor,
    openEmail: setEmailFor,
    closeEmail: () => setEmailFor(null),
    /** The composer reported back: record a sent draft, leave a failed one proposed for another try. */
    emailResult: async (message: string, ok: boolean) => {
      const ref = emailFor;
      if (!ref) return;
      if (!ok) {
        setError(message);
        return;
      }
      await setActionStatus(ref.messageId, ref.index, 'DONE', message);
      onChanged();
    },
    reminderFor,
    openReminder: setReminderFor,
    closeReminder: () => setReminderFor(null),
    /** The edited reminder was saved: the proposal is done. */
    reminderSaved: async () => {
      const ref = reminderFor;
      setReminderFor(null);
      if (!ref) return;
      await setActionStatus(ref.messageId, ref.index, 'DONE');
      onChanged();
    },
  };
}
