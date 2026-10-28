import { Chip, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { costByEmployment, money } from './money';
import type { TeamNode } from './types';

/** Monthly budget of the chart, by employment type — optional seats are left out of it. */
export default function CostSummary({ nodes, currency }: Readonly<{ nodes: readonly TeamNode[]; currency: string }>) {
  const { t } = useTranslation();
  const totals = costByEmployment(nodes);
  const grand = Object.values(totals).reduce((a, b) => a + b, 0);

  return (
    <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }} aria-label={t('hr.teamStructure.cost.title')}>
      <Typography variant="subtitle2">{t('hr.teamStructure.cost.total', { vars: { amount: money(grand, currency) } })}</Typography>
      {Object.entries(totals).map(([type, value]) => (
        <Chip key={type} size="small" label={`${t(`hr.teamStructure.employment.${type}`)}: ${money(value, currency)}`} />
      ))}
    </Stack>
  );
}
