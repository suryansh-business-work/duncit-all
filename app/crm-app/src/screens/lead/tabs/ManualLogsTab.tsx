import { useMemo, useState } from 'react';
import { XStack, YStack } from 'tamagui';
import { fireAndForget, logs as appLogs } from '@duncit/logs';
import {
  CRM_LOG_GRANULARITIES,
  CRM_LOG_GRANULARITY_LABEL,
  crmGroupLogs,
  crmLogHistory,
  type CrmLogGranularity,
} from '@duncit/utils';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DuncitButton } from '@/components/DuncitButton';
import { SelectChip } from '@/components/mobile/SelectChip';
import { StateView } from '@/components/StateView';
import { ManualLogForm, manualLogDefaults, type ManualLogValues } from '@/forms/manual-log';
import { useTranslation } from '@/hooks/useTranslation';
import { errorMessage } from '@/utils/errors';
import { parseManualLogHtml } from './ManualLogsHtml';
import { ManualLogsHistory } from './ManualLogsHistory';
import { ManualLogsList } from './ManualLogsList';
import { PersonSheet, type LogPeople } from './ManualLogsPeople';
import { useManualLogs, type LogActivity } from './ManualLogsState';
import { TabAlert } from './TabAlert';
import type { LeadTabProps } from './TabsBTypes';

type Mode = { kind: 'closed' } | { kind: 'new' } | { kind: 'edit'; log: LogActivity };

/** A log as the composer edits it: its title, its text and the people it tags. */
function valuesOf(log: LogActivity): ManualLogValues {
  const parsed = parseManualLogHtml(log.body_html);
  return {
    summary: log.summary ?? '',
    body: parsed.text || (log.body_text ?? ''),
    mentions: parsed.mentions,
  };
}

/**
 * The lead's Manual Logs — notes the team captures, grouped by day, newest
 * first, in a chosen time window: write one (tagging teammates with @),
 * edit or delete your own, open who wrote what, and read every log's
 * Created / Updated / Deleted history. Every lead kind has it.
 */
export function ManualLogsTab({ kind, id, onChanged }: Readonly<LeadTabProps>) {
  const { t } = useTranslation();
  const data = useManualLogs(kind, id, onChanged);
  const [mode, setMode] = useState<Mode>({ kind: 'closed' });
  const [range, setRange] = useState<CrmLogGranularity>('all');
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<LogActivity | null>(null);
  const [personId, setPersonId] = useState<string | null>(null);
  const groups = useMemo(() => crmGroupLogs(data.activities, range), [data.activities, range]);
  const history = useMemo(() => crmLogHistory(data.activities, range), [data.activities, range]);
  const people: LogPeople = useMemo(() => ({ byId: data.byId, onOpen: setPersonId }), [data.byId]);

  if (data.loading || data.error) {
    return <StateView loading={data.loading} error={data.error} onRetry={data.refetch} />;
  }
  const open = (next: Mode) => {
    setError(null);
    setMode(next);
  };
  const submit = async (values: ManualLogValues) => {
    setError(null);
    try {
      if (mode.kind === 'edit' && mode.log.id) await data.update(mode.log.id, values);
      else await data.create(values);
      setMode({ kind: 'closed' });
    } catch (err) {
      setError(errorMessage(err, t('crmApp.common.saveFailed')));
    }
  };
  const remove = async (log: LogActivity) => {
    try {
      if (log.id) await data.remove(log.id);
    } catch (err) {
      setError(errorMessage(err, t('crmApp.common.saveFailed')));
    }
    setRemoving(null);
  };

  return (
    <YStack gap="$3" testID="manual-logs-tab">
      <XStack gap="$2" flexWrap="wrap" role="radiogroup" aria-label={t('crm.a11y.timeRange')}>
        {CRM_LOG_GRANULARITIES.map((value) => (
          <SelectChip
            key={value}
            label={t(CRM_LOG_GRANULARITY_LABEL[value])}
            onPress={() => setRange(value)}
            selected={range === value}
            testID={`manual-log-range-${value}`}
          />
        ))}
      </XStack>
      {mode.kind === 'closed' ? (
        <DuncitButton
          label={t('crm.manualLogs.new')}
          onPress={() => open({ kind: 'new' })}
          fullWidth
          testID="manual-log-add"
        />
      ) : (
        <ManualLogForm
          key={mode.kind === 'edit' ? (mode.log.id ?? 'edit') : 'new'}
          values={mode.kind === 'edit' ? valuesOf(mode.log) : manualLogDefaults}
          editing={mode.kind === 'edit'}
          busy={data.saving}
          error={error}
          onSubmit={submit}
          onCancel={() => open({ kind: 'closed' })}
        />
      )}
      {error && mode.kind === 'closed' ? (
        <TabAlert tone="danger" onClose={() => setError(null)} testID="manual-log-tab-error">
          {error}
        </TabAlert>
      ) : null}
      <ManualLogsList
        groups={groups}
        people={people}
        onEdit={(log) => open({ kind: 'edit', log })}
        onDelete={setRemoving}
      />
      <ManualLogsHistory entries={history} people={people} />
      <ConfirmDialog
        open={Boolean(removing)}
        title={t('crm.manualLogs.deleteTitle')}
        message={t('crm.manualLogs.deleteMessage')}
        confirmLabel={t('shell.common.delete')}
        cancelLabel={t('shell.common.cancel')}
        danger
        busy={data.deleting}
        onConfirm={() => {
          if (removing)
            fireAndForget(remove(removing), appLogs.mobileApp, 'crm-app/ManualLogsTab', 'delete');
        }}
        onCancel={() => setRemoving(null)}
        testID="manual-log-delete-confirm"
      />
      <PersonSheet
        user={
          personId
            ? (data.byId.get(personId) ?? {
                id: personId,
                name: '',
                email: null,
                roles: [],
                is_staff: false,
              })
            : null
        }
        onClose={() => setPersonId(null)}
      />
    </YStack>
  );
}
