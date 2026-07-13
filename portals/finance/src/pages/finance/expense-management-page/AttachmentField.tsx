import { useRef, useState } from 'react';
import { useMutation } from '@apollo/client';
import { Button, FormHelperText, Stack, TextField } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { UPLOAD_FILE } from './queries';

interface Props {
  value: string;
  onChange: (url: string) => void;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1] ?? '');
    reader.onerror = () => reject(new Error('Could not read the file'));
    reader.readAsDataURL(file);
  });
}

/** Receipt attachment: paste a URL or upload a file (ImageKit) via a dialog. */
export default function AttachmentField({ value, onChange }: Readonly<Props>) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [upload, { loading }] = useMutation(UPLOAD_FILE);
  const [error, setError] = useState<string | null>(null);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    try {
      const fileBase64 = await fileToBase64(file);
      const res = await upload({
        variables: { fileBase64, fileName: file.name, mimeType: file.type, folder: '/expenses' },
      });
      const url = res.data?.uploadImageToImagekit?.url;
      if (url) onChange(url);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <Stack spacing={0.5}>
      <Stack direction="row" spacing={1} alignItems="flex-start">
        <TextField label="Receipt / attachment URL" value={value} onChange={(e) => onChange(e.target.value)} fullWidth />
        <Button variant="outlined" startIcon={<UploadFileIcon />} onClick={() => inputRef.current?.click()} disabled={loading} sx={{ mt: 0.5, whiteSpace: 'nowrap' }}>
          {loading ? 'Uploading…' : 'Upload'}
        </Button>
      </Stack>
      <input ref={inputRef} type="file" hidden onChange={onFile} accept="image/*,.pdf" />
      {error && <FormHelperText error>{error}</FormHelperText>}
    </Stack>
  );
}
