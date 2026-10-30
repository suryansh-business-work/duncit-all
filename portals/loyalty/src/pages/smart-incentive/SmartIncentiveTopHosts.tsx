import { List, ListItem, ListItemText } from '@mui/material';
import { formatMoney } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import ChartCard from '../../components/ChartCard';
import { coinCount } from '../duncit-coin/queries';
import type { SmartIncentiveTopHost } from './queries';

interface Props {
  hosts: SmartIncentiveTopHost[];
  /** The admin-configured currency symbol the discount is shown in. */
  symbol: string;
  loading: boolean;
}

/**
 * The hosts with the most pods offering Smart Incentive, ranked by the server,
 * with the discount they offer on average and what those pods converted. A
 * ranking, so it is an ordered list for screen readers too.
 */
export default function SmartIncentiveTopHosts({ hosts, symbol, loading }: Readonly<Props>) {
  const { t } = useTranslation();
  const last = hosts.length - 1;

  return (
    <ChartCard
      title={t('loyalty.smartIncentive.topTitle')}
      caption={t('loyalty.smartIncentive.topCaption')}
      hasData={hosts.length > 0}
      loading={loading}
      emptyText={t('loyalty.smartIncentive.topEmpty')}
    >
      <List component="ol" dense disablePadding>
        {hosts.map((host, rank) => (
          <ListItem key={host.user_id} disableGutters divider={rank < last}>
            <ListItemText
              // A host without a name on file still needs a line that identifies them.
              primary={`${rank + 1}. ${host.name || host.email || host.user_id}`}
              secondary={t('loyalty.smartIncentive.topLine', {
                vars: {
                  pods: coinCount(host.pods),
                  pct: host.avg_discount_pct,
                  bookings: coinCount(host.bookings),
                  discount: formatMoney(host.discount_given, { symbol }),
                },
              })}
              slotProps={{ primary: { variant: 'body2', noWrap: true, sx: { fontWeight: 700 } } }}
            />
          </ListItem>
        ))}
      </List>
    </ChartCard>
  );
}
