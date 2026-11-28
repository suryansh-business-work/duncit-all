import { Box, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { formatCurrency, type HrCompensationTotalsRecord } from '@duncit/utils';

interface Props {
  totals: HrCompensationTotalsRecord;
  currency: string;
}

/** Gross, deductions, net, employer cost, target-linked share and annual CTC, in one row of figures. */
export default function PayTotals({ totals, currency }: Readonly<Props>) {
  const { t } = useTranslation();
  const money = (value: number) => formatCurrency(value, currency, 2);
  const figures = [
    { key: 'gross', label: t('hrEmployee.pay.gross'), value: totals.gross_monthly },
    { key: 'deductions', label: t('hrEmployee.pay.deductions'), value: totals.deductions_monthly },
    { key: 'net', label: t('hrEmployee.pay.net'), value: totals.net_monthly },
    { key: 'employer', label: t('hrEmployee.pay.employer'), value: totals.employer_monthly },
    { key: 'variable', label: t('hrEmployee.pay.variable'), value: totals.variable_monthly },
    { key: 'ctc', label: t('hrEmployee.pay.annualCtc'), value: totals.annual_ctc },
  ];
  return (
    <Box
      component="dl"
      sx={{ m: 0, display: 'grid', gap: 2, gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(6, 1fr)' } }}
      data-testid="hr-pay-totals"
    >
      {figures.map((figure) => (
        <div key={figure.key}>
          <Typography component="dt" variant="caption" sx={{ color: 'text.secondary' }}>
            {figure.label}
          </Typography>
          <Typography component="dd" variant="subtitle2" sx={{ m: 0 }} data-testid={`hr-pay-total-${figure.key}`}>
            {money(figure.value)}
          </Typography>
        </div>
      ))}
    </Box>
  );
}
