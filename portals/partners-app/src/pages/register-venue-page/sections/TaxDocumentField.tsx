import { FormHelperText, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import DocumentFileControl from './DocumentFileControl';

interface Props {
  /** The document type this switch requires, e.g. "GST Certificate" (from the registration config). */
  type: string;
  url: string;
  locked: boolean;
  /** The switch's "document required" error, if any. */
  error?: string;
  onUpload: () => void;
  onRemove: () => void;
  testId: string;
}

/** The proof document a GSTIN / PAN switch asks for — shown only while that switch is on. */
export default function TaxDocumentField({ type, url, locked, error, onUpload, onRemove, testId }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={0.5} data-testid={testId}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {type}
        </Typography>
        <DocumentFileControl url={url} locked={locked} onUpload={onUpload} onClear={onRemove} testId={testId} />
      </Stack>
      <FormHelperText error={Boolean(error)} sx={{ mt: 0 }} role={error ? 'alert' : undefined}>
        {error ?? t('partners.registerVenuePage.taxDocumentHint')}
      </FormHelperText>
    </Stack>
  );
}
