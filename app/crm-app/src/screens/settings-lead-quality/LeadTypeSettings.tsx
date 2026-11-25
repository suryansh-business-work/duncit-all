import { useCallback, useState } from 'react';
import { YStack } from 'tamagui';
import { fireAndForget, logs } from '@duncit/logs';

import { Card } from '@/components/Card';
import { DuncitButton } from '@/components/DuncitButton';
import { StatusBox } from '@/components/settings-editors/StatusBox';
import { StateView } from '@/components/StateView';
import { HISTORY_LIMIT } from '@/features/lead-quality-settings/editor';
import { useLeadQualityActions } from '@/features/lead-quality-settings/useLeadQualityActions';
import type { LeadKind } from '@/features/leads/leadKinds';
import { LeadQualityConfigForm } from '@/forms/lead-quality-config';
import {
  CrmAppLeadQualitySettingsDocument,
  CrmAppLeadQualitySettingsHistoryDocument,
  CrmAppLeadQualityVersionsDocument,
} from '@/graphql/leadQualitySettings';
import { useGqlQuery } from '@/hooks/useGqlQuery';
import { useTranslation } from '@/hooks/useTranslation';
import { ChangeLog } from './ChangeLog';
import { ConfigHeader } from './ConfigHeader';
import { ConfigSummary } from './ConfigSummary';
import { SettingsConfirm, type PendingConfirm } from './SettingsConfirm';
import { VersionHistory } from './VersionHistory';

const SCOPE = 'crm-app/LeadQualitySettings';
const run = (promise: Promise<unknown>, step: string) =>
  fireAndForget(promise, logs.mobileApp, SCOPE, step);

/**
 * One lead type's scoring model: the version in use, the draft being edited
 * (or the published version read-only, with Edit to start a draft), the
 * version history and the settings change log.
 */
export function LeadTypeSettings({
  leadType,
  typeLabel,
}: Readonly<{ leadType: LeadKind; typeLabel: string }>) {
  const { t } = useTranslation();
  const settingsQuery = useGqlQuery(
    CrmAppLeadQualitySettingsDocument,
    { lead_type: leadType },
    { fallbackError: t('crm.leadQualitySettings.loadFailed') },
  );
  const versionsQuery = useGqlQuery(
    CrmAppLeadQualityVersionsDocument,
    { lead_type: leadType },
    { fallbackError: t('crmApp.common.loadFailed') },
  );
  const historyQuery = useGqlQuery(
    CrmAppLeadQualitySettingsHistoryDocument,
    { lead_type: leadType, limit: HISTORY_LIMIT },
    { fallbackError: t('crmApp.common.loadFailed') },
  );
  const { refetch: refetchSettings } = settingsQuery;
  const { refetch: refetchVersions } = versionsQuery;
  const { refetch: refetchHistory } = historyQuery;
  const refresh = useCallback(
    () => Promise.all([refetchSettings(), refetchVersions(), refetchHistory()]),
    [refetchSettings, refetchVersions, refetchHistory],
  );
  const actions = useLeadQualityActions(leadType, refresh);
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const settings = settingsQuery.data?.crmLeadQualitySettings;

  if (!settings) {
    return (
      <StateView
        loading={settingsQuery.loading}
        error={settingsQuery.error}
        onRetry={settingsQuery.refetch}
      />
    );
  }
  const { draft, published } = settings;

  const confirm = async () => {
    if (pending?.kind === 'publish' && draft)
      await actions.publish(pending.submission, draft.revision);
    else if (pending?.kind === 'discard') await actions.discard();
    else if (pending?.kind === 'restore') await actions.startFrom(pending.version);
    setPending(null);
  };

  return (
    <YStack gap="$3">
      <ConfigHeader
        settings={settings}
        busy={actions.busy}
        onEdit={() => run(actions.startFrom(published.version), 'edit')}
        onDiscard={(version) => setPending({ kind: 'discard', version })}
      />
      {actions.notice ? (
        <StatusBox tone="success" message={actions.notice} testID="lead-quality-notice" />
      ) : null}
      {actions.failure ? (
        <StatusBox
          tone="danger"
          message={actions.failure.message}
          action={
            actions.failure.conflict ? (
              <DuncitButton
                label={t('crm.leadQualitySettings.reload')}
                onPress={() => run(actions.reload(), 'reload')}
                variant="outline"
                size="sm"
                testID="lead-quality-reload"
              />
            ) : undefined
          }
          testID="lead-quality-failure"
        />
      ) : null}
      <Card>
        {draft ? (
          <LeadQualityConfigForm
            key={`${draft.id}:${draft.revision}`}
            config={draft}
            busy={actions.busy}
            serverIssues={actions.serverIssues}
            onSaveDraft={(submission) =>
              run(actions.saveDraft(submission, draft.revision), 'saveDraft')
            }
            onPublish={(submission) =>
              setPending({ kind: 'publish', version: draft.version, submission })
            }
          />
        ) : (
          <ConfigSummary config={published} />
        )}
      </Card>
      <VersionHistory
        versions={versionsQuery.data?.crmLeadQualityVersions ?? []}
        loading={versionsQuery.loading}
        error={versionsQuery.error}
        busy={actions.busy}
        onRestore={(version) => setPending({ kind: 'restore', version })}
      />
      <ChangeLog
        changes={historyQuery.data?.crmLeadQualitySettingsHistory ?? []}
        loading={historyQuery.loading}
        error={historyQuery.error}
      />
      <SettingsConfirm
        pending={pending}
        typeLabel={typeLabel}
        busy={actions.busy}
        onConfirm={() => run(confirm(), pending?.kind ?? 'confirm')}
        onCancel={() => setPending(null)}
      />
    </YStack>
  );
}
