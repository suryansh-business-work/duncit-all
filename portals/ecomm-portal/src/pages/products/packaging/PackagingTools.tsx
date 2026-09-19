import { useRef, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client/react';
import { Alert, Dialog, DialogActions, DialogContent, DialogTitle, List, ListItem, ListItemText, Stack } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { DuncitButton } from '@duncit/buttons';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import { downloadTextFile, parseApiError } from '@duncit/utils';
import { packagingCsv, parsePackagingCsv } from './packaging-csv';
import { IMPORT_PACKAGING, STORE_PACKAGING_EXPORT, type PackagingImportResult } from './packaging-queries';

interface PackagingToolsProps {
  /** Re-read the table after an import. */
  onImported: () => void;
}

/** The rows an import refused, with the reason for each — kept open until read. */
function ImportErrors({ result, onClose }: Readonly<{ result: PackagingImportResult; onClose: () => void }>) {
  const { t } = useTranslation();
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" aria-labelledby="packaging-import-errors">
      <DialogTitle id="packaging-import-errors">{t('ecommPortal.products.importErrorsTitle')}</DialogTitle>
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 1 }}>
          {t('ecommPortal.products.importSummary', { vars: { updated: result.updated, failed: result.errors.length } })}
        </Alert>
        <List dense>
          {result.errors.map((error) => (
            <ListItem key={`${error.row}|${error.sku}`} disableGutters>
              <ListItemText primary={t('ecommPortal.products.importRow', { vars: { row: error.row, sku: error.sku } })} secondary={error.message} />
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose}>{t('shell.common.close')}</DuncitButton>
      </DialogActions>
    </Dialog>
  );
}

/**
 * Packaging in and out as a CSV: export every product and variant, fill the
 * weights and dimensions in a spreadsheet, import it back (matched by SKU; a
 * blank cell keeps what is saved).
 */
export default function PackagingTools({ onImported }: Readonly<PackagingToolsProps>) {
  const { t } = useTranslation();
  const client = useApolloClient();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [exporting, setExporting] = useState(false);
  const [importPackaging, importState] = useMutation(IMPORT_PACKAGING);
  const [result, setResult] = useState<PackagingImportResult | null>(null);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const { data } = await client.query({ query: STORE_PACKAGING_EXPORT, variables: { product_ids: null }, fetchPolicy: 'network-only' });
      downloadTextFile(packagingCsv(data?.storePackagingExport ?? []), 'store-packaging.csv', 'text/csv;charset=utf-8');
    } catch (error) {
      notifyError(parseApiError(error));
    } finally {
      setExporting(false);
    }
  };

  const importCsv = async (file: File | null) => {
    if (!file) return;
    try {
      const rows = parsePackagingCsv(await file.text());
      if (rows.length === 0) {
        notifyError(t('ecommPortal.products.importEmpty'));
        return;
      }
      const { data } = await importPackaging({ variables: { rows } });
      const outcome = data?.storeImportPackaging;
      if (!outcome) return;
      notifySuccess(t('ecommPortal.products.importSummary', { vars: { updated: outcome.updated, failed: outcome.errors.length } }));
      if (outcome.errors.length > 0) setResult(outcome);
      onImported();
    } catch (error) {
      notifyError(parseApiError(error));
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <Stack direction="row" spacing={1}>
      <DuncitButton size="small" startIcon={<DownloadIcon />} disabled={exporting} onClick={exportCsv}>
        {t('ecommPortal.products.exportPackaging')}
      </DuncitButton>
      <DuncitButton size="small" startIcon={<UploadFileIcon />} disabled={importState.loading} onClick={() => inputRef.current?.click()}>
        {t('ecommPortal.products.importPackaging')}
      </DuncitButton>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        hidden
        aria-label={t('ecommPortal.products.importPackaging')}
        onChange={(event) => {
          importCsv(event.target.files?.[0] ?? null).catch((error: unknown) => notifyError(parseApiError(error)));
        }}
      />
      {result ? <ImportErrors result={result} onClose={() => setResult(null)} /> : null}
    </Stack>
  );
}
