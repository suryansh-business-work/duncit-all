import { Accordion, AccordionDetails, AccordionSummary, Alert, Stack, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useTranslation } from '@duncit/shell';
import type { GrowthOutputs } from '../../../lib/growth-calculator';
import './chart-setup';
import GrowthKpis from './GrowthKpis';
import GrowthBreakdown from './GrowthBreakdown';
import GrowthCharts from './GrowthCharts';
import FormulaList from './FormulaList';

interface Props {
  outputs: GrowthOutputs;
  /** True while an assumption is invalid: the figures shown are the last valid plan's. */
  stale: boolean;
}

/** Everything the assumptions produce, recalculated on every valid change. */
export default function GrowthResults({ outputs, stale }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={2}>
      {stale && (
        <Alert severity="warning" data-testid="growth-results-stale">
          {t('targets.growth.inputs.stale')}
        </Alert>
      )}
      <GrowthKpis outputs={outputs} />
      <Alert severity="info" variant="outlined">
        {t('targets.growth.earningsNote')}
      </Alert>
      <GrowthBreakdown outputs={outputs} />
      <GrowthCharts outputs={outputs} />
      <Accordion variant="outlined" disableGutters>
        <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls="growth-formulas-panel" id="growth-formulas-header">
          <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 600 }}>
            {t('targets.growth.formulas.title')}
          </Typography>
        </AccordionSummary>
        <AccordionDetails id="growth-formulas-panel">
          <FormulaList />
        </AccordionDetails>
      </Accordion>
    </Stack>
  );
}
