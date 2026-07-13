import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { Box, Button, Link, Stack, Typography } from '@mui/material';
import UploadIcon from '@mui/icons-material/Upload';
import { TEST_ENV_IMAGEKIT, type EnvEntry, type RichTestResult } from '../queries';
import ResultAlert from './ResultAlert';
import { parseApiError } from '../../../utils/parseApiError';

const toBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export default function ImagekitTestPanel({ entry }: Readonly<{ entry: EnvEntry }>) {
  const [fileName, setFileName] = useState('');
  const [base64, setBase64] = useState('');
  const [result, setResult] = useState<RichTestResult | null>(null);
  const [run, { loading }] = useMutation(TEST_ENV_IMAGEKIT);

  const onPick = async (file?: File) => {
    if (!file) return;
    setResult(null);
    setFileName(file.name);
    setBase64(await toBase64(file));
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
      <Typography variant="body2" color="text.secondary">
        Uploads a file to this ImageKit account and returns the CDN path.
      </Typography>
      <Button variant="outlined" component="label">
        {fileName || 'Choose image'}
        <input hidden type="file" accept="image/*" onChange={(e) => onPick(e.target.files?.[0])} />
      </Button>
      <Button startIcon={<UploadIcon />} variant="contained" onClick={upload} disabled={loading || !base64}>
        {loading ? 'Uploading…' : 'Upload & get path'}
      </Button>
      <ResultAlert result={result} />
      {result?.url && (
        <Box>
          <Link href={result.url} target="_blank" rel="noopener" variant="caption" sx={{ wordBreak: 'break-all' }}>
            {result.url}
          </Link>
          <Box component="img" src={result.url} alt="Uploaded" sx={{ mt: 1, width: '100%', borderRadius: 1, border: 1, borderColor: 'divider' }} />
        </Box>
      )}
    </Stack>
  );
}
