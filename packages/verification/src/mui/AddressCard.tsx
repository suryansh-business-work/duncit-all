import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { Stack, TextField } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';

import {
  ADDRESS_ROWS,
  addressValuesFrom,
  buildAddressInput,
  isAddressComplete,
} from '../address.form';
import { submissionErrorMessage } from '../error-message';
import { isVerificationLocked } from '../labels';
import type { AddressField } from '../address.form';
import type { AddressValues, Verification } from '../types';
import { useTranslation } from './i18n';
import { SUBMIT_ADDRESS_VERIFICATION } from './queries';
import VerificationCardShell from './VerificationCardShell';

interface Props {
  item: Verification;
  onChanged: () => void;
  onError: (msg: string) => void;
}

/** Address verification — a manually-entered residential address → Under Review. */
export default function AddressCard({ item, onChanged, onError }: Readonly<Props>) {
  const { t } = useTranslation();
  const [form, setForm] = useState<AddressValues>(() => addressValuesFrom(item));
  const [busy, setBusy] = useState(false);
  const [submit] = useMutation(SUBMIT_ADDRESS_VERIFICATION);
  const locked = isVerificationLocked(item.status);

  const set = (key: keyof AddressValues) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const field = (meta: AddressField) => (
    <TextField
      key={meta.name}
      size="small"
      label={t(meta.labelKey)}
      placeholder={t(meta.placeholderKey)}
      value={form[meta.name]}
      onChange={set(meta.name)}
      fullWidth
    />
  );

  const onSubmit = async () => {
    if (!isAddressComplete(form)) {
      onError(t('verification.addressRequired'));
      return;
    }
    setBusy(true);
    try {
      await submit({ variables: buildAddressInput(form) });
      onChanged();
    } catch (e) {
      onError(submissionErrorMessage(e, t('verification.addressFailed')));
    } finally {
      setBusy(false);
    }
  };

  if (locked) return <VerificationCardShell item={item} />;

  const submitLabel = busy ? t('verification.submitting') : t('verification.submitAddress');

  return (
    <VerificationCardShell item={item}>
      <Stack spacing={1.25} sx={{ mt: 1.5 }}>
        {ADDRESS_ROWS.map((row) => (
          <Stack
            key={row.map((f) => f.name).join('-')}
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.25}
          >
            {row.map(field)}
          </Stack>
        ))}
        <DuncitButton
          variant="outlined"
          disabled={busy}
          onClick={() => onSubmit().catch(() => undefined)}
          sx={{ borderRadius: 999, fontWeight: 700, alignSelf: 'flex-start' }}
        >
          {submitLabel}
        </DuncitButton>
      </Stack>
    </VerificationCardShell>
  );
}
