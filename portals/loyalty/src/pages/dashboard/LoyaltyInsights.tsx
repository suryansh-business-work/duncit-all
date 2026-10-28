import { List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import type { SvgIconComponent } from '@mui/icons-material';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import InsightsIcon from '@mui/icons-material/Insights';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useTranslation } from '@duncit/app-settings';
import ChartCard from '../../components/ChartCard';
import { buildInsights, type InsightTone } from './insights';
import type { LoyaltyOverview } from './useLoyaltyOverview';

const TONE_ICON: Record<InsightTone, { icon: SvgIconComponent; color: 'success' | 'warning' | 'primary' }> = {
  success: { icon: CheckCircleOutlinedIcon, color: 'success' },
  warning: { icon: WarningAmberIcon, color: 'warning' },
  info: { icon: InsightsIcon, color: 'primary' },
};

interface Props {
  overview: LoyaltyOverview;
  months: number;
}

/** The numbers on the Loyalty home, read out as a few plain lines — anything that needs a look first. */
export default function LoyaltyInsights({ overview, months }: Readonly<Props>) {
  const { t } = useTranslation();
  const lines = buildInsights(t, overview, months);
  const loading = Object.values(overview.loading).some(Boolean);

  return (
    <ChartCard
      title={t('loyalty.dashboard.insightsTitle')}
      caption={t('loyalty.dashboard.insightsCaption')}
      hasData={lines.length > 0}
      loading={loading}
      emptyText={t('loyalty.dashboard.insightsEmpty')}
    >
      <List dense disablePadding aria-live="polite">
        {lines.map((line) => {
          const { icon: Icon, color } = TONE_ICON[line.tone];
          return (
            <ListItem key={line.key} disableGutters alignItems="flex-start" data-testid={`insight-${line.key}`}>
              <ListItemIcon sx={{ minWidth: 32, mt: 0.5 }}>
                <Icon fontSize="small" color={color} />
              </ListItemIcon>
              <ListItemText primary={line.text} slotProps={{ primary: { variant: 'body2' } }} />
            </ListItem>
          );
        })}
      </List>
    </ChartCard>
  );
}
