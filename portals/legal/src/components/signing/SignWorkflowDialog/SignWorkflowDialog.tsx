import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Dialog, DialogContent, Step, StepLabel, Stepper } from '@mui/material';
import { notifySuccess } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import PreviewStep from '../PreviewStep';
import SignatureStep, { EMPTY_SIGNATURE, type SignatureDraft } from '../SignatureStep';
import ShareStep from '../ShareStep';
import type { SignableRecord, SignatureMethod, SigningOperations } from '../types';
import { fileNameFor, STEP_KEYS, toPdfUrl } from './helpers';
import { SignWorkflowTitle } from './SignWorkflowTitle';
import { SignWorkflowActions } from './SignWorkflowActions';

interface Props {
  /** What is being signed; null keeps the dialog closed. */
  record: SignableRecord | null;
  /** The queries and mutations for whichever module owns it. */
  ops: SigningOperations;
  onClose: () => void;
  onSigned: () => void;
}

/**
 * Preview it, sign it, then send it on — for a legal document OR a contract.
 *
 * ONE dialog for both, with the four operations handed in (rule 40). The
 * workflow used to be bolted onto Documents alone, which is exactly why
 * Contracts had none: a second copy is the version that stops getting fixes.
 */
export default function SignWorkflowDialog({ record, ops, onClose, onSigned }: Readonly<Props>) {
  const { t } = useTranslation();
  const open = !!record;
  const alreadySigned = record?.signing_status === 'SIGNED';
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<SignatureDraft>(EMPTY_SIGNATURE);
  const [shareTo, setShareTo] = useState('');
  const [shareMessage, setShareMessage] = useState('');

  const { data: methodsData } = useQuery<Record<string, SignatureMethod[]>>(ops.methodsQuery, {
    skip: !open,
    fetchPolicy: 'cache-first',
  });
  const methods = methodsData?.[ops.methodsField] ?? [];

  const { data: pdfData, loading: pdfLoading } = useQuery<Record<string, string>>(ops.pdfQuery, {
    variables: { id: record?.id },
    skip: !open,
    fetchPolicy: 'network-only',
  });
  const base64 = pdfData?.[ops.pdfField] ?? '';
  const pdfUrl = base64 ? toPdfUrl(base64) : '';
  // Named at render: Download is only live while the dialog holds a record and
  // its PDF (a skipped query has no data), so the handler has nothing to check.
  const fileName = record ? fileNameFor(record.title, alreadySigned) : '';

  const [signMut, { loading: signing }] = useMutation<unknown>(ops.signMutation);
  const [shareMut, { loading: sharing }] = useMutation<unknown>(ops.shareMutation);

  // A signed record opens straight on the last step: there is nothing left to
  // do but read it, keep it or send it.
  useEffect(() => {
    if (!open) return;
    setStep(alreadySigned ? 2 : 0);
    setError(null);
    setDraft(EMPTY_SIGNATURE);
    setShareTo('');
    setShareMessage('');
  }, [open, alreadySigned, record?.id]);

  const download = () => {
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = fileName;
    link.click();
  };

  const submitSignature = async () => {
    if (!record) return;
    setError(null);
    try {
      await signMut({
        variables: {
          id: record.id,
          input: {
            full_name: draft.fullName.trim(),
            designation: draft.designation.trim(),
            initials: draft.initials.trim(),
            signature_image: draft.image,
            signature_method: draft.method,
          },
        },
      });
      notifySuccess(t('legal.sign.signedToast'));
      onSigned();
      setStep(2);
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  const submitShare = async () => {
    if (!record) return;
    setError(null);
    const to = shareTo.trim();
    try {
      await shareMut({ variables: { id: record.id, to, message: shareMessage.trim() } });
      notifySuccess(t('legal.sign.sentTo', { vars: { email: to } }));
      setShareTo('');
      setShareMessage('');
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  const statusLabel = alreadySigned ? t('legal.sign.signed') : t('legal.sign.unsigned');
  const downloadLabel = alreadySigned
    ? t('legal.sign.downloadSigned')
    : t('legal.sign.downloadUnsigned');

  return (
    <Dialog open={open} onClose={() => !signing && onClose()} fullWidth maxWidth="md">
      <SignWorkflowTitle
        title={record?.title ?? t('legal.sign.untitled')}
        alreadySigned={alreadySigned}
        statusLabel={statusLabel}
      />

      <DialogContent dividers>
        <Stepper activeStep={step} sx={{ mb: 2 }}>
          {STEP_KEYS.map((stepKey) => (
            <Step key={stepKey}>
              <StepLabel>{t(stepKey)}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {step !== 1 && <PreviewStep pdfUrl={pdfUrl} loading={pdfLoading} />}

        {step === 1 && (
          <SignatureStep
            draft={draft}
            methods={methods}
            onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))}
          />
        )}

        {step === 2 && (
          <ShareStep
            to={shareTo}
            message={shareMessage}
            sending={sharing}
            onToChange={setShareTo}
            onMessageChange={setShareMessage}
            onSend={submitShare}
          />
        )}
      </DialogContent>

      <SignWorkflowActions
        step={step}
        setStep={setStep}
        alreadySigned={alreadySigned}
        signing={signing}
        pdfUrl={pdfUrl}
        downloadLabel={downloadLabel}
        download={download}
        draft={draft}
        submitSignature={submitSignature}
        onClose={onClose}
      />
    </Dialog>
  );
}
