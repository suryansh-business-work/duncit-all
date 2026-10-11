import { useDateFormat } from '@duncit/app-settings';
import { WalletStatementFields, type WalletStatementFormFieldsProps } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import DateField from '../../../components/DateField';

/**
 * The statement form's fields on the partner console: the shared
 * `WalletStatementFields`, in the console's language and date format, with the
 * console's own date picker. The two custom days sit side by side from `sm` up.
 */
export default function StatementFields(props: Readonly<WalletStatementFormFieldsProps>) {
  const { t } = useTranslation();
  return (
    <WalletStatementFields {...props} datesInline t={t} dateFormat={useDateFormat()} DateField={DateField} />
  );
}
