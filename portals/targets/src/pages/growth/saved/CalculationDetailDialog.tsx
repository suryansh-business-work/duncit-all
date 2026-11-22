import { Box, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Stack, Typography, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { DuncitButton } from '@duncit/buttons';
import { InfoRow, SectionCard } from '@duncit/ui';
import { EM_DASH } from '@duncit/table';
import { useDateFormat } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import type { SavedCalculation } from '../../../lib/queries';
import { formatInput } from '../../../lib/growth-format';
import { GROWTH_INPUT_FIELDS } from '../growth-inputs';
import GrowthBreakdown from '../results/GrowthBreakdown';
import FormulaList from '../results/FormulaList';

interface Props {
  calculation: SavedCalculation | null;
  onClose: () => void;
}

/** One saved calculation in full: who made it and when, the assumptions, every result and the formulas. */
export default function CalculationDetailDialog({ calculation, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  if (!calculation) return null;
  const { calculated_by: by, last_edited_by: editor } = calculation;

  const creator = [
    { id: 'by', label: t('targets.growth.detail.calculatedBy'), value: by.name },
    { id: 'email', label: t('targets.growth.detail.email'), value: by.email ?? EM_DASH },
    { id: 'roles', label: t('targets.growth.detail.roles'), value: by.roles.join(', ') || EM_DASH },
    { id: 'created', label: t('targets.growth.detail.createdAt'), value: formatDateTime(calculation.created_at) },
    { id: 'editor', label: t('targets.growth.detail.lastEditedBy'), value: editor?.name ?? EM_DASH },
    {
      id: 'edited',
      label: t('targets.growth.detail.lastEditedAt'),
      value: calculation.last_edited_at ? formatDateTime(calculation.last_edited_at) : EM_DASH,
    },
    { id: 'version', label: t('targets.growth.detail.formulaVersion'), value: String(calculation.formula_version) },
  ];

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="lg" fullScreen={fullScreen} aria-labelledby="growth-detail-title">
      <DialogTitle id="growth-detail-title">
        {calculation.title}
        <Typography variant="body2" component="span" sx={{ display: 'block', color: 'text.secondary' }}>
          {calculation.description || t('targets.growth.detail.title')}
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} data-testid="growth-detail">
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, alignItems: 'start' }}>
            <SectionCard title={t('targets.growth.detail.creator')}>
              <Stack spacing={0.75} divider={<Divider flexItem />}>
                {creator.map((row) => (
                  <InfoRow key={row.id} variant="split" label={row.label} value={row.value} testId={`growth-detail-${row.id}`} />
                ))}
              </Stack>
            </SectionCard>
            <SectionCard title={t('targets.growth.detail.inputs')}>
              <Stack spacing={0.75} divider={<Divider flexItem />}>
                {GROWTH_INPUT_FIELDS.map(({ key, label }) => (
                  <InfoRow
                    key={key}
                    variant="split"
                    label={t(label)}
                    value={formatInput(calculation.inputs[key])}
                    testId={`growth-detail-input-${key}`}
                  />
                ))}
              </Stack>
            </SectionCard>
          </Box>
          <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 600 }}>
            {t('targets.growth.detail.results')}
          </Typography>
          <GrowthBreakdown outputs={calculation} />
          <SectionCard title={t('targets.growth.detail.formulas')}>
            <FormulaList />
          </SectionCard>
        </Stack>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose} data-testid="growth-detail-close">
          {t('shell.common.close')}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
