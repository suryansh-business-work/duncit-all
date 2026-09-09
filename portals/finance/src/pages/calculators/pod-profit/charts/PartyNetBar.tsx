import { useTheme } from '@mui/material/styles';
import { Bar } from 'react-chartjs-2';
import type { ChartOptions } from 'chart.js';
import { useTranslation } from '@duncit/app-settings';
import ChartCard from './ChartCard';
import { PARTY_COLORS, moneyScales, moneyTooltip } from './chartSetup';
import type { ExpenseTotals } from '../types';

interface Props {
  venue: number;
  host: number;
  duncit: number;
  expenses: ExpenseTotals;
}

/**
 * What each side is paid, beside what it keeps.
 *
 * Grouped rather than stacked: the pair is a BEFORE and an AFTER of the same
 * money, and stacking them would draw a bar of gross-plus-net that means
 * nothing. The gap between the two bars is the cost that side carries.
 */
export default function PartyNetBar({ venue, host, duncit, expenses }: Readonly<Props>) {
  const { t } = useTranslation();
  const theme = useTheme();

  const parties = [
    { label: t('finance.calculators.borneByVenue'), gross: venue, spend: expenses.VENUE, color: PARTY_COLORS.venue },
    { label: t('finance.calculators.borneByHost'), gross: host, spend: expenses.HOST, color: PARTY_COLORS.host },
    { label: t('finance.calculators.borneByDuncit'), gross: duncit, spend: expenses.DUNCIT, color: PARTY_COLORS.duncit },
  ];
  const hasData = parties.some((party) => party.gross !== 0 || party.spend !== 0);

  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: moneyTooltip(theme),
    scales: moneyScales(theme),
  };

  return (
    <ChartCard
      title={t('finance.calculators.chartNetByParty')}
      hint={t('finance.calculators.chartNetByPartyHint')}
      hasData={hasData}
    >
      <Bar
        data={{
          labels: parties.map((party) => party.label),
          datasets: [
            {
              label: t('finance.calculators.chartGross'),
              data: parties.map((party) => party.gross),
              backgroundColor: parties.map((party) => `${party.color}66`),
              borderRadius: 6,
              maxBarThickness: 34,
            },
            {
              label: t('finance.calculators.chartNet'),
              data: parties.map((party) => party.gross - party.spend),
              backgroundColor: parties.map((party) => party.color),
              borderRadius: 6,
              maxBarThickness: 34,
            },
          ],
        }}
        options={options}
      />
    </ChartCard>
  );
}
