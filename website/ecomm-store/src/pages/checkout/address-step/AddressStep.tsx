import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { FormControlLabel, Radio, RadioGroup, Stack, Typography } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import { DuncitButton } from '@duncit/buttons';
import { notifyError } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';

import { useStoreSession } from '../../../app/providers/SessionProvider';
import { emptyAddress, type AddressValues } from '../../../components/address-form';
import { COUNTRY } from '../../../config/env';
import { MY_ADDRESSES, SAVE_ADDRESS, type UserAddress } from '../../../graphql/account';
import { preferredAddress, toAddressValues } from '../../../lib/addresses';
import { usePincode } from '../../../lib/usePincode';
import { useStoreT } from '../../../i18n';
import type { CheckoutControls } from '../useCheckoutState';
import { CheckoutAddressForm } from './checkout-address.form';
import type { CheckoutAddressValues } from './checkout-address.types';

const oneLine = (a: UserAddress) => [a.line1, a.line2, a.city, a.state, a.pincode].filter(Boolean).join(', ');

/** Step 2: a saved address (signed in) or a new one. */
export function AddressStep({ controls }: Readonly<{ controls: CheckoutControls }>) {
  const { t } = useStoreT();
  const { signedIn, me } = useStoreSession();
  const [pincode, setPincode] = usePincode();
  const { data } = useQuery(MY_ADDRESSES, { skip: !signedIn });
  const saved = data?.myAddresses ?? [];
  const [chosen, setChosen] = useState<string>(() => preferredAddress(saved)?.id ?? '');
  const [adding, setAdding] = useState(false);
  const [saveAddress] = useMutation(SAVE_ADDRESS, { refetchQueries: ['EcommStoreMyAddresses'] });
  const selected = saved.find((a) => a.id === (chosen || preferredAddress(saved)?.id));
  const initial = controls.state.address ?? { ...emptyAddress(pincode), name: controls.state.contact?.name ?? '', phone: controls.state.contact?.phone ?? '' };

  const takeNew = async ({ save, ...address }: CheckoutAddressValues) => {
    setPincode(address.pincode);
    if (save) {
      const input = { ...address, label: t('ecommStore.address.defaultLabel'), email: me?.email ?? '', country: COUNTRY };
      await saveAddress({ variables: { input } }).catch((error: unknown) => notifyError(parseApiError(error)));
    }
    controls.setAddress(address);
  };
  const takeSaved = (address: UserAddress) => {
    const values: AddressValues = toAddressValues(address);
    setPincode(values.pincode);
    controls.setAddress(values);
  };

  if (!signedIn || saved.length === 0 || adding) {
    return <CheckoutAddressForm initial={initial} canSave={signedIn} onDone={takeNew} />;
  }
  return (
    <Stack spacing={2}>
      <RadioGroup value={selected?.id ?? ''} onChange={(event) => setChosen(event.target.value)} aria-label={t('ecommStore.checkout.savedAddresses')}>
        {saved.map((address) => (
          <FormControlLabel
            key={address.id}
            value={address.id}
            control={<Radio />}
            sx={{ alignItems: 'flex-start', py: 1 }}
            label={
              <Stack>
                <Typography sx={{ fontWeight: 800 }}>{`${address.label} · ${address.name}`}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {oneLine(address)}
                </Typography>
              </Stack>
            }
          />
        ))}
      </RadioGroup>
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
        <DuncitButton variant="contained" size="large" disabled={!selected} onClick={() => selected && takeSaved(selected)}>
          {t('ecommStore.checkout.deliverHere')}
        </DuncitButton>
        <DuncitButton startIcon={<AddRoundedIcon />} onClick={() => setAdding(true)}>
          {t('ecommStore.checkout.newAddress')}
        </DuncitButton>
      </Stack>
    </Stack>
  );
}
