import { List, ListItem, ListItemText } from '@mui/material';
import { useTranslation } from '@duncit/shell';

/** Every formula, in calculation order — the page's explainer and the details dialog both show it. */
const FORMULAS: ReadonlyArray<{ id: string; key: string }> = [
  { id: 'pod-value', key: 'targets.growth.formulas.podValue' },
  { id: 'earnings-per-pod', key: 'targets.growth.formulas.earningsPerPod' },
  { id: 'hosts', key: 'targets.growth.formulas.hosts' },
  { id: 'monthly-pods', key: 'targets.growth.formulas.monthlyPods' },
  { id: 'monthly-gmv', key: 'targets.growth.formulas.monthlyGmv' },
  { id: 'monthly-earnings', key: 'targets.growth.formulas.monthlyEarnings' },
  { id: 'host-leads', key: 'targets.growth.formulas.hostLeads' },
  { id: 'venue-leads', key: 'targets.growth.formulas.venueLeads' },
  { id: 'totals', key: 'targets.growth.formulas.totals' },
  { id: 'annual', key: 'targets.growth.formulas.annual' },
  { id: 'rounding', key: 'targets.growth.formulas.rounding' },
];

export default function FormulaList() {
  const { t } = useTranslation();
  return (
    <List dense disablePadding data-testid="growth-formulas">
      {FORMULAS.map((formula) => (
        <ListItem key={formula.id} disableGutters>
          <ListItemText primary={t(formula.key)} slotProps={{ primary: { variant: 'body2' } }} />
        </ListItem>
      ))}
    </List>
  );
}
