import { useRef, useState } from 'react';
import { useMutation } from '@apollo/client';
import { Button } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { useTranslation } from '@duncit/app-settings';
import { useImagekitBase64Upload } from '@duncit/media-picker';
import VerificationCardShell from './VerificationCardShell';
import { MAX_DOC_BYTES, SUBMIT_VERIFICATION, type Verification } from './queries';

interface Props {
  item: Verification;
  onChanged: () => void;
  onError: (msg: string) => void;
}

/** Identity verification — one image/PDF document, max 4 MB → Under Review. */
export default function IdentityCard({ item, onChanged, onError }: Readonly<Props>) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const { upload } = useImagekitBase64Upload();
  const [submit] = useMutation(SUBMIT_VERIFICATION);
  const done = item.status === 'APPROVED';

  const onFile = async (file: File) => {
    if (file.size > MAX_DOC_BYTES) {
      onError(t('partners.verification.tooLarge'));
      return;
    }
    setBusy(true);
    try {
      const { url } = await upload(file, { folder: '/verifications', allowDocuments: true });
      await submit({ variables: { type: 'IDENTITY', document_url: url } });
      onChanged();
    } catch (e) {
      onError(e instanceof Error ? e.message : t('partners.verification.docFailed'));
    } finally {
      setBusy(false);
    }
  };

  const idleLabel =
    item.status === 'NOT_SUBMITTED'
      ? t('partners.verification.upload')
      : t('partners.verification.reupload');
  const uploadLabel = busy ? t('partners.verification.uploading') : idleLabel;

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
            sx={{ mt: 1, borderRadius: 999, fontWeight: 700 }}
          >
            {uploadLabel}
          </Button>
        </>
      )}
    </VerificationCardShell>
  );
}
