import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Stack } from '@mui/material';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { DuncitTable } from '@duncit/table';
import { PageHeader, QueryGuard } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';
import { usePortalT } from '../../../shared/i18n';
import { useLiteSession } from '../../../shared/session';
import { RecipientDialog } from '../../components/recipient-dialog';
import { useClientTable } from '../../components/useClientTable';
import { LITE_EMAIL_TEMPLATES, LITE_SEND_TEST_EMAIL, LITE_UPDATE_EMAIL_TEMPLATE, type LiteEmailTemplate } from '../../graphql/email';
import type { LiteEnvTestResult } from '../../graphql/environment';
import { useAction } from '../../hooks/useAction';
import { buildTemplateColumns, templateRowId, templateSearchText } from './columns';
import { EmailTemplateForm, type EmailTemplateValues } from './email-template';

export function EmailTemplatesPage() {
  const { t } = usePortalT();
  const { me } = useLiteSession();
  const { data, loading, error, refetch } = useQuery<{ liteEmailTemplates: LiteEmailTemplate[] }>(LITE_EMAIL_TEMPLATES, { fetchPolicy: 'cache-and-network' });
  const rows = useMemo(() => data?.liteEmailTemplates ?? [], [data]);
  const reload = useCallback(() => {
    refetch().catch(() => undefined);
  }, [refetch]);
  const run = useAction(reload);
  const [update, updateState] = useMutation(LITE_UPDATE_EMAIL_TEMPLATE);
  const [sendTest, sendState] = useMutation<{ liteSendTestEmail: LiteEnvTestResult }>(LITE_SEND_TEST_EMAIL);
  const [editing, setEditing] = useState<LiteEmailTemplate | null>(null);
  const [testing, setTesting] = useState<LiteEmailTemplate | null>(null);

  const onToggle = useCallback(
    (row: LiteEmailTemplate, enabled: boolean) => {
      const vars = { vars: { name: row.name } };
      const done = enabled ? t('litePortal.emailTemplates.enabledOn', vars) : t('litePortal.emailTemplates.enabledOff', vars);
      return run(() => update({ variables: { key: row.key, input: { subject: row.subject, body: row.body, enabled } } }), done);
    },
    [run, t, update],
  );

  const columns = useMemo(() => buildTemplateColumns(t, { onEdit: setEditing, onSendTest: setTesting, onToggle }), [t, onToggle]);
  const { fetchRows, refetchRef } = useClientTable(rows, templateSearchText, columns);

  const onSubmit = async (values: EmailTemplateValues) => {
    if (!editing) return;
    const ok = await run(() => update({ variables: { key: editing.key, input: values } }), t('litePortal.emailTemplates.saved', { vars: { name: editing.name } }));
    if (ok) setEditing(null);
  };

  const onSendTest = async (to: string) => {
    if (!testing) return;
    try {
      const { data: result } = await sendTest({ variables: { template_key: testing.key, to } });
      const outcome = result?.liteSendTestEmail;
      const message = outcome?.message ?? '';
      if (outcome?.ok) {
        notifySuccess(t('litePortal.common.testPassed', { vars: { message } }));
        setTesting(null);
      } else {
        notifyError(t('litePortal.common.testFailed', { vars: { message } }));
      }
      reload();
    } catch (err) {
      notifyError(parseApiError(err));
    }
  };

  return (
    <Stack spacing={2}>
      <PageHeader title={t('litePortal.emailTemplates.title')} subtitle={t('litePortal.emailTemplates.subtitle')} />
      <QueryGuard loading={loading && !data} error={error} loadingLabel={t('lite.common.loading')}>
        <DuncitTable<LiteEmailTemplate>
          tableId="lite-email-templates"
          ariaLabel={t('litePortal.emailTemplates.title')}
          columns={columns}
          fetchRows={fetchRows}
          getRowId={templateRowId}
          emptyText={t('litePortal.emailTemplates.empty')}
          searchPlaceholder={t('litePortal.emailTemplates.search')}
          defaultSort={{ field: 'name', dir: 'asc' }}
          refetchRef={refetchRef}
        />
      </QueryGuard>
      <EmailTemplateForm template={editing} busy={updateState.loading} onClose={() => setEditing(null)} onSubmit={onSubmit} />
      <RecipientDialog
        open={Boolean(testing)}
        title={t('litePortal.emailTemplates.sendTestTitle')}
        message={t('litePortal.emailTemplates.sendTestMessage')}
        defaultTo={me?.email ?? ''}
        busy={sendState.loading}
        onClose={() => setTesting(null)}
        onSubmit={onSendTest}
        testId="template-test-dialog"
      />
    </Stack>
  );
}
