import { Card, CardContent, Stack, Typography } from '@mui/material';
import { formatINR } from '@duncit/utils';
import type { PartnerEcommStats } from './ecomm-dashboard.queries';
import { useTranslation } from '@duncit/shell';

interface StatCard {
  key: string;
  label: string;
  value: string;
  caption?: string;
}

export const emptyEcommStats: PartnerEcommStats = {
  total_brands: 0,
  approved_brands: 0,
  total_products: 0,
  approved_products: 0,
  total_warehouses: 0,
  total_orders: 0,
  total_items_sold: 0,
  gross_revenue: 0,
};

/** Flatten the stats payload into labelled cards (approved counts as captions). */
type Translate = ReturnType<typeof useTranslation>['t'];

export function ecommStatCards(stats: PartnerEcommStats, t: Translate): StatCard[] {
  return [
    {
      key: 'brands',
      label: t('partners.ecommDashboardPage.totalBrands'),
      value: String(stats.total_brands),
      caption: `${stats.approved_brands} approved`,
    },
    {
      key: 'products',
      label: t('partners.ecommDashboardPage.totalProducts'),
      value: String(stats.total_products),
      caption: `${stats.approved_products} approved`,
    },
    { key: 'warehouses', label: t('partners.ecommDashboardPage.totalWarehouses'), value: String(stats.total_warehouses) },
    { key: 'orders', label: t('partners.ecommDashboardPage.totalOrders'), value: String(stats.total_orders) },
    { key: 'items', label: t('partners.ecommDashboardPage.totalItemsSold'), value: String(stats.total_items_sold) },
    { key: 'revenue', label: t('partners.common.totalRevenue'), value: formatINR(stats.gross_revenue) },
  ];
}

/** KPI cards for the E-Commerce Dashboard (DashboardMetricCards pattern). */
export default function EcommStatCards({ stats }: Readonly<{ stats?: PartnerEcommStats | null }>) {
  const { t } = useTranslation();
  const cards = ecommStatCards(stats ?? emptyEcommStats, t);
  return (
    <Stack direction="row" flexWrap="wrap" gap={1.5}>
      {cards.map((card) => (
        <Card
          key={card.key}
          variant="outlined"
          sx={{ borderRadius: 1.25, minWidth: { xs: '100%', sm: 156 }, flex: '1 1 156px' }}
        >
          <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}>
            <Typography variant="caption" color="text.secondary" fontWeight={900}>
              {card.label}
            </Typography>
            <Typography variant="h6" fontWeight={950}>
              {card.value}
            </Typography>
            {card.caption && (
              <Typography variant="caption" color="success.main" fontWeight={800}>
                {card.caption}
              </Typography>
            )}
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}
