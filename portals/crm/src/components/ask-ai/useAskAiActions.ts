import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { crmLeadAiReminderUpdate, parseApiError } from '@duncit/utils';
import type { CrmLeadAiActionStatus } from '@duncit/gql-types';
import { CREATE_CRM_REMINDER, CRM_REMINDERS, UPDATE_CRM_REMINDER, type ReminderEntity } from '../../api/reminders.gql';
import type { AskAiAction, AskAiMessage } from '../../api/askAi.gql';

/** Which proposal a dialog is open for. */
export interface ActionRef {
  messageId: string;
  index: number;
  action: AskAiAction;
}

interface Options {
  entity: ReminderEntity;
  leadId: string;
  setActionStatus: (messageId: string, index: number, status: CrmLeadAiActionStatus, resultMessage?: string) => Promise<void>;
  onChanged: () => void;
}

/** Only the fields the assistant proposed to change (@duncit/utils, shared with the Duncit CRM app). */
const updateInput = (action: AskAiAction) => crmLeadAiReminderUpdate(action);

/**
 * Carries out the assistant's proposals with the CRM's own mutations — the
 * same reminder calls as the Reminders tab and the same email composer as the
 * lead's Email button — then records the outcome on the thread.
 */
export function useAskAiActions({ entity, leadId, setActionStatus, onChanged }: Options) {
  const refetchQueries = [{ query: CRM_REMINDERS, variables: { filter: { entity_type: entity, lead_id: leadId } } }];
  const [createMut] = useMutation(CREATE_CRM_REMINDER, { refetchQueries });
  const [updateMut] = useMutation(UPDATE_CRM_REMINDER, { refetchQueries });
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [emailFor, setEmailFor] = useState<ActionRef | null>(null);
  const [reminderFor, setReminderFor] = useState<ActionRef | null>(null);

  const keyOf = (ref: { messageId: string; index: number }) => `${ref.messageId}:${ref.index}`;

  const run = async (ref: ActionRef, work: () => Promise<unknown>) => {
    setBusyKey(keyOf(ref));
    setError(null);
    try {
      await work();
      await setActionStatus(ref.messageId, ref.index, 'DONE');
      onChanged();
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setBusyKey(null);
    }
  };

  const createReminder = (ref: ActionRef) =>
    run(ref, () =>
      createMut({
        variables: {
          input: { entity_type: entity, lead_id: leadId, title: ref.action.title, due_at: ref.action.due_at, notes: ref.action.notes ?? '' },
        },
      })
    );

  const applyUpdate = (ref: ActionRef) =>
    run(ref, () => updateMut({ variables: { id: ref.action.reminder_id, input: updateInput(ref.action) } }));

  const dismiss = async (ref: ActionRef) => {
    setBusyKey(keyOf(ref));
    await setActionStatus(ref.messageId, ref.index, 'DISMISSED');
    setBusyKey(null);
  };

  /** The email composer reported back: record a sent draft, leave a failed one proposed for another try. */
  const emailResult = async (message: string, ok: boolean) => {
    const ref = emailFor;
    if (!ref) return;
    if (!ok) {
      setError(message);
      return;
    }
    await setActionStatus(ref.messageId, ref.index, 'DONE', message);
    onChanged();
  };

  const reminderSaved = async () => {
    const ref = reminderFor;
    setReminderFor(null);
    if (!ref) return;
    await setActionStatus(ref.messageId, ref.index, 'DONE');
    onChanged();
  };

  const refsOf = (m: AskAiMessage) => m.actions.map((action, index) => ({ messageId: m.id, index, action }));

  return {
    error,
    isBusy: (ref: ActionRef) => busyKey === keyOf(ref),
    refsOf,
    createReminder,
    applyUpdate,
    dismiss,
    emailFor,
    openEmail: setEmailFor,
    closeEmail: () => setEmailFor(null),
    emailResult,
    reminderFor,
    openReminder: setReminderFor,
    closeReminder: () => setReminderFor(null),
    reminderSaved,
  };
}
