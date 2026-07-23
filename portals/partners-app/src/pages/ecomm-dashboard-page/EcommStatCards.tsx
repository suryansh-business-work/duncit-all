import { Card, CardContent, Stack, Typography } from '@mui/material';
import { formatINR } from '@duncit/utils';
import type { PartnerEcommStats } from './ecomm-dashboard.queries';

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
export function ecommStatCards(stats: PartnerEcommStats): StatCard[] {
  return [
    {
      key: 'brands',
      label: 'Total Brands',
      value: String(stats.total_brands),
      caption: `${stats.approved_brands} approved`,
    },
    {
      key: 'products',
      label: 'Total Products',
      value: String(stats.total_products),
      caption: `${stats.approved_products} approved`,
    },
    { key: 'warehouses', label: 'Total Warehouses', value: String(stats.total_warehouses) },
    { key: 'orders', label: 'Total Orders', value: String(stats.total_orders) },
    { key: 'items', label: 'Total Items Sold', value: String(stats.total_items_sold) },
    { key: 'revenue', label: 'Total Revenue', value: formatINR(stats.gross_revenue) },
  ];
}

/** KPI cards for the E-Commerce Dashboard (DashboardMetricCards pattern). */
export default function EcommStatCards({ stats }: Readonly<{ stats?: PartnerEcommStats | null }>) {
  const cards = ecommStatCards(stats ?? emptyEcommStats);
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
