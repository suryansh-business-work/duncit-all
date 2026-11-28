import { Chip, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { HR_PAY_TYPE_KEYS, formatCurrency, type HrPayLineRecord } from '@duncit/utils';

/** One revision's pay lines: name, type, monthly amount and whether it follows the monthly target. */
export default function PayLinesTable({ lines, currency }: Readonly<{ lines: readonly HrPayLineRecord[]; currency: string }>) {
  const { t } = useTranslation();
  return (
    <Table size="small" aria-label={t('hrEmployee.field.compensation')}>
      <TableHead>
        <TableRow>
          <TableCell>{t('hrEmployee.field.payLabel')}</TableCell>
          <TableCell>{t('hrEmployee.field.payType')}</TableCell>
          <TableCell align="right">{t('hrEmployee.field.payAmount')}</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {lines.map((line, index) => (
          <TableRow key={`${line.label}-${index}`}>
            <TableCell>
              {line.label}
              {line.target_linked && <Chip size="small" color="info" label={t('hrEmployee.pay.targetChip')} sx={{ ml: 1 }} />}
            </TableCell>
            <TableCell>{t(HR_PAY_TYPE_KEYS[line.type])}</TableCell>
            <TableCell align="right">{formatCurrency(line.monthly_amount, currency, 2)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
