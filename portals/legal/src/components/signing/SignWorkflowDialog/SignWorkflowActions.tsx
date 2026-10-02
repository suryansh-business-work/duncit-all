import { Box, DialogActions } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { signatureReady, type SignatureDraft } from '../SignatureStep';

interface Props {
  step: number;
  setStep: (step: number) => void;
  alreadySigned: boolean;
  signing: boolean;
  pdfUrl: string;
  downloadLabel: string;
  download: () => void;
  draft: SignatureDraft;
  submitSignature: () => Promise<void>;
  onClose: () => void;
}

/** Download, close and the per-step forward/back buttons. */
export function SignWorkflowActions({
  step,
  setStep,
  alreadySigned,
  signing,
  pdfUrl,
  downloadLabel,
  download,
  draft,
  submitSignature,
  onClose,
}: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <DialogActions>
      <DuncitButton startIcon={<DownloadIcon />} onClick={download} disabled={!pdfUrl}>
        {downloadLabel}
      </DuncitButton>
      <Box sx={{ flex: 1 }} />
      <DuncitButton onClick={onClose} disabled={signing}>
        {t('shell.common.close')}
      </DuncitButton>
      {step === 0 && !alreadySigned && (
        <DuncitButton variant="contained" onClick={() => setStep(1)}>
          {t('legal.sign.toSignature')}
        </DuncitButton>
      )}
      {step === 1 && (
        <>
          <DuncitButton onClick={() => setStep(0)} disabled={signing}>
            {t('legal.sign.back')}
          </DuncitButton>
          <DuncitButton
            variant="contained"
            disabled={!signatureReady(draft) || signing}
            onClick={submitSignature}
          >
            {signing ? t('legal.sign.signing') : t('legal.sign.signAction')}
          </DuncitButton>
        </>
      )}
    </DialogActions>
  );
}
