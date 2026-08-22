import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import SendIcon from '@mui/icons-material/Send';
import { notifySuccess } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import SignaturePad from '../../components/SignaturePad';
import {
  LEGAL_DOCUMENT_PDF,
  LEGAL_SIGNATURE_METHODS,
  SHARE_LEGAL_DOCUMENT,
  SIGN_LEGAL_DOCUMENT,
  type LegalDocumentListItem,
  type SignatureMethod,
} from '../../graphql/documents';
import { useTranslation } from '@duncit/shell';

/** Step labels are copy, so the list is built from the active catalogue. */
const STEP_KEYS = ['legal.sign.stepPreview', 'legal.sign.stepSignature', 'legal.sign.stepDone'];

/** Turn the base64 the server sends into something the browser can show and save. */
const toPdfUrl = (base64: string) => `data:application/pdf;base64,${base64}`;

interface Props {
  doc: LegalDocumentListItem | null;
  onClose: () => void;
  onSigned: () => void;
}

/**
 * Preview a contract, sign it, then send it on.
 *
 * The preview comes first deliberately: a signature is worth nothing if the
 * signer could not read what they were signing. The PDF renders in an <object>,
 * so zooming and paging are the viewer's own — no second PDF engine shipped to
 * do what the browser already does well.
 */
