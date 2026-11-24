import { useWatch, type Control } from 'react-hook-form';
import { useQuery } from '@apollo/client/react';
import { Alert } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { RhfSwitch, RhfTextField } from '@duncit/forms';
import { INTEL_PICKERS_SLACK, type SlackChannelsData } from '../../../../graphql/admin';
import { NUMERIC } from '../../fields';
import type { ConnectorValues } from '../connector-form/connector-form.types';
import TagsField from './TagsField';

type Ctl = Readonly<{ control: Control<ConnectorValues, unknown, unknown> }>;

/** Slack: the channels to index (listed live with the bot token), threads, file names and how far back. */
export function SlackFields({ control }: Ctl) {
  const { t } = useTranslation();
  const entryId = useWatch({ control, name: 'env_entry_id' });
  const picker = useQuery<SlackChannelsData>(INTEL_PICKERS_SLACK, { variables: { entry_id: entryId }, skip: !entryId });
  const options = (picker.data?.intelSlackChannels ?? []).map((c) => ({ value: c.id, label: `#${c.name}` }));
  return (
    <>
      {picker.error && <Alert severity="warning">{t('intel.settings.connectors.channelsFailed')}</Alert>}
      <TagsField control={control} name="config.channels" label={t('intel.settings.connectors.channels')} hint={t('intel.settings.connectors.channelsHint')} options={options} loading={picker.loading} asObjects allLabel={t('intel.settings.connectors.channelsAll')} />
      <RhfSwitch control={control} name="config.include_threads" label={t('intel.settings.connectors.threads')} />
      <RhfSwitch control={control} name="config.index_attachments" label={t('intel.settings.connectors.attachments')} hint={t('intel.settings.connectors.attachmentsHint')} />
      <RhfTextField control={control} name="config.history_days" label={t('intel.settings.connectors.historyDays')} {...NUMERIC} />
    </>
  );
}

/** Gmail: which threads (a Gmail search), how many, attachments and how far back. */
export function GmailFields({ control }: Ctl) {
  const { t } = useTranslation();
  return (
    <>
      <RhfTextField control={control} name="config.query" label={t('intel.settings.connectors.gmailQuery')} hint={t('intel.settings.connectors.gmailQueryHint')} />
      <RhfTextField control={control} name="config.max_threads" label={t('intel.settings.connectors.maxThreads')} {...NUMERIC} />
      <RhfSwitch control={control} name="config.include_attachments" label={t('intel.settings.connectors.gmailAttachments')} hint={t('intel.settings.connectors.gmailAttachmentsHint')} />
      <RhfTextField control={control} name="config.history_days" label={t('intel.settings.connectors.historyDays')} {...NUMERIC} />
    </>
  );
}
