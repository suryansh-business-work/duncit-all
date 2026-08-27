import { useRef, useState } from 'react';
import { gql, useApolloClient, useMutation } from '@apollo/client';
import {
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { DuncitButton } from '@duncit/buttons';
import { fileToBase64, parseApiError } from '@duncit/utils';
import { autoMatch, importFieldsFor } from '../config/importFields';
import ColumnMappingStep from './import/ColumnMappingStep';
import ImportResultView, { type ImportResult } from './import/ImportResultView';
import { useTranslation } from '@duncit/shell';

const CRM_EXCEL_INSPECT = gql`
  query CrmExcelInspect($content_base64: String!) {
    crmExcelInspect(content_base64: $content_base64) { headers sample_rows }
  }
`;
const CRM_EXCEL_IMPORT = gql`
  mutation CrmExcelImport($entity: CrmAiEntity!, $content_base64: String!, $mapping: [CrmImportMappingInput!]) {
    crmExcelImport(entity: $entity, content_base64: $content_base64, mapping: $mapping) {
      inserted failed errors { row message }
    }
  }
`;

interface Props {
  open: boolean;
  entity: 'VENUE_LEAD' | 'HOST_LEAD';
  title: string;
  onClose: () => void;
  onImported: (result: { inserted: number; failed: number }) => void;
  onDownloadTemplate?: () => void;
}

type Step = 'file' | 'map' | 'done';

export default function ExcelImportDialog({ open, entity, title, onClose, onImported, onDownloadTemplate }: Readonly<Props>) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [step, setStep] = useState<Step>('file');
  const [base64, setBase64] = useState('');
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fields = importFieldsFor(entity);

  const client = useApolloClient();
  const [inspecting, setInspecting] = useState(false);
  const [importMut, { loading: importing }] = useMutation<{ crmExcelImport: ImportResult }>(CRM_EXCEL_IMPORT);

  const close = () => {
    setStep('file'); setBase64(''); setFileName(''); setHeaders([]); setMapping({}); setError(null); setResult(null);
    onClose();
  };

  const onFile = async (file: File | null) => {
    if (!file) return;
    setError(null);
    setInspecting(true);
    try {
      const b64 = await fileToBase64(file);
      setBase64(b64);
      setFileName(file.name);
      const res = await client.query<{ crmExcelInspect: { headers: string[]; sample_rows: string[] } }>({
        query: CRM_EXCEL_INSPECT,
        variables: { content_base64: b64 },
        fetchPolicy: 'network-only',
      });
      const found = res.data?.crmExcelInspect?.headers ?? [];
      if (found.length === 0) throw new Error('No column headers found in the first row.');
      setHeaders(found);
      setMapping(autoMatch(fields, found));
      setStep('map');
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setInspecting(false);
    }
  };

  const requiredOk = fields.filter((f) => f.required).every((f) => mapping[f.field]);

  const doImport = async () => {
    setError(null);
    try {
      const mappingArg = Object.entries(mapping)
        .filter(([, header]) => header)
        .map(([field, header]) => ({ field, header }));
      const res = await importMut({ variables: { entity, content_base64: base64, mapping: mappingArg } });
      const payload = res.data?.crmExcelImport;
      if (!payload) throw new Error('Import returned no payload');
      setResult(payload);
      setStep('done');
      onImported({ inserted: payload.inserted, failed: payload.failed });
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth={step === 'map' ? 'md' : 'sm'}>
      <DialogTitle>
        <Stack direction="row" spacing={1} sx={{
          alignItems: "center"
        }}><FileUploadIcon color="primary" /><span>{title}</span></Stack>
      </DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert>}

        {step === 'file' && (
          <Stack spacing={1.5}>
            <Typography variant="body2" sx={{
              color: "text.secondary"
            }}>
              Upload an Excel (.xlsx) or CSV file. Next you'll map your columns to lead fields.
              Multi-value columns accept comma-separated values.
            </Typography>
            {onDownloadTemplate && (
              <DuncitButton size="small" variant="outlined" sx={{ alignSelf: 'flex-start' }} onClick={onDownloadTemplate}>{t('crm.components.downloadTemplate')}</DuncitButton>
            )}
            <Divider />
            <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv,text/csv" hidden onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
            <Stack direction="row" spacing={1.25} sx={{
              alignItems: "center"
            }}>
              <DuncitButton variant="outlined" startIcon={<CloudUploadIcon />} onClick={() => inputRef.current?.click()} disabled={inspecting}>
                {inspecting ? 'Reading…' : 'Choose file'}
              </DuncitButton>
              <Typography variant="body2" noWrap sx={{
                color: "text.secondary"
              }}>{fileName || 'No file selected'}</Typography>
            </Stack>
          </Stack>
        )}

        {step === 'map' && (
          <ColumnMappingStep fields={fields} headers={headers} mapping={mapping} onChange={setMapping} />
        )}

        {step === 'done' && result && <ImportResultView result={result} />}
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={close} disabled={inspecting || importing}>{t('shell.common.close')}</DuncitButton>
        {step === 'map' && (
          <DuncitButton variant="contained" onClick={doImport} disabled={importing || !requiredOk}>
            {importing ? 'Importing…' : t('crm.userLeads.import')}
          </DuncitButton>
        )}
      </DialogActions>
    </Dialog>
  );
}
