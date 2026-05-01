import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import FinancePlaceholder from './FinancePlaceholder';

export default function PayoutCyclesPage() {
  return (
    <FinancePlaceholder
      icon={<CalendarMonthIcon sx={{ fontSize: 32 }} />}
      title="Payout Cycles"
      description="Configure payout schedules and review cycle-wise disbursements."
      features={[
        'Cycle definitions (weekly / fortnightly / monthly) per venue tier',
        'Cut-off windows and hold periods for refunds / chargebacks',
        'Auto-computed payable amount with deduction breakup',
        'Bulk payout file generation (NEFT / IMPS / UPI batch)',
        'Reconciliation against bank UTR and failure retries',
      ]}
    />
  );
}
