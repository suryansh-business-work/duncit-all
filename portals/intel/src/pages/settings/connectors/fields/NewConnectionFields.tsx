import type { Control } from 'react-hook-form';
import { Alert, Stack } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { RhfSwitch, RhfTextField } from '@duncit/forms';
import { NUMERIC } from '../../fields';
import { NEW_ATLAS, type ConnectorValues } from '../connector-form/connector-form.types';

type Ctl = Control<ConnectorValues, unknown, unknown>;
const SECRET_INPUT = { htmlInput: { autoComplete: 'off', spellCheck: false } } as const;

/**
 * A database that is not in the Tech portal yet: MongoDB Atlas (its connection
 * URL) or a self-deployed server (host, port and a database user). The server
 * tries it before saving and stores it as a Tech portal entry.
 */
export default function NewConnectionFields({ control, entryId }: Readonly<{ control: Ctl; entryId: string }>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={1.5}>
      <Alert severity="info">{t('intel.settings.connectors.newConnectionNote')}</Alert>
      {entryId === NEW_ATLAS ? (
        <RhfTextField control={control} name="config.new_connection.uri" label={t('intel.settings.connectors.atlasUri')} hint={t('intel.settings.connectors.atlasUriHint')} type="password" required slotProps={SECRET_INPUT} />
      ) : (
        <>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <RhfTextField control={control} name="config.new_connection.host" label={t('intel.settings.connectors.host')} hint={t('intel.settings.connectors.hostHint')} required sx={{ flex: 3 }} />
            <RhfTextField control={control} name="config.new_connection.port" label={t('intel.settings.connectors.port')} required sx={{ flex: 1 }} {...NUMERIC} />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <RhfTextField control={control} name="config.new_connection.username" label={t('intel.settings.connectors.username')} required slotProps={SECRET_INPUT} />
            <RhfTextField control={control} name="config.new_connection.password" label={t('intel.settings.connectors.password')} type="password" required slotProps={SECRET_INPUT} />
          </Stack>
          <RhfTextField control={control} name="config.new_connection.auth_source" label={t('intel.settings.connectors.authSource')} hint={t('intel.settings.connectors.authSourceHint')} />
          <RhfSwitch control={control} name="config.new_connection.tls" label={t('intel.settings.connectors.tls')} hint={t('intel.settings.connectors.tlsHint')} />
        </>
      )}
    </Stack>
  );
}
