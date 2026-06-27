import { useRef, useState } from 'react';
import { useMutation } from '@apollo/client';
import { Button } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import VerificationCardShell from './VerificationCardShell';
import {
  MAX_DOC_BYTES,
  SUBMIT_VERIFICATION,
  UPLOAD_DOCUMENT,
  type Verification,
} from './queries';

interface Props {
  item: Verification;
  onChanged: () => void;
  onError: (msg: string) => void;
}

const readAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read the file.'));
    reader.readAsDataURL(file);
  });

/** Identity verification — one image/PDF document, max 4 MB → Under Review. */
export default function IdentityCard({ item, onChanged, onError }: Readonly<Props>) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploadDoc] = useMutation(UPLOAD_DOCUMENT);
  const [submit] = useMutation(SUBMIT_VERIFICATION);
  const done = item.status === 'APPROVED';

  const onFile = async (file: File) => {
    if (file.size > MAX_DOC_BYTES) {
      onError('Please upload a document under 4 MB.');
      return;
    }
    setBusy(true);
    try {
      const fileBase64 = await readAsDataUrl(file);
      const up = await uploadDoc({
        variables: {
          fileBase64,
          fileName: file.name,
          mimeType: file.type,
          folder: '/verifications',
          allow_documents: true,
        },
      });
      const url = up.data?.uploadImageToImagekit?.url as string | undefined;
      if (!url) throw new Error('Upload failed.');
      await submit({ variables: { type: 'IDENTITY', document_url: url } });
      onChanged();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Could not submit the document.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <VerificationCardShell item={item}>
      {!done && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/*,application/pdf"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) onFile(file).catch(() => undefined);
            }}
          />
          <Button
            size="small"
            variant="outlined"
            startIcon={<UploadFileIcon />}
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            sx={{ mt: 1, borderRadius: 999, fontWeight: 900 }}
          >
            {busy ? 'Uploading…' : item.status === 'NOT_SUBMITTED' ? 'Upload document' : 'Re-upload'}
          </Button>
        </>
      )}
    </VerificationCardShell>
  );
}
