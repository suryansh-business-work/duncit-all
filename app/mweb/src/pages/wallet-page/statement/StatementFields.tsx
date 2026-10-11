import { WalletStatementFields, type WalletStatementFormFieldsProps } from '@duncit/forms';
import DateField from '../../../components/DateField';
import { useTranslation } from '../../../i18n/useTranslation';
import { useDateFormat } from '../../../utils/dateFormat';

/**
 * The statement form's fields on mWeb: the shared `WalletStatementFields`, in
 * mWeb's language and date format, with mWeb's own date picker for a custom
 * period. The two custom days are stacked — the dialog is a phone's width.
 */
export default function StatementFields(props: Readonly<WalletStatementFormFieldsProps>) {
  const { t } = useTranslation();
  return <WalletStatementFields {...props} t={t} dateFormat={useDateFormat()} DateField={DateField} />;
}
