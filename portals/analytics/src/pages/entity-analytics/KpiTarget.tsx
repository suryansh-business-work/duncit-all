import { useState } from 'react';
import { Box, IconButton, Tooltip } from '@mui/material';
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlineOutlined';
import { useTranslation } from '@duncit/app-settings';
import { formatValue } from './format';
import TargetDialog from './TargetDialog';
import type { AnalyticsEntity, AnalyticsKpi } from './queries';

type Translate = ReturnType<typeof useTranslation>['t'];

/** Whether the tile has reached its goal: up to it when a rise is good news, under it otherwise. */
const goalMet = (kpi: AnalyticsKpi, target: number) =>
  kpi.higher_is_better ? kpi.value >= target : kpi.value <= target;

function progressText(kpi: AnalyticsKpi, target: number, t: Translate): string {
  const goal = formatValue(target, kpi.format);
  if (!kpi.higher_is_better) return t('analytics.target.ceiling', { vars: { target: goal } });
  const percent = target > 0 ? `${Math.round((kpi.value / target) * 100)}%` : '100%';
  return t('analytics.target.progress', { vars: { target: goal, percent } });
}

/** A tile's goal and how close it is — in words, with an icon once met, never colour alone. */
export function TargetLine({ kpi }: Readonly<{ kpi: AnalyticsKpi }>) {
  const { t } = useTranslation();
  const { target } = kpi;
  if (target === null || target === undefined) return null;
  const met = goalMet(kpi, target);
  let status: string | null = null;
  if (met) status = t('analytics.target.met');
  else if (!kpi.higher_is_better) status = t('analytics.target.over');
  return (
    <Box
      component="span"
      data-testid={`analytics-kpi-target-${kpi.key.replaceAll('_', '-')}`}
      sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap', color: met ? 'success.main' : 'text.secondary' }}
    >
      {met && <CheckCircleOutlineIcon sx={{ fontSize: 14 }} aria-hidden />}
      <span>{progressText(kpi, target, t)}</span>
      {status && <Box component="span" sx={{ fontWeight: 700 }}>{status}</Box>}
    </Box>
  );
}

/** The flag on a tile that sets, changes or removes its goal. */
export function TargetButton({ entity, kpi, title }: Readonly<{ entity: AnalyticsEntity; kpi: AnalyticsKpi; title: string }>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const hasGoal = kpi.target_goal !== null && kpi.target_goal !== undefined;
  const label = hasGoal ? t('analytics.target.edit') : t('analytics.target.set');
  return (
    <>
      <Tooltip title={label}>
        <IconButton
          size="small"
          aria-label={label}
          onClick={() => setOpen(true)}
          data-testid={`analytics-kpi-target-button-${kpi.key.replaceAll('_', '-')}`}
          sx={{ p: 0.5, color: hasGoal ? 'primary.main' : 'text.secondary' }}
        >
          <FlagOutlinedIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Tooltip>
      {open && <TargetDialog entity={entity} kpi={kpi} title={title} onClose={() => setOpen(false)} />}
    </>
  );
}
