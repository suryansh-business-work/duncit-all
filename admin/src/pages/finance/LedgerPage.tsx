import MenuBookIcon from '@mui/icons-material/MenuBook';
import FinancePlaceholder from './FinancePlaceholder';

export default function LedgerPage() {
  return (
    <FinancePlaceholder
      icon={<MenuBookIcon sx={{ fontSize: 32 }} />}
      title="Ledger (Expense Management)"
      description="Internal double-entry ledger for operational income and expenses."
      features={[
        'Chart of accounts with custom heads (rent, salary, marketing, etc.)',
        'Manual journal entries with attachments',
        'Vendor master and recurring expense scheduling',
        'P&L and trial balance views with date filters',
        'Reconciliation against bank statement uploads',
      ]}
    />
  );
}
