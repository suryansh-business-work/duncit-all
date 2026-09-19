import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import { QueryGuard } from '@duncit/ui';
import { usePortalT } from '../../../shared/i18n';
import { useLiteSession } from '../../../shared/session';
import { RecipientDialog } from '../../components/recipient-dialog';
import { LITE_ENV_ENTRIES, type LiteEnvCategoryDef, type LiteEnvEntry } from '../../graphql/environment';
import { EnvEntriesTable } from './EnvEntriesTable';
import { EnvEntryForm, toEnvInput, type EnvEntryFormValues } from './env-entry';
import { useEnvActions } from './useEnvActions';

interface Props {
  def: LiteEnvCategoryDef;
}

/** One category's entries, its add/edit dialog and — for EMAIL — the "send the test where?" dialog. */
export function EnvCategoryPanel({ def }: Readonly<Props>) {
  const { t } = usePortalT();
  const { me } = useLiteSession();
  const { data, loading, error, refetch } = useQuery<{ liteEnvEntries: LiteEnvEntry[] }>(LITE_ENV_ENTRIES, {
    variables: { category: def.category },
    fetchPolicy: 'cache-and-network',
  });
  const rows = useMemo(() => data?.liteEnvEntries ?? [], [data]);
  const reload = useCallback(() => {
    refetch().catch(() => undefined);
  }, [refetch]);
  const actions = useEnvActions(def.category, reload);
  const [editing, setEditing] = useState<LiteEnvEntry | null>(null);
  const [creating, setCreating] = useState(false);
  const [emailTest, setEmailTest] = useState<LiteEnvEntry | null>(null);

  const isEmail = def.category === 'EMAIL';
  const runTest = actions.test;
  const onTest = useCallback(
    (entry: LiteEnvEntry) => {
      if (isEmail) setEmailTest(entry);
      else runTest(entry).catch(() => undefined);
    },
    [isEmail, runTest],
  );

  const closeForm = () => {
    setCreating(false);
    setEditing(null);
  };

  const onSubmit = async (values: EnvEntryFormValues) => {
    const ok = await actions.save(editing, toEnvInput(def, values));
    if (ok) closeForm();
  };

  const onSendTest = async (to: string) => {
    if (!emailTest) return;
    const ok = await actions.test(emailTest, to);
    if (ok) setEmailTest(null);
  };

  return (
    <>
      <QueryGuard loading={loading && !data} error={error} loadingLabel={t('lite.common.loading')}>
        <EnvEntriesTable
          rows={rows}
          categoryLabel={def.label}
          toolbarActions={
            <DuncitButton size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setCreating(true)} data-testid="env-add">
              {t('litePortal.environment.add', { vars: { label: def.label } })}
            </DuncitButton>
          }
          onEdit={setEditing}
          onDelete={actions.remove}
          onSetDefault={actions.setDefault}
          onTest={onTest}
        />
      </QueryGuard>
      <EnvEntryForm
        open={creating || Boolean(editing)}
        def={def}
        initial={editing}
        busy={actions.saving}
        testing={actions.testing}
        onClose={closeForm}
        onSubmit={onSubmit}
        onTest={onTest}
      />
      <RecipientDialog
        open={Boolean(emailTest)}
        title={t('litePortal.environment.testTitle')}
        message={t('litePortal.environment.testMessage', { vars: { name: emailTest?.name ?? '' } })}
        defaultTo={me?.email ?? ''}
        busy={actions.testing}
        onClose={() => setEmailTest(null)}
        onSubmit={onSendTest}
        testId="env-test-dialog"
      />
    </>
  );
}
