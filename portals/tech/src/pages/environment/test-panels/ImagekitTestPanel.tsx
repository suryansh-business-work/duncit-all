import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Box, Link, Stack, Typography } from '@mui/material';
import UploadIcon from '@mui/icons-material/Upload';
import { DuncitButton } from '@duncit/buttons';
import { TEST_ENV_IMAGEKIT, type EnvEntry, type RichTestResult } from '../queries';
import ResultAlert from './ResultAlert';
import { fileToDataUrl, parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';

export default function ImagekitTestPanel({ entry }: Readonly<{ entry: EnvEntry }>) {
  const { t } = useTranslation();
  const [fileName, setFileName] = useState('');
  const [base64, setBase64] = useState('');
  const [result, setResult] = useState<RichTestResult | null>(null);
  const [run, { loading }] = useMutation<any>(TEST_ENV_IMAGEKIT);

  const onPick = async (file?: File) => {
    if (!file) return;
    setResult(null);
    setFileName(file.name);
    setBase64(await fileToDataUrl(file));
  };

  const upload = async () => {
    setResult(null);
    try {
      const res = await run({ variables: { id: entry.id, fileBase64: base64, fileName } });
      setResult(res.data?.testEnvImagekitUpload ?? null);
    } catch (err) {
      setResult({ ok: false, message: parseApiError(err) });
    }
  };

  return (
    <Stack spacing={1.5}>
      <Typography variant="body2" sx={{
        color: "text.secondary"
      }}>
        Uploads a file to this ImageKit account and returns the CDN path.
      </Typography>
      <DuncitButton variant="outlined" component="label">
        {fileName || 'Choose image'}
        <input hidden type="file" accept="image/*" onChange={(e) => onPick(e.target.files?.[0])} />
      </DuncitButton>
      <DuncitButton startIcon={<UploadIcon />} variant="contained" onClick={upload} disabled={loading || !base64}>
        {loading ? 'Uploading…' : 'Upload & get path'}
      </DuncitButton>
      <ResultAlert result={result} />
      {result?.url && (
        <Box>
          <Link href={result.url} target="_blank" rel="noopener" variant="caption" sx={{ wordBreak: 'break-all' }}>
            {result.url}
          </Link>
          <Box component="img" src={result.url} alt={t('tech.environment.uploaded')} sx={{ mt: 1, width: '100%', borderRadius: 1, border: 1, borderColor: 'divider' }} />
        </Box>
      )}
    </Stack>
  );
}
