import ShieldIcon from '@mui/icons-material/Shield';
import FinancePlaceholder from './FinancePlaceholder';

export default function InsuranceManagementPage() {
  return (
    <FinancePlaceholder
      icon={<ShieldIcon sx={{ fontSize: 32 }} />}
      title="Insurance Management"
      description="Manage insurance policies attached to bookings and venues."
      features={[
        'Active policy registry (player, venue, equipment)',
        'Per-booking insurance opt-in pricing rules',
        'Claims intake and status tracking',
        'Provider-wise reconciliation and premium payouts',
        'Document vault for policy PDFs and claim attachments',
      ]}
    />
  );
}
