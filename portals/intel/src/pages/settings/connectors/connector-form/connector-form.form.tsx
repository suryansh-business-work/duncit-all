import { useMemo } from 'react';
import { useForm, type Control, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, useMediaQuery, useTheme } from '@mui/material';
import type { IntelEntryOption } from '@duncit/gql-types';
import { useTranslation } from '@duncit/app-settings';
import { DuncitButton } from '@duncit/buttons';
import { RhfSwitch, RhfTextField } from '@duncit/forms';
import CredentialsFields from '../fields/CredentialsFields';
import GithubFields from '../fields/GithubFields';
import MongoFields from '../fields/MongoFields';
import { GmailFields, SlackFields } from '../fields/SlackGmailFields';
import { makeConnectorSchema, type ConnectorKind, type ConnectorValues } from './connector-form.types';

export interface ConnectorFormProps {
  open: boolean;
  kind: ConnectorKind;
  editing: boolean;
  values: ConnectorValues;
  entries: IntelEntryOption[];
  /** The credentials' display name of the connector being edited (a connected mailbox's address). */
  entryName?: string;
  saving: boolean;
  errorMessage: string | null;
  onSubmit: (values: ConnectorValues) => void;
  onClose: () => void;
}

function KindFields({ kind, control }: Readonly<{ kind: ConnectorKind; control: Control<ConnectorValues, unknown, unknown> }>) {
  if (kind === 'MONGODB') return <MongoFields control={control} />;
  if (kind === 'SLACK') return <SlackFields control={control} />;
  if (kind === 'GMAIL') return <GmailFields control={control} />;
  if (kind === 'GITHUB') return <GithubFields control={control} />;
  return null;
}

/**
 * Add or edit a connector. Credentials come from this server (its own database
 * or MCP), a Tech portal entry picked by name, a Gmail account connected with
 * Google, or — for a database — a new Atlas / self-deployed connection the
 * server tries and saves as a Tech portal entry. Secrets never come back here.
 */
export default function ConnectorForm({ open, kind, editing, values, entries, entryName = '', saving, errorMessage, onSubmit, onClose }: Readonly<ConnectorFormProps>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const schema = useMemo(() => makeConnectorSchema(t, kind), [t, kind]);
  const { control, handleSubmit, setValue } = useForm<ConnectorValues, unknown, ConnectorValues>({ defaultValues: values, values, resolver: zodResolver(schema) as Resolver<ConnectorValues, unknown, ConnectorValues>, mode: 'onTouched' });
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" fullScreen={fullScreen}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogTitle>{editing ? t('intel.settings.connectors.editTitle') : t('intel.settings.connectors.addTitle')}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.5}>
            {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
            <RhfTextField control={control} name="name" label={t('intel.settings.connectors.name')} required slotProps={{ htmlInput: { maxLength: 80 } }} />
            <CredentialsFields kind={kind} control={control} setValue={setValue} entries={entries} accountLabel={entryName} />
            <KindFields kind={kind} control={control} />
            <RhfSwitch control={control} name="enabled" label={t('intel.settings.connectors.enabled')} hint={t('intel.settings.connectors.enabledHint')} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>{t('intel.common.cancel')}</Button>
          <DuncitButton type="submit" variant="contained" loading={saving || undefined}>
            {t('intel.common.save')}
          </DuncitButton>
        </DialogActions>
      </form>
    </Dialog>
  );
}
