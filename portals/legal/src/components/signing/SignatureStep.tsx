import { Alert, Stack, TextField, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import SignaturePad from '../SignaturePad';
import type { SignatureMethod } from './types';

export interface SignatureDraft {
  fullName: string;
  designation: string;
  initials: string;
  image: string;
  method: SignatureMethod | null;
}

export const EMPTY_SIGNATURE: SignatureDraft = {
  fullName: '',
  designation: '',
  initials: '',
  image: '',
  method: null,
};

/** Everything filled in? The submit button and the server both ask this. */
export const signatureReady = (draft: SignatureDraft): boolean =>
  !!draft.fullName.trim() && !!draft.designation.trim() && !!draft.initials.trim() && !!draft.image;

interface Props {
  draft: SignatureDraft;
  methods: SignatureMethod[];
  onChange: (patch: Partial<SignatureDraft>) => void;
}

/**
 * Who is signing, in what capacity, and the mark itself.
 *
 * The signing date is shown but disabled: it is stamped by the server when the
 * signature lands, because a date the signer can type is a date the signer can
 * choose.
 */
export default function SignatureStep({ draft, methods, onChange }: Readonly<Props>) {
  const { t } = useTranslation();
  const signingDate = new Date();

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        {t('legal.sign.allRequired')}
      </Typography>
      {methods.length === 0 && <Alert severity="warning">{t('legal.sign.noMethods')}</Alert>}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label={t('legal.sign.fullName')}
          value={draft.fullName}
          onChange={(e) => onChange({ fullName: e.target.value })}
          required
          fullWidth
          autoFocus
        />
        <TextField
          label={t('legal.sign.designation')}
          value={draft.designation}
          onChange={(e) => onChange({ designation: e.target.value })}
          required
          fullWidth
        />
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label={t('legal.sign.initials')}
          value={draft.initials}
          onChange={(e) => onChange({ initials: e.target.value.slice(0, 12) })}
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
        value={draft.image}
        method={draft.method}
        typedName={draft.fullName}
        onChange={(image, method) => onChange({ image, method })}
      />
    </Stack>
  );
}
