import { type Control } from 'react-hook-form';
import { Stack, type SxProps, type Theme } from '@mui/material';
import ContactSummaryCard from './ContactSummaryCard';
import BillingAddressSection from './BillingAddressSection';
import GstSection from './GstSection';
import type { CheckoutContact, CheckoutForm } from './queries';
import type { PostalAddressParts } from './checkout';

interface Props {
  control: Control<CheckoutForm>;
  fieldSx: SxProps<Theme>;
  mainAddress: PostalAddressParts | null;
  hasMainAddress: boolean;
  contact: CheckoutContact | null;
  contactLoading: boolean;
}

/**
 * Checkout contact + billing block: a read-only contact summary (edited from the
 * profile, not here) over the Billing address and GST details accordions.
 */
export default function CheckoutContactFields({ control, fieldSx, mainAddress, hasMainAddress, contact, contactLoading }: Readonly<Props>) {
  return (
    <Stack spacing={1.5}>
      <ContactSummaryCard control={control} contact={contact} loading={contactLoading} />
      <BillingAddressSection
        control={control}
        fieldSx={fieldSx}
        mainAddress={mainAddress}
        hasMainAddress={hasMainAddress}
      />
      <GstSection control={control} fieldSx={fieldSx} />
    </Stack>
  );
}
