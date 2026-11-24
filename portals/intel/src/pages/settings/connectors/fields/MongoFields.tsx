import { useWatch, type Control } from 'react-hook-form';
import { useQuery } from '@apollo/client/react';
import { Alert } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { RhfSelect, RhfTextField } from '@duncit/forms';
import { useDebouncedValue } from '@duncit/ui';
import { INTEL_PICKERS_MONGO } from '../../../../graphql/admin';
import { ACCESS_MODES, isNewConnection, type ConnectorValues } from '../connector-form/connector-form.types';
import TagsField from './TagsField';

const MODE_KEYS = { READ_ONLY: 'intel.settings.connectors.mode.READ_ONLY', WRITE_ONLY: 'intel.settings.connectors.mode.WRITE_ONLY', READ_WRITE: 'intel.settings.connectors.mode.READ_WRITE' } as const;

/** Database name, the collections Intel may touch (listed live from the database) and read/write mode. */
export default function MongoFields({ control }: Readonly<{ control: Control<ConnectorValues, unknown, unknown> }>) {
  const { t } = useTranslation();
  const entryId = String(useWatch({ control, name: 'env_entry_id' }) ?? '');
  // A connection that is not saved yet cannot be listed: its collections are typed.
  const unsaved = isNewConnection(entryId);
  const database = useDebouncedValue(String(useWatch({ control, name: 'config.database' }) ?? ''), 400);
  const picker = useQuery<{ intelMongoCollections: string[] }>(INTEL_PICKERS_MONGO, { variables: { entry_id: entryId, database }, skip: !entryId || unsaved });
  const options = (picker.data?.intelMongoCollections ?? []).map((c) => ({ value: c, label: c }));
  return (
    <>
      <RhfTextField control={control} name={'config.database'} label={t('intel.settings.connectors.database')} hint={t('intel.settings.connectors.databaseHint')} />
      {picker.error && <Alert severity="warning">{t('intel.settings.connectors.collectionsFailed')}</Alert>}
      <TagsField control={control} name={'config.collections'} label={t('intel.settings.connectors.collections')} hint={t('intel.settings.connectors.collectionsHint')} options={options} loading={picker.loading} freeSolo={unsaved || Boolean(picker.error)} />
      <RhfSelect control={control} name={'config.access_mode'} label={t('intel.settings.connectors.accessMode')} hint={t('intel.settings.connectors.accessModeHint')} options={ACCESS_MODES.map((m) => ({ value: m, label: t(MODE_KEYS[m]) }))} />
    </>
  );
}
