import { useRef, useState } from 'react';
import { useMutation } from '@apollo/client';
import { Button, Stack } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { AiMonitoringChip } from '@duncit/ai-monitoring/mui';
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
  // Approved is finished; under review is somebody else's turn. Replacing the
  // document mid-review means the admin approves one file having looked at
  // another, so the picker is gone until there is a verdict. The server
  // refuses the same submission either way.
  const locked = item.status === 'APPROVED' || item.status === 'PENDING';

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
      {!locked && (
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
          <Stack
            direction="row"
            spacing={1}
            sx={{
              alignItems: "center",
              mt: 1,
              flexWrap: 'wrap'
            }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<UploadFileIcon />}
              disabled={busy}
              onClick={() => inputRef.current?.click()}
              sx={{ borderRadius: 999, fontWeight: 700 }}
            >
              {uploadLabel}
            </Button>
            <AiMonitoringChip />
          </Stack>
        </>
      )}
    </VerificationCardShell>
  );
}
