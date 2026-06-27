import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { Button, Stack, TextField } from '@mui/material';
import VerificationCardShell from './VerificationCardShell';
import { SUBMIT_ADDRESS_VERIFICATION, type Verification } from './queries';

interface Props {
  item: Verification;
  onChanged: () => void;
  onError: (msg: string) => void;
}

type AddressForm = {
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
};

const initialForm = (item: Verification): AddressForm => ({
  line1: item.address?.line1 ?? '',
  line2: item.address?.line2 ?? '',
  city: item.address?.city ?? '',
  state: item.address?.state ?? '',
  pincode: item.address?.pincode ?? '',
  country: item.address?.country ?? '',
});

/** Address verification — a manually-entered residential address → Under Review. */
export default function AddressCard({ item, onChanged, onError }: Readonly<Props>) {
  const [form, setForm] = useState<AddressForm>(() => initialForm(item));
  const [busy, setBusy] = useState(false);
  const [submit] = useMutation(SUBMIT_ADDRESS_VERIFICATION);
  const done = item.status === 'APPROVED';

  const set = (key: keyof AddressForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const onSubmit = async () => {
    if (!form.line1.trim() || !form.city.trim() || !form.state.trim() || !form.pincode.trim()) {
      onError('Address line, city, state and pincode are required.');
      return;
    }
    setBusy(true);
    try {
      await submit({
        variables: {
          line1: form.line1.trim(),
          line2: form.line2.trim() || null,
          city: form.city.trim(),
          state: form.state.trim(),
          pincode: form.pincode.trim(),
          country: form.country.trim() || null,
        },
      });
      onChanged();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Could not submit the address.');
    } finally {
      setBusy(false);
    }
  };

  if (done) return <VerificationCardShell item={item} />;

  return (
    <VerificationCardShell item={item}>
      <Stack spacing={1.25} sx={{ mt: 1.5 }}>
        <TextField size="small" label="Address line 1" value={form.line1} onChange={set('line1')} fullWidth />
        <TextField size="small" label="Address line 2 (optional)" value={form.line2} onChange={set('line2')} fullWidth />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
          <TextField size="small" label="State" value={form.state} onChange={set('state')} fullWidth />
          <TextField size="small" label="City" value={form.city} onChange={set('city')} fullWidth />
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
          <TextField size="small" label="Pincode" value={form.pincode} onChange={set('pincode')} fullWidth />
          <TextField size="small" label="Country (optional)" value={form.country} onChange={set('country')} fullWidth />
        </Stack>
        <Button
          variant="outlined"
          disabled={busy}
          onClick={() => onSubmit().catch(() => undefined)}
          sx={{ borderRadius: 999, fontWeight: 900, alignSelf: 'flex-start' }}
        >
          {busy ? 'Submitting…' : 'Submit address'}
        </Button>
      </Stack>
    </VerificationCardShell>
  );
}
