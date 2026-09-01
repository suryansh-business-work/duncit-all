import { useRef, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client/react';
import { Stack } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';
import { DuncitButton } from '@duncit/buttons';
import { notify, useConfirm } from '@duncit/dialogs';
import { downloadTextFile, parseApiError } from '@duncit/utils';
import CopyGetApiButton from '../../components/CopyGetApiButton';
import {
  IMPORT_TELEMETRY_LOGS,
  TELEMETRY_LOGS_EXPORT,
  type TelemetryLevel,
  type TelemetryLogRow,
} from './queries';
import { buildLogExport, logExportFilename, parseLogImport } from './log-io';
import { useTranslation } from '@duncit/app-settings';

interface Props {
  level: TelemetryLevel;
  onImported: () => void;
}

/**
 * Carrying one level's logs in and out, plus the no-login URL that returns the
 * same rows as JSON.
 *
 * Export takes the level's whole (server-bounded) history rather than the page
 * on screen; import matches each row on the id it already carries, so a file
 * can move a problem between environments or restore one after a wipe without
 * ever duplicating a row.
 */
export default function LogImportExport({ level, onImported }: Readonly<Props>) {
  const { t } = useTranslation();
  const client = useApolloClient();
  const confirm = useConfirm();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [importMut, { loading: importing }] = useMutation<{
    importTelemetryLogs: { created: number; skipped: number; expiring: number };
  }>(IMPORT_TELEMETRY_LOGS);
  const [exporting, setExporting] = useState(false);

  const runExport = async () => {
    setExporting(true);
    try {
      const { data } = await client.query<{ telemetryLogsExport: TelemetryLogRow[] }>({
        query: TELEMETRY_LOGS_EXPORT,
        variables: { level },
        fetchPolicy: 'network-only',
      });
      const rows = data?.telemetryLogsExport ?? [];
      if (rows.length === 0) {
        notify(`There are no ${level} logs to export yet.`, 'info');
        return;
      }
      const exportedAt = new Date().toISOString();
      downloadTextFile(
        JSON.stringify(buildLogExport(rows, level, exportedAt), null, 2),
        logExportFilename(level, exportedAt),
        'application/json',
      );
      notify(`Exported ${rows.length} ${level} logs`, 'success');
    } catch (err) {
      notify(parseApiError(err), 'error');
    } finally {
      setExporting(false);
    }
  };

  const runImport = async (file: File) => {
    const parsed = parseLogImport(await file.text());
    if ('error' in parsed) {
      notify(parsed.error, 'error');
      return;
    }

    const ok = await confirm({
      title: `Import ${parsed.logs.length} logs`,
      message: t('tech.telemetryLogs.rowsAlreadyHereUnderTheSame'),
      confirmLabel: t('tech.common.import'),
    });
    if (!ok) return;

    try {
      const { data } = await importMut({ variables: { logs: parsed.logs } });
      const result = data?.importTelemetryLogs;
      const expiring = result?.expiring ?? 0;
      // A row keeps the timestamp it was exported with, so an old file lands
      // and is deleted again by the next cleanup. Say so now, not tomorrow.
      const warning = expiring > 0 ? ` — ${expiring} are older than the retention window` : '';
      notify(
        `Imported — ${result?.created ?? 0} added, ${result?.skipped ?? 0} already here${warning}`,
        expiring > 0 ? 'warning' : 'success',
      );
      onImported();
    } catch (err) {
      notify(parseApiError(err), 'error');
    }
  };

  return (
    <Stack direction="row" spacing={0.5} sx={{
      alignItems: "center"
    }}>
      <DuncitButton size="small" startIcon={<DownloadIcon />} disabled={exporting} onClick={runExport}>
        {exporting ? 'Exporting…' : 'Export'}
      </DuncitButton>
      <DuncitButton
        size="small"
        startIcon={<UploadIcon />}
        disabled={importing}
        onClick={() => fileRef.current?.click()}
      >
        {importing ? 'Importing…' : 'Import'}
      </DuncitButton>
      <CopyGetApiButton path="/telemetry/logs.json" params={{ level }} />
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        aria-label={t('tech.telemetryLogs.logsJsonFile')}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          // Cleared so picking the SAME file again still fires a change event.
          e.target.value = '';
          if (file) await runImport(file);
        }}
      />
    </Stack>
  );
}
