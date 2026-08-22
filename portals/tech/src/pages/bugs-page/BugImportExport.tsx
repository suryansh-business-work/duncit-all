import { useRef, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client';
import { Button } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';
import { notify, useConfirm } from '@duncit/dialogs';
import { downloadTextFile, parseApiError } from '@duncit/utils';
import CopyGetApiButton from '../../components/CopyGetApiButton';
import { BUGS_EXPORT, IMPORT_BUGS, type BugRow } from './queries';
import { buildBugExport, bugExportFilename, parseBugImport } from './bug-io';
import { useTranslation } from '@duncit/app-settings';

interface Props {
  onImported: () => void;
}

/**
 * Carrying the bug history in and out as a JSON file.
 *
 * Export takes every bug (not the page on screen); import matches each entry on
 * its fingerprint, overwriting a bug already here and adding the rest — so a
 * file can move triage state between environments or restore it after a wipe.
 */
export default function BugImportExport({ onImported }: Readonly<Props>) {
  const { t } = useTranslation();
  const client = useApolloClient();
  const confirm = useConfirm();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [importMut, { loading: importing }] = useMutation<{
    importBugs: { created: number; updated: number };
  }>(IMPORT_BUGS);
  const [exporting, setExporting] = useState(false);

  const runExport = async () => {
    setExporting(true);
    try {
      const { data } = await client.query<{ bugsExport: BugRow[] }>({
        query: BUGS_EXPORT,
        fetchPolicy: 'network-only',
      });
      const bugs = data?.bugsExport ?? [];
      if (bugs.length === 0) {
        notify('There are no bugs to export yet.', 'info');
        return;
      }
      const exportedAt = new Date().toISOString();
      downloadTextFile(
        JSON.stringify(buildBugExport(bugs, exportedAt), null, 2),
        bugExportFilename(exportedAt),
        'application/json',
      );
      notify(`Exported ${bugs.length} bugs`, 'success');
    } catch (err) {
      notify(parseApiError(err), 'error');
    } finally {
      setExporting(false);
    }
  };

  const runImport = async (file: File) => {
    const parsed = parseBugImport(await file.text());
    if ('error' in parsed) {
      notify(parsed.error, 'error');
      return;
    }

    const ok = await confirm({
      title: `Import ${parsed.bugs.length} bugs`,
      message: t('tech.bugs.aBugAlreadyHereWithThe'),
      destructive: true,
      confirmLabel: t('tech.common.import'),
    });
    if (!ok) return;

    try {
      const { data } = await importMut({ variables: { bugs: parsed.bugs } });
      const result = data?.importBugs;
      notify(
        `Imported — ${result?.created ?? 0} added, ${result?.updated ?? 0} overwritten`,
        'success',
      );
      onImported();
    } catch (err) {
      notify(parseApiError(err), 'error');
    }
  };

  return (
    <>
      <Button size="small" startIcon={<DownloadIcon />} disabled={exporting} onClick={runExport}>
        {exporting ? 'Exporting…' : 'Export'}
      </Button>
      <Button
        size="small"
        startIcon={<UploadIcon />}
        disabled={importing}
        onClick={() => fileRef.current?.click()}
      >
        {importing ? 'Importing…' : 'Import'}
      </Button>
      <CopyGetApiButton path="/telemetry/bugs.json" />
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        aria-label={t('tech.bugs.bugsJsonFile')}
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
