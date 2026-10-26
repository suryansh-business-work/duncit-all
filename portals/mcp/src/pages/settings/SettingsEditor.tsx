import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Skeleton, Stack, Typography } from '@mui/material';
import { useDateFormat } from '@duncit/app-settings';
import { notifySuccess } from '@duncit/dialogs';
import type { McpSettingsInput } from '@duncit/gql-types';
import { fireAndForget } from '@duncit/logs';
import { useTranslation } from '@duncit/shell';
import { parseApiError } from '@duncit/utils';
import { mcpLog } from '../../lib/logger';
import {
  MCP_SETTINGS,
  MCP_SETTINGS_EDITOR,
  MCP_SETTINGS_OPTIONS,
  UPDATE_MCP_SETTINGS,
  type McpSettingsData,
  type SettingsEditorData,
  type SettingsOptionsData,
  type UpdateMcpSettingsData,
} from './queries';
import { SettingsForm } from './settings-form';

/** The browser's ISO 4217 list, read once. */
const CURRENCIES: readonly string[] = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('currency') : [];

/** Loads the settings and what their pickers offer, saves them, and says who saved them last. */
export default function SettingsEditor() {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const [saveError, setSaveError] = useState<string | null>(null);
  const settingsQuery = useQuery<McpSettingsData>(MCP_SETTINGS);
  const optionsQuery = useQuery<SettingsOptionsData>(MCP_SETTINGS_OPTIONS);
  const settings = settingsQuery.data?.mcpSettings;
  const editorId = settings?.updated_by ?? null;
  const editorQuery = useQuery<SettingsEditorData, { ids: string[] }>(MCP_SETTINGS_EDITOR, {
    variables: { ids: editorId ? [editorId] : [] },
    skip: !editorId,
  });
  const [update, { loading: saving }] = useMutation<UpdateMcpSettingsData, { input: McpSettingsInput }>(
    UPDATE_MCP_SETTINGS,
    {
      // The settings have no id to normalise on, so the saved values are
      // written back over the read by hand.
      update(cache, { data }) {
        if (data) cache.writeQuery({ query: MCP_SETTINGS, data: { mcpSettings: data.updateMcpSettings } });
      },
    },
  );
  const toolNames = useMemo(() => optionsQuery.data?.mcpCatalog.tools.map((tool) => tool.name) ?? [], [optionsQuery.data]);
  const categories = optionsQuery.data?.mcpCatalog.categories ?? [];

  const save = async (input: McpSettingsInput) => {
    setSaveError(null);
    try {
      await update({ variables: { input } });
      notifySuccess(t('mcp.settings.saved'));
    } catch (error) {
      setSaveError(parseApiError(error, t('mcp.settings.saveFailed')));
    }
  };

  if (settingsQuery.loading && !settings) return <Skeleton variant="rounded" height={480} />;
  if (!settings) return <Alert severity="error">{t('mcp.settings.loadFailed')}</Alert>;

  const editor = editorQuery.data?.publicUsersByIds[0];
  // The first of name, handle and id that is not blank.
  const who = [editor?.full_name, editor?.username, editorId].find((name) => Boolean(name));
  const lastSaved =
    who && settings.updated_at
      ? t('mcp.settings.lastSaved', { vars: { when: formatDateTime(settings.updated_at), who } })
      : t('mcp.settings.neverSaved');

  return (
    <Stack spacing={2}>
      <Typography variant="body2" sx={{ color: 'text.secondary' }} data-testid="mcp-settings-last-saved">
        {lastSaved}
      </Typography>
      {optionsQuery.error ? <Alert severity="warning">{t('mcp.settings.optionsFailed')}</Alert> : null}
      <SettingsForm
        key={settings.updated_at ?? 'defaults'}
        settings={settings}
        categories={categories}
        toolNames={toolNames}
        currencies={CURRENCIES}
        saving={saving}
        errorMessage={saveError}
        onSubmit={(input) => fireAndForget(save(input), mcpLog, 'McpSettings', 'save')}
      />
    </Stack>
  );
}
