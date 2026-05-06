import StorefrontIcon from '@mui/icons-material/Storefront';
import FinancePlaceholder from './FinancePlaceholder';

export default function VenueFinancePage() {
  return (
    <FinancePlaceholder
      icon={<StorefrontIcon sx={{ fontSize: 32 }} />}
      title="Venue Finance Management"
      description="Track earnings, deductions and dues per venue partner."
      features={[
        'Per-venue revenue dashboard with trend charts',
        'Commission, GST and convenience-fee breakup per booking',
        'Adjustments, penalties and bonus credits',
        'Statement of accounts (downloadable PDF / CSV)',
        'Outstanding dues + payable summary feeding payouts',
      ]}
    />
  );
}
