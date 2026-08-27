import { useRef, useState } from 'react';
import { useMutation } from '@apollo/client';
import { Stack } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { DuncitButton } from '@duncit/buttons';
import { AiMonitoringChip } from '@duncit/ai-monitoring/mui';
import { useImagekitBase64Upload } from '@duncit/media-picker';

import { DOCUMENT_ACCEPT, isDocumentTooLarge } from '../documents';
import { submissionErrorMessage } from '../error-message';
import { isVerificationLocked, uploadLabelKey } from '../labels';
import type { Verification } from '../types';
import { useTranslation } from './i18n';
import { SUBMIT_VERIFICATION } from './queries';
import VerificationCardShell from './VerificationCardShell';

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
  const locked = isVerificationLocked(item.status);

  const onFile = async (file: File) => {
    if (isDocumentTooLarge({ size: file.size })) {
      onError(t('verification.tooLarge'));
      return;
    }
    setBusy(true);
    try {
      const { url } = await upload(file, { folder: '/verifications', allowDocuments: true });
      await submit({ variables: { type: 'IDENTITY', document_url: url } });
      onChanged();
    } catch (e) {
      onError(submissionErrorMessage(e, t('verification.docFailed')));
    } finally {
      setBusy(false);
    }
  };

  const idleLabel = t(uploadLabelKey(item.status));
  const uploadLabel = busy ? t('verification.uploading') : idleLabel;

  if (locked) return <VerificationCardShell item={item} />;

  return (
    <VerificationCardShell item={item}>
      <input
        ref={inputRef}
        type="file"
        accept={DOCUMENT_ACCEPT}
        hidden
        data-testid="verification-file-input"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) onFile(file).catch(() => undefined);
        }}
      />
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: 'center', mt: 1, flexWrap: 'wrap' }}
      >
        <DuncitButton
          size="small"
          variant="outlined"
          startIcon={<UploadFileIcon />}
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          sx={{ borderRadius: 999, fontWeight: 700 }}
        >
          {uploadLabel}
        </DuncitButton>
        <AiMonitoringChip />
      </Stack>
    </VerificationCardShell>
  );
}
