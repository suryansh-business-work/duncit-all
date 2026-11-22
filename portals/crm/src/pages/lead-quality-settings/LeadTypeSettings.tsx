import { useCallback, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, Card, CardContent, CircularProgress, Stack } from '@mui/material';
import type { CrmLeadQualitySettings, QueryCrmLeadQualitySettingsArgs } from '@duncit/gql-types';
import { DuncitButton } from '@duncit/buttons';
import { fireAndForget, logs } from '@duncit/logs';
import { useTranslation } from '@duncit/shell';
import { parseApiError } from '@duncit/utils';
import { LEAD_QUALITY_SETTINGS } from '../../api/leadQuality.gql';
import type { CrmLeadEntityType } from '../../api/crm.types';
import { LeadQualityConfigForm, type LeadQualitySubmission } from '../../forms/lead-quality-config';
import ChangeLogTable from './ChangeLogTable';
import ConfigHeader from './ConfigHeader';
import SettingsConfirmDialog, { type PendingConfirm } from './SettingsConfirmDialog';
import { useLeadQualityActions } from './useLeadQualityActions';
import VersionHistoryTable from './VersionHistoryTable';

const PAGE = 'LeadQualitySettings';
const run = (promise: Promise<unknown>, step: string) => fireAndForget(promise, logs.portal.crm, PAGE, step);

/**
 * One lead type's scoring model: the version in use, the draft being edited
 * (or the published version read-only, with Edit to start a draft), the
 * version history and the settings change log.
 */
export default function LeadTypeSettings({ leadType }: Readonly<{ leadType: CrmLeadEntityType }>) {
  const { t } = useTranslation();
  const { data, loading, error, refetch } = useQuery<{ crmLeadQualitySettings: CrmLeadQualitySettings }, QueryCrmLeadQualitySettingsArgs>(
    LEAD_QUALITY_SETTINGS,
    { variables: { lead_type: leadType }, fetchPolicy: 'cache-and-network' },
  );
  const actions = useLeadQualityActions(leadType);
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const restore = useCallback((version: number) => setPending({ kind: 'restore', version }), []);
  const settings = data?.crmLeadQualitySettings;

  if (loading && !settings) {
    return (
      <Stack sx={{ alignItems: 'center', py: 6 }}>
        <CircularProgress aria-label={t('crm.leadQualitySettings.loading')} />
      </Stack>
    );
  }
  if (!settings) {
    return (
      <Alert
        severity="error"
        action={
          <DuncitButton size="small" onClick={() => run(refetch(), 'retry')}>
            {t('shell.common.retry')}
          </DuncitButton>
        }
      >
        {error ? parseApiError(error) : t('crm.leadQualitySettings.loadFailed')}
      </Alert>
    );
  }

  const { draft, published } = settings;
  const config = draft ?? published;
  const reload = () => {
    actions.clearFailure();
    run(refetch(), 'reload');
  };

  const confirm = async () => {
    if (pending?.kind === 'publish' && draft) await actions.publish(pending.submission, draft);
    else if (pending?.kind === 'discard') await actions.discard();
    else if (pending?.kind === 'restore') await actions.startFrom(pending.version);
    setPending(null);
  };

  return (
    <Stack spacing={3}>
      <ConfigHeader
        settings={settings}
        busy={actions.busy}
        onEdit={() => run(actions.startFrom(published.version), 'edit')}
        onDiscard={() => {
          if (draft) setPending({ kind: 'discard', version: draft.version });
        }}
      />
      {actions.failure && (
        <Alert
          severity="error"
          onClose={actions.clearFailure}
          action={
            actions.failure.conflict ? (
              <DuncitButton size="small" onClick={reload} data-testid="lead-quality-reload">
                {t('crm.leadQualitySettings.reload')}
              </DuncitButton>
            ) : undefined
          }
          data-testid="lead-quality-failure"
        >
          {actions.failure.message}
        </Alert>
      )}
      <Card variant="outlined" sx={{ boxShadow: 'none' }}>
        <CardContent>
          <LeadQualityConfigForm
            key={`${config.id}:${config.revision}:${config.status}`}
            config={config}
            readOnly={!draft}
            busy={actions.busy}
            serverIssues={actions.serverIssues}
            onSaveDraft={(submission) => run(actions.saveDraft(submission, draft?.revision ?? null), 'saveDraft')}
            onPublish={(submission: LeadQualitySubmission) => setPending({ kind: 'publish', version: config.version, submission })}
          />
        </CardContent>
      </Card>
      <VersionHistoryTable leadType={leadType} busy={actions.busy} onRestore={restore} />
      <ChangeLogTable leadType={leadType} />
      <SettingsConfirmDialog
        pending={pending}
        leadType={leadType}
        busy={actions.busy}
        onConfirm={() => run(confirm(), pending?.kind ?? 'confirm')}
        onClose={() => setPending(null)}
      />
    </Stack>
  );
}