export default function SignContractDialog({ doc, onClose, onSigned }: Readonly<Props>) {
  const { t } = useTranslation();
  const open = !!doc;
  const alreadySigned = doc?.signing_status === 'SIGNED';
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [designation, setDesignation] = useState('');
  const [initials, setInitials] = useState('');
  const [image, setImage] = useState('');
  const [method, setMethod] = useState<SignatureMethod | null>(null);
  const [shareTo, setShareTo] = useState('');
  const [shareMessage, setShareMessage] = useState('');

  const { data: methodsData } = useQuery<{ legalSignatureMethods: SignatureMethod[] }>(
    LEGAL_SIGNATURE_METHODS,
    { skip: !open, fetchPolicy: 'cache-first' },
  );
  const methods = useMemo(
    () => methodsData?.legalSignatureMethods ?? [],
    [methodsData],
  );

  const { data: pdfData, loading: pdfLoading } = useQuery<{ legalDocumentPdfBase64: string }>(
    LEGAL_DOCUMENT_PDF,
    { variables: { id: doc?.id }, skip: !open, fetchPolicy: 'network-only' },
  );
  const pdfUrl = pdfData?.legalDocumentPdfBase64
    ? toPdfUrl(pdfData.legalDocumentPdfBase64)
    : '';

  const [signMut, { loading: signing }] = useMutation(SIGN_LEGAL_DOCUMENT);
  const [shareMut, { loading: sharing }] = useMutation(SHARE_LEGAL_DOCUMENT);

  // A signed contract opens straight on the last step: there is nothing left to
  // do but read it, keep it or send it.
  useEffect(() => {
    if (!open) return;
    setStep(alreadySigned ? 2 : 0);
    setError(null);
    setFullName('');
    setDesignation('');
    setInitials('');
    setImage('');
    setMethod(null);
    setShareTo('');
    setShareMessage('');
  }, [open, alreadySigned, doc?.id]);

  const signingDate = new Date();
  const ready = !!fullName.trim() && !!designation.trim() && !!initials.trim() && !!image;

  const download = () => {
    if (!pdfUrl || !doc) return;
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = `${doc.name.replaceAll(/[^\w.-]+/g, '-')}${alreadySigned ? '-signed' : ''}.pdf`;
    link.click();
  };

  const submitSignature = async () => {
    if (!doc) return;
    setError(null);
    try {
      await signMut({
        variables: {
          id: doc.id,
          input: {
            full_name: fullName.trim(),
            designation: designation.trim(),
            initials: initials.trim(),
            signature_image: image,
            signature_method: method,
          },
        },
      });
      notifySuccess('Contract signed');
      onSigned();
      setStep(2);
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  const submitShare = async () => {
    if (!doc) return;
    setError(null);
    try {
      await shareMut({
        variables: { id: doc.id, to: shareTo.trim(), message: shareMessage.trim() },
      });
      notifySuccess(`Sent to ${shareTo.trim()}`);
      setShareTo('');
      setShareMessage('');
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  return (
    <Dialog open={open} onClose={() => !signing && onClose()} fullWidth maxWidth="md">
      <DialogTitle>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box sx={{ flex: 1, minWidth: 0 }}>{doc?.name ?? 'Contract'}</Box>
          <Chip
            size="small"
            color={alreadySigned ? 'success' : 'default'}
            variant={alreadySigned ? 'filled' : 'outlined'}
            label={alreadySigned ? 'Signed' : 'Unsigned'}
          />
        </Stack>
      </DialogTitle>

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

        {step !== 1 && (
          <Stack spacing={1.5}>
            {pdfLoading && !pdfUrl ? (
              <Box sx={{ py: 6, textAlign: 'center' }}>
                <CircularProgress size={24} />
              </Box>
            ) : (
              <Box
                component="object"
                data={pdfUrl}
                type="application/pdf"
                sx={{ width: '100%', height: 460, border: 1, borderColor: 'divider', borderRadius: 1 }}
              >
                <Typography variant="body2" sx={{ p: 2 }}>
                  Your browser cannot display PDFs inline. Download the contract to read it.
                </Typography>
              </Box>
            )}
            <Typography variant="caption" color="text.secondary">
              Use the viewer&apos;s own controls to zoom and move between pages.
            </Typography>
          </Stack>
        )}

        {step === 1 && (
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Every field is required — a signature without a name, a role and a date is not
              evidence of anything.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label={t('legal.sign.fullName')}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                fullWidth
                autoFocus
              />
              <TextField
                label={t('legal.sign.designation')}
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                required
                fullWidth
              />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label={t('legal.sign.initials')}
                value={initials}
                onChange={(e) => setInitials(e.target.value.slice(0, 12))}
                required
                sx={{ width: { sm: 160 } }}
              />
              <TextField
                label={t('legal.sign.signingDate')}
                value={signingDate.toDateString()}
                helperText={t('legal.sign.signingDateHint')}
                disabled
                fullWidth
              />
            </Stack>
            <SignaturePad
              methods={methods}
              value={image}
              method={method}
              typedName={fullName}
              onChange={(next, how) => {
                setImage(next);
                setMethod(how);
              }}
            />
          </Stack>
        )}

        {step === 2 && (
          <Stack spacing={2} sx={{ mt: 2 }}>
            <Alert severity="success">
              This contract is signed and locked. It can no longer be edited.
            </Alert>
            <Typography variant="subtitle2" fontWeight={700}>
              Share it
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label={t('legal.sign.sendTo')}
                value={shareTo}
                onChange={(e) => setShareTo(e.target.value)}
                placeholder="name@company.com"
                fullWidth
              />
              <Button
                variant="contained"
                startIcon={<SendIcon />}
                disabled={sharing || !/^\S+@\S+\.\S+$/.test(shareTo.trim())}
                onClick={submitShare}
                sx={{ flexShrink: 0 }}
              >
                {sharing ? 'Sending…' : 'Email'}
              </Button>
            </Stack>
            <TextField
              label={t('legal.sign.message')}
              value={shareMessage}
              onChange={(e) => setShareMessage(e.target.value)}
              multiline
              minRows={2}
              fullWidth
            />
          </Stack>
        )}
      </DialogContent>

      <DialogActions>
        <Button startIcon={<DownloadIcon />} onClick={download} disabled={!pdfUrl}>
          Download {alreadySigned ? 'signed' : 'unsigned'}
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose} disabled={signing}>
          Close
        </Button>
        {step === 0 && !alreadySigned && (
          <Button variant="contained" onClick={() => setStep(1)}>
            Signature
          </Button>
        )}
        {step === 1 && (
          <>
            <Button onClick={() => setStep(0)} disabled={signing}>
              Back
            </Button>
            <Button variant="contained" disabled={!ready || signing} onClick={submitSignature}>
              {signing ? 'Signing…' : 'Sign contract'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
