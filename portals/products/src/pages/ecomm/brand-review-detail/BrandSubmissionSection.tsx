import { Divider, Stack } from '@mui/material';
import { InfoRow } from '@duncit/ui';
import { useDateFormat } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import BrandReviewDetails from '../BrandReviewDetails';
import type { EcommBrandRow } from '../queries';
import BrandWizardSteps from './BrandWizardSteps';

interface Props {
  brand: EcommBrandRow;
}

const DASH = '—';

/** Everything the partner submitted: the shared review details plus the
 * address, business and payout facts the dialog has no room for, under the
 * wizard progress so a reviewer reads "what is missing" before "what is here". */
export default function BrandSubmissionSection({ brand }: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat({ timeZoneAware: true });
  const address = [brand.address_line1, brand.city, brand.state, brand.postal_code, brand.country]
    .filter(Boolean)
    .join(', ');
  return (
    <Stack spacing={2}>
      <BrandWizardSteps completion={brand.completion} />
      <Divider />
      <BrandReviewDetails brand={brand} />
      <InfoRow label={t('products.brandForm.address')} value={address || DASH} />
      <InfoRow label={t('products.brandForm.establishedYear')} value={brand.established_year ?? DASH} />
      <Divider />
      <InfoRow label={t('products.brandForm.accountHolder')} value={brand.account_holder_name || DASH} />
      <InfoRow label={t('products.brandForm.accountNumber')} value={brand.account_number || DASH} />
      <InfoRow label={t('products.brandForm.ifsc')} value={brand.ifsc_code || DASH} />
      <InfoRow label={t('products.brandForm.upi')} value={brand.upi_id || DASH} />
      {brand.approved_at && (
        <InfoRow label={t('products.brandReview.approvedAt')} value={formatDateTime(brand.approved_at)} />
      )}
      {brand.rejected_at && (
        <InfoRow label={t('products.brandReview.rejectedAt')} value={formatDateTime(brand.rejected_at)} />
      )}
      {brand.reviewer_notes && (
        <InfoRow label={t('products.review.reviewerNotes')} value={brand.reviewer_notes} />
      )}
    </Stack>
  );
}
