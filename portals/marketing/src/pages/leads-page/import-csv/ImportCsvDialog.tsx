import { useId, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Alert, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Stack, Typography } from '@mui/material';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import { DuncitButton } from '@duncit/buttons';
import { notify } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import { IMPORT_MARKETING_LEADS, type MarketingLeadImportResult, type MarketingLeadPipeline } from '../queries';
import { toServerMapping } from './importMapping';
import { useCsvFile } from './useCsvFile';
import ImportMappingFields from './ImportMappingFields';
import { ImportOutcome, ImportPreview } from './ImportPreview';

interface Props {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}

/**
 * Import leads from a CSV: pick the file, say which column holds what, check
 * the first rows and the ones that will be skipped, then import. The server
 * answers with what it added, merged and skipped, and the run it recorded.
 */
export default function ImportCsvDialog({ open, onClose, onImported }: Readonly<Props>) {
  const { t } = useTranslation();
  const titleId = useId();
  const inputId = useId();
  const { file, mapping, setMapping, problem, choose, clear } = useCsvFile();
  const [pipeline, setPipeline] = useState<MarketingLeadPipeline>('GENERAL');
  const [result, setResult] = useState<MarketingLeadImportResult | null>(null);
  const [run, { loading }] = useMutation<{ importMarketingLeads: MarketingLeadImportResult }>(IMPORT_MARKETING_LEADS);

  const close = () => {
    clear();
    setResult(null);
    onClose();
  };

  const submit = async () => {
    if (!file) return;
    try {
      const { data } = await run({ variables: { rows: file.rows, mapping: toServerMapping(mapping, pipeline) } });
      if (!data) return;
      setResult(data.importMarketingLeads);
      onImported();
    } catch (err) {
      notify(parseApiError(err), 'error');
    }
  };

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="md" aria-labelledby={titleId} data-testid="import-csv-dialog">
      <DialogTitle id={titleId}>{t('marketing.leads.importTitle')}</DialogTitle>
      <DialogContent>
        {result ? (
          <ImportOutcome result={result} />
        ) : (
          <Stack spacing={2}>
            <DialogContentText>{t('marketing.leads.importIntro')}</DialogContentText>
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <DuncitButton component="label" htmlFor={inputId} variant="outlined" startIcon={<UploadFileOutlinedIcon />}>
                {t('marketing.leads.chooseFile')}
                <input id={inputId} type="file" accept=".csv,text/csv" hidden data-testid="import-file" onChange={(event) => choose(event.target.files?.[0])} />
              </DuncitButton>
              {file && (
                <Typography variant="body2" color="text.secondary" data-testid="import-file-read">
                  {t('marketing.leads.fileRead', { vars: { rows: file.rows.length, name: file.name } })}
                </Typography>
              )}
            </Stack>
            {problem && <Alert severity="error">{problem}</Alert>}
            {file && (
              <>
                <ImportMappingFields header={file.header} mapping={mapping} onChange={setMapping} pipeline={pipeline} onPipeline={setPipeline} />
                <ImportPreview rows={file.rows} mapping={mapping} />
              </>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={close} disabled={loading}>
          {t('shell.common.close')}
        </DuncitButton>
        {!result && (
          <DuncitButton variant="contained" onClick={submit} loading={loading} disabled={!file || mapping.name === null} data-testid="import-submit">
            {t('marketing.leads.importRun', { vars: { count: file?.rows.length ?? 0 } })}
          </DuncitButton>
        )}
      </DialogActions>
    </Dialog>
  );
}
