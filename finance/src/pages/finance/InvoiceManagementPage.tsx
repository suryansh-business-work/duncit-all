import DescriptionIcon from '@mui/icons-material/Description';
import FinancePlaceholder from './FinancePlaceholder';

export default function InvoiceManagementPage() {
  return (
    <FinancePlaceholder
      icon={<DescriptionIcon sx={{ fontSize: 32 }} />}
      title="Invoice Management"
      description="Generate, view and resend tax invoices for users and venues."
      features={[
        'Auto-generated tax invoices on successful payment',
        'Numbering series per financial year',
        'Customer + venue invoice copies with download / email',
        'Credit notes and amendments with audit trail',
        'Bulk export by date range or status',
      ]}
    />
  );
}
