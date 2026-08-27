import { useRef, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client';
import { Box, Typography } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';
import { DuncitButton } from '@duncit/buttons';
import { notify, useConfirm } from '@duncit/dialogs';
import { downloadTextFile, parseApiError } from '@duncit/utils';
import { IMPORT_FLAGS, QUERY, type FeatureFlagRow, type FlagImportResult } from './queries';
import { buildFlagExport, flagExportFilename, parseFlagImport } from './flag-io';
import { useTranslation } from '@duncit/app-settings';

interface Props {
  onImported: () => void;
}

/**
 * Carrying feature flags in and out as a JSON file.
 *
 * Export is a plain download — a flag file holds no secrets. Import is behind
 * a confirmation that names every flag and the state it is about to land in,
 * because that state takes effect across the platform the moment it saves.
 */
export default function FlagImportExport({ onImported }: Readonly<Props>) {
  const { t } = useTranslation();
  const client = useApolloClient();
  const confirm = useConfirm();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [exporting, setExporting] = useState(false);
  const [importMut, { loading: importing }] = useMutation<{
    importFeatureFlags: FlagImportResult;
  }>(IMPORT_FLAGS);

  const runExport = async () => {
    setExporting(true);
    try {
      // The whole set, not the table's page — a backup with page 1 in it is
      // not a backup.
      const { data } = await client.query<{ featureFlags: FeatureFlagRow[] }>({
        query: QUERY,
        fetchPolicy: 'network-only',
      });
      const flags = data?.featureFlags ?? [];
      if (flags.length === 0) {
        notify('There is nothing to export yet.', 'info');
        return;
      }
      const exportedAt = new Date().toISOString();
      downloadTextFile(
        JSON.stringify(buildFlagExport(flags, exportedAt), null, 2),
        flagExportFilename(exportedAt),
        'application/json',
      );
      notify(`Exported ${flags.length} flags`, 'success');
    } catch (err) {
      notify(parseApiError(err), 'error');
    } finally {
      setExporting(false);
    }
  };

  const runImport = async (file: File) => {
    const parsed = parseFlagImport(await file.text());
    if ('error' in parsed) {
      notify(parsed.error, 'error');
      return;
    }

    const ok = await confirm({
      title: `Import ${parsed.flags.length} flags`,
      // Naming them with their state is the point: an operator about to switch
      // a live feature off should read it in the list before they agree.
      message: (
        <>
          <Typography variant="body2">
            A flag already here under the same key will be switched to the file&apos;s state. The
            rest are created. This takes effect across the platform straight away.
          </Typography>
          <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2.5, maxHeight: 220, overflowY: 'auto' }}>
            {parsed.flags.map((f) => (
              <Typography key={f.key} component="li" variant="body2">
                {f.key} · {f.enabled ? 'On' : 'Off'}
              </Typography>
            ))}
          </Box>
        </>
      ),
      destructive: true,
      confirmLabel: t('tech.common.import'),
    });
    if (!ok) return;

    try {
      const { data } = await importMut({ variables: { flags: parsed.flags } });
      const result = data?.importFeatureFlags;
      notify(
        `Imported — ${result?.created.length ?? 0} added, ${result?.updated.length ?? 0} updated` +
          (result?.skipped.length ? `, ${result.skipped.length} skipped` : ''),
        'success',
      );
      onImported();
    } catch (err) {
      notify(parseApiError(err), 'error');
    }
  };

  return (
    <>
      <DuncitButton size="small" startIcon={<DownloadIcon />} disabled={exporting} onClick={runExport}>
        Export
      </DuncitButton>

      <DuncitButton
        size="small"
        startIcon={<UploadIcon />}
        disabled={importing}
        onClick={() => fileRef.current?.click()}
      >
        {importing ? 'Importing…' : 'Import'}
      </DuncitButton>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        aria-label={t('tech.featureFlags.featureFlagsJsonFile')}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          // Cleared so picking the SAME file again still fires a change event.
          e.target.value = '';
          if (file) await runImport(file);
        }}
      />
    </>
  );
}
