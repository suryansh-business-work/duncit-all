import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import { useTranslation } from '@duncit/shell';
import type { Control } from 'react-hook-form';
import SectionCard from '../../detail/SectionCard';
import PayoutFields from '../../../shared/PayoutFields';
import type { VenueFormValues } from '../types';
import { sectionAnchor } from './venue-editor-sections';

/**
 * Payout Method — where the venue's money goes. Its own section, as on the
 * owner's form, rather than a footnote under the owner's contact.
 *
 * Every field is optional for staff (a venue is often registered before its
 * bank details are known), but one that is filled in is checked against the
 * same format the owner's form uses — see `bankSchema`.
 */
export default function PayoutSection({
  control,
}: Readonly<{ control: Control<VenueFormValues> }>) {
  const { t } = useTranslation();

  return (
    <SectionCard
      id={sectionAnchor('payout')}
      icon={<AccountBalanceIcon color="primary" />}
      title={t('directory.venueEditor.sectionPayout')}
    >
      <PayoutFields control={control} prefix="bank_account" />
    </SectionCard>
  );
}
