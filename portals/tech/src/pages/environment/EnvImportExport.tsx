import { useRef, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client';
import { Box, Button, Menu, MenuItem, Typography } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';
import { notify, useConfirm } from '@duncit/dialogs';
import { downloadTextFile, parseApiError } from '@duncit/utils';
import {
  ENV_ENTRIES,
  IMPORT_ENV_ENTRIES,
  type EnvCategory,
  type EnvEntry,
  type EnvImportResult,
} from './queries';
import { buildEnvExport, envExportFilename, parseEnvImport } from './env-io';

interface Props {
  /** The category tab in view — what "this category" means. */
  category: EnvCategory;
  categoryLabel: string;
  onImported: () => void;
}

/**
 * Carrying environment variables in and out as a JSON file.
 *
 * The file holds real keys and real values, because its whole job is to stand
 * a second environment up with credentials that work — so both directions are
 * behind a confirmation that says so plainly.
 */
export default function EnvImportExport({ category, categoryLabel, onImported }: Readonly<Props>) {
  const client = useApolloClient();
  const confirm = useConfirm();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [importMut, { loading: importing }] = useMutation<{ importEnvEntries: EnvImportResult }>(
    IMPORT_ENV_ENTRIES,
  );
  const [exporting, setExporting] = useState(false);

  const runExport = async (scope: EnvCategory | null) => {
    setMenuAnchor(null);
    const what = scope ? categoryLabel : 'every category';
    const ok = await confirm({
      title: 'Export environment variables',
      message: `The file will contain the real keys and secrets for ${what}. Anyone who opens it can use them — keep it somewhere you would keep a password.`,
      confirmLabel: 'Download',
    });
    if (!ok) return;

    setExporting(true);
    try {
      const { data } = await client.query<{ envEntries: EnvEntry[] }>({
        query: ENV_ENTRIES,
        variables: { filter: scope ? { category: scope } : {} },
        fetchPolicy: 'network-only',
      });
      const entries = data?.envEntries ?? [];
      if (entries.length === 0) {
        notify('There is nothing to export yet.', 'info');
        return;
      }
      const exportedAt = new Date().toISOString();
      downloadTextFile(
        JSON.stringify(buildEnvExport(entries, exportedAt), null, 2),
        envExportFilename(scope ?? 'all', exportedAt),
        'application/json',
      );
      notify(`Exported ${entries.length} entries`, 'success');
    } catch (err) {
      notify(parseApiError(err), 'error');
    } finally {
      setExporting(false);
    }
  };

  const runImport = async (file: File) => {
    const parsed = parseEnvImport(await file.text());
    if ('error' in parsed) {
      notify(parsed.error, 'error');
      return;
    }

    const ok = await confirm({
      title: `Import ${parsed.entries.length} entries`,
      // Naming them is the point: an operator about to overwrite the live SMTP
      // password should see it in the list before they agree.
      message: (
        <>
          <Typography variant="body2">
            An entry already here under the same name will be OVERWRITTEN with the file&apos;s
            values. The rest are added.
          </Typography>
          <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2.5, maxHeight: 220, overflowY: 'auto' }}>
            {parsed.entries.map((e) => (
              <Typography key={`${e.category}:${e.name}`} component="li" variant="body2">
                {e.category} · {e.name}
              </Typography>
            ))}
          </Box>
        </>
      ),
      destructive: true,
      confirmLabel: 'Import',
    });
    if (!ok) return;

    try {
      const { data } = await importMut({ variables: { entries: parsed.entries } });
      const result = data?.importEnvEntries;
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
      <Button
        size="small"
        startIcon={<DownloadIcon />}
        disabled={exporting}
        onClick={(e) => setMenuAnchor(e.currentTarget)}
      >
        Export
      </Button>
      <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={() => setMenuAnchor(null)}>
        <MenuItem onClick={() => runExport(category)}>{categoryLabel} only</MenuItem>
        <MenuItem onClick={() => runExport(null)}>All categories</MenuItem>
      </Menu>

      <Button
        size="small"
        startIcon={<UploadIcon />}
        disabled={importing}
        onClick={() => fileRef.current?.click()}
      >
        {importing ? 'Importing…' : 'Import'}
      </Button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        aria-label="Environment variables JSON file"
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
