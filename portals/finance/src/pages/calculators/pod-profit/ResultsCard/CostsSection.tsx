import { Divider } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { formatRupees, type ExpenseTotals } from '../types';
import { Row, SectionLabel } from './Row';

interface Props {
  expenses: ExpenseTotals;
  expenseTotal: number;
  venueNet: number;
  hostNet: number;
  duncitNet: number;
  /** The per-pod block explains itself; the projected one below it need not. */
  withIntro?: boolean;
}

/**
 * What the cost lines leave each side.
 *
 * Rendered for the single pod AND for the projection across `pod_count`, which
 * is why it takes plain numbers rather than a results object — the two callers
 * hand it `results` and `results.scaled`, and the block cannot drift between
 * them because there is only one of it.
 *
 * A net can go negative where its side's costs exceed what it was paid, so each
 * row picks its own emphasis rather than assuming money is good news.
 */
export default function CostsSection({
  expenses,
  expenseTotal,
  venueNet,
  hostNet,
  duncitNet,
  withIntro = false,
}: Readonly<Props>) {
  const { t } = useTranslation();
  if (expenseTotal <= 0) return null;

  return (
    <>
      <Divider sx={{ my: 1 }} />
      <SectionLabel text={t('finance.calculators.costsAndNet')} />
      <Row
        label={t('finance.calculators.totalExpenses')}
        value={formatRupees(expenseTotal)}
        emphasis="warning"
        detail={withIntro ? t('finance.calculators.expensesIntro') : undefined}
      />
      <Row
        label={t('finance.calculators.venueNet')}
        value={formatRupees(venueNet)}
        emphasis={venueNet < 0 ? 'error' : 'success'}
        detail={`${t('finance.calculators.venueExpenses')}: ${formatRupees(expenses.VENUE)}`}
      />
      <Row
        label={t('finance.calculators.hostNet')}
        value={formatRupees(hostNet)}
        emphasis={hostNet < 0 ? 'error' : 'success'}
        detail={`${t('finance.calculators.hostExpenses')}: ${formatRupees(expenses.HOST)}`}
      />
      <Row
        label={t('finance.calculators.duncitNet')}
        value={formatRupees(duncitNet)}
        emphasis={duncitNet < 0 ? 'error' : 'primary'}
        detail={`${t('finance.calculators.duncitExpenses')}: ${formatRupees(expenses.DUNCIT)}`}
      />
    </>
  );
}
