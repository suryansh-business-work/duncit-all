import { useState } from 'react';
import { fireAndForget, logs } from '@duncit/logs';

import { AuthAlert } from '@/screens/auth/AuthAlert';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { CalendarEvent } from '@/features/reminders/calendarView';
import { CUSTOM_DUE, ReminderForm, reminderDueDate, type ReminderValues } from '@/forms/reminder';
import { CrmAppToggleReminderDocument } from '@/graphql/reminders';
import {
  CrmAppDeleteReminderDocument,
  CrmAppUpdateReminderDocument,
} from '@/graphql/remindersExtra';
import { useTranslation } from '@/hooks/useTranslation';
import { LeadListSheet } from '@/screens/leads/LeadListSheet';
import { gqlRequest } from '@/services/graphql.client';
import { errorMessage } from '@/utils/errors';
import { RemindersEventDetails } from './RemindersEventDetails';
import type { ReminderItem } from './ReminderRow';

const SCOPE = 'crm-app/RemindersEventSheet';

interface Props {
  /** The event to show; closed while null. */
  event: CalendarEvent<ReminderItem> | null;
  onClose: () => void;
  /** A reminder was ticked, edited or deleted: the calendar reloads. */
  onChanged: () => void;
  onOpenLead: (event: CalendarEvent<ReminderItem>) => void;
}

/**
 * A calendar event's sheet: its details, Open lead, and for a reminder Mark
 * done / pending, Edit (any date and time) and Delete — the portal's drawer
 * and reminder dialog.
 */
export function RemindersEventSheet({ event, onClose, onChanged, onOpenLead }: Readonly<Props>) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'details' | 'edit'>('details');
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reminder = event?.reminder;

  const close = () => {
    setMode('details');
    setConfirming(false);
    setError(null);
    onClose();
  };
  /** Run a change to the reminder, then reload the calendar and close; a failure stays on the sheet. */
  const change = async (run: (id: string) => Promise<unknown>) => {
    if (!reminder) return;
    setBusy(true);
    setError(null);
    try {
      await run(reminder.id);
      onChanged();
      close();
    } catch (err) {
      setError(errorMessage(err, t('crmApp.common.saveFailed')));
    } finally {
      setBusy(false);
    }
  };
  const save = (values: ReminderValues) =>
    change((id) =>
      gqlRequest(CrmAppUpdateReminderDocument, {
        id,
        input: {
          title: values.title,
          due_at: reminderDueDate(values).toISOString(),
          notes: values.notes,
        },
      }),
    );

  return (
    <LeadListSheet
      open={event !== null}
      title={mode === 'edit' ? t('crm.components.editReminder') : (event?.title ?? '')}
      onClose={close}
      busy={busy}
      testID="event-sheet"
    >
      {error && mode === 'details' ? <AuthAlert message={error} testID="event-error" /> : null}
      {event && mode === 'details' ? (
        <RemindersEventDetails
          event={event}
          busy={busy}
          onOpenLead={() => {
            close();
            onOpenLead(event);
          }}
          onToggle={() =>
            fireAndForget(
              change((id) => gqlRequest(CrmAppToggleReminderDocument, { id })),
              logs.mobileApp,
              SCOPE,
              'toggle',
            )
          }
          onEdit={() => setMode('edit')}
          onDelete={() => setConfirming(true)}
        />
      ) : null}
      {reminder && mode === 'edit' ? (
        <ReminderForm
          initialValues={{
            title: reminder.title,
            due: CUSTOM_DUE,
            at: new Date(reminder.due_at),
            notes: reminder.notes ?? '',
          }}
          submitLabel={t('shell.common.save')}
          onSubmit={save}
          error={error}
        />
      ) : null}
      <ConfirmDialog
        open={confirming}
        title={t('crm.components.deleteReminder')}
        message={t('crm.calendar.deleteMessage', { vars: { title: reminder?.title ?? '' } })}
        confirmLabel={t('shell.common.delete')}
        cancelLabel={t('shell.common.cancel')}
        danger
        busy={busy}
        error={error}
        onConfirm={() =>
          fireAndForget(
            change((id) => gqlRequest(CrmAppDeleteReminderDocument, { id })),
            logs.mobileApp,
            SCOPE,
            'delete',
          )
        }
        onCancel={() => setConfirming(false)}
        testID="event-delete-dialog"
      />
    </LeadListSheet>
  );
}
