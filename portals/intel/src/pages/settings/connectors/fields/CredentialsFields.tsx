import { useEffect } from 'react';
import { useWatch, type Control, type UseFormSetValue } from 'react-hook-form';
import { Alert } from '@mui/material';
import type { IntelEntryOption } from '@duncit/gql-types';
import { useTranslation } from '@duncit/app-settings';
import { RhfSelect } from '@duncit/forms';
import { ENV_LABEL_KEYS } from '../../../../components/sources';
import { GMAIL_OAUTH_ENTRY, isNewConnection, NEW_ATLAS, NEW_SELF_HOSTED, type ConnectorKind, type ConnectorValues } from '../connector-form/connector-form.types';
import NewConnectionFields from './NewConnectionFields';

type Ctl = Control<ConnectorValues, unknown, unknown>;

const HINT_KEYS: Partial<Record<ConnectorKind, string>> = {
  MONGODB: 'intel.settings.connectors.connectionHint.MONGODB',
  MCP: 'intel.settings.connectors.connectionHint.MCP',
};

interface Props {
  kind: ConnectorKind;
  control: Ctl;
  setValue: UseFormSetValue<ConnectorValues>;
  entries: readonly IntelEntryOption[];
  /** The connected mailbox's address, for a Gmail connector made with Google. */
  accountLabel: string;
}

/**
 * Where a connector's credentials come from, then its environment. A built-in
 * source (this server's database or MCP) sets the environment itself; a Gmail
 * account connected with Google is not an environment at all.
 */
export default function CredentialsFields({ kind, control, setValue, entries, accountLabel }: Readonly<Props>) {
  const { t } = useTranslation();
  const entryId = String(useWatch({ control, name: 'env_entry_id' }) ?? '');
  const accountId = useWatch({ control, name: 'config.account_id' });
  const fixedEnvironment = entries.find((e) => e.id === entryId)?.environment ?? null;
  useEffect(() => {
    if (fixedEnvironment) setValue('environment', fixedEnvironment, { shouldValidate: true });
  }, [fixedEnvironment, setValue]);

  if (kind === 'GMAIL' && (entryId === GMAIL_OAUTH_ENTRY || accountId)) return <Alert severity="info">{t('intel.settings.gmail.account', { vars: { email: accountLabel } })}</Alert>;

  const envLabel = (env: string) => t(ENV_LABEL_KEYS[env] ?? 'intel.env.STAGING');
  const options = entries.map((e) => {
    if (e.builtin) return { value: e.id, label: t('intel.settings.connectors.builtinOption', { vars: { name: e.name, environment: envLabel(e.environment ?? 'STAGING') } }) };
    return { value: e.id, label: e.is_default ? t('intel.settings.entryDefault', { vars: { name: e.name } }) : e.name };
  });
  if (kind === 'MONGODB') options.push({ value: NEW_ATLAS, label: t('intel.settings.connectors.newAtlas') }, { value: NEW_SELF_HOSTED, label: t('intel.settings.connectors.newSelfHosted') });
  const hintKey = HINT_KEYS[kind];
  const envs = kind === 'MONGODB' ? ['STAGING', 'PRODUCTION'] : ['STAGING', 'PRODUCTION', 'BOTH'];
  const environmentHint = kind === 'MONGODB' ? t('intel.settings.connectors.mongoOneEnv') : t('intel.settings.connectors.environmentHint');
  return (
    <>
      {options.length === 0 && <Alert severity="warning">{t('intel.settings.connectors.noEntries')}</Alert>}
      <RhfSelect
        control={control}
        name="env_entry_id"
        label={hintKey ? t('intel.settings.connectors.connection') : t('intel.settings.connectors.entry')}
        hint={hintKey ? t(hintKey) : t('intel.settings.connectors.entryHint')}
        options={options}
      />
      {kind === 'MONGODB' && isNewConnection(entryId) && <NewConnectionFields control={control} entryId={entryId} />}
      <RhfSelect
        control={control}
        name="environment"
        label={t('intel.settings.connectors.environment')}
        hint={fixedEnvironment ? t('intel.settings.connectors.builtinEnvironment', { vars: { environment: envLabel(fixedEnvironment) } }) : environmentHint}
        disabled={Boolean(fixedEnvironment)}
        options={envs.map((e) => ({ value: e, label: envLabel(e) }))}
      />
    </>
  );
}
