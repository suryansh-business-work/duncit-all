import { useRef, useState } from 'react';
import { gql, useMutation } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { parseApiError } from '../utils/parseApiError';

const CRM_EXCEL_IMPORT = gql`
  mutation CrmExcelImport($entity: CrmAiEntity!, $content_base64: String!) {
    crmExcelImport(entity: $entity, content_base64: $content_base64) {
      inserted
      failed
      errors { row message }
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

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const idx = result.indexOf(',');
      resolve(idx > -1 ? result.slice(idx + 1) : result);
    };
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}

export default function ExcelImportDialog({ open, entity, title, onClose, onImported, onDownloadTemplate }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ inserted: number; failed: number; errors: { row: number; message: string }[] } | null>(null);
  const [importMut, { loading }] = useMutation<{
    crmExcelImport: { inserted: number; failed: number; errors: { row: number; message: string }[] };
  }>(CRM_EXCEL_IMPORT);

  const close = () => {
    setFile(null);
    setError(null);
    setResult(null);
    onClose();
  };

  const submit = async () => {
    setError(null);
    setResult(null);
    if (!file) {
      setError('Pick an Excel file (.xlsx) to upload.');
      return;
    }
    try {
      const base64 = await fileToBase64(file);
      const res = await importMut({ variables: { entity, content_base64: base64 } });
      const payload = res.data?.crmExcelImport;
      if (!payload) throw new Error('Import returned no payload');
      setResult(payload);
      onImported({ inserted: payload.inserted, failed: payload.failed });
    } catch (err: any) {
      setError(parseApiError(err));
    }
  };

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="sm">
      <DialogTitle>
        <Stack direction="row" spacing={1} alignItems="center">
          <FileUploadIcon color="primary" />
          <span>{title}</span>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5}>
          <Typography variant="body2" color="text.secondary">
            Upload an Excel file matching the template columns. Each row becomes one lead;
            failed rows are reported below with their reason. Multi-value columns accept
            comma-separated values.
          </Typography>
          {onDownloadTemplate && (
            <Stack direction="row" spacing={1.25} alignItems="center">
              <Button size="small" variant="outlined" onClick={onDownloadTemplate}>
                Download template
              </Button>
              <Typography variant="caption" color="text.secondary">
                Contains a sample row + the instructions sheet.
              </Typography>
            </Stack>
          )}
          <Divider />
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            hidden
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <Stack direction="row" spacing={1.25} alignItems="center">
            <Button variant="outlined" startIcon={<CloudUploadIcon />} onClick={() => inputRef.current?.click()}>
              {file ? 'Replace file' : 'Choose file'}
            </Button>
            <Typography variant="body2" color="text.secondary" noWrap>{file?.name ?? 'No file selected'}</Typography>
          </Stack>
          {error && <Alert severity="error">{error}</Alert>}
          {result && (
            <Alert severity={result.failed === 0 ? 'success' : 'warning'}>
              <Typography variant="body2" fontWeight={700}>
                Imported {result.inserted} of {result.inserted + result.failed} rows
              </Typography>
              {result.errors.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="caption" color="text.secondary">Errors:</Typography>
                  <List dense disablePadding>
                    {result.errors.slice(0, 8).map((entry) => (
                      <ListItem key={`${entry.row}-${entry.message}`} sx={{ py: 0 }}>
                        <ListItemText primary={`Row ${entry.row}: ${entry.message}`} primaryTypographyProps={{ variant: 'caption' }} />
                      </ListItem>
                    ))}
                  </List>
                  {result.errors.length > 8 && (
                    <Typography variant="caption" color="text.secondary">+ {result.errors.length - 8} more rows…</Typography>
                  )}
                </Box>
              )}
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={close} disabled={loading}>Close</Button>
        <Button variant="contained" onClick={submit} disabled={loading || !file}>
          {loading ? 'Uploading…' : 'Upload & import'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
