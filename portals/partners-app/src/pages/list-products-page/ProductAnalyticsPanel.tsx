import { useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { MY_PRODUCT_ANALYTICS } from './queries';
import { useTranslation } from '@duncit/shell';

const money = (symbol: string, value: number) => `${symbol}${Number(value || 0).toLocaleString('en-IN')}`;

function Metric({ label, value }: Readonly<{ label: string; value: string | number }>) {
  return (
    <Box sx={{ p: 1.5, borderRadius: 2, border: 1, borderColor: 'divider', flex: '1 1 130px', minWidth: 120 }}>
      <Typography variant="h6" fontWeight={950}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
    </Box>
  );
}

/** Brand-admin product analytics: orders/units/earnings + purchase locations +
 * per-variant purchases (from order data), and forward-tracked views/clicks. */
export default function ProductAnalyticsPanel({ productId }: Readonly<{ productId: string }>) {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery(MY_PRODUCT_ANALYTICS, {
    variables: { product_doc_id: productId },
    fetchPolicy: 'cache-and-network',
  });
  const analytics = data?.myProductAnalytics;

  if (loading && !analytics) {
    return (
      <Stack alignItems="center" sx={{ py: 3 }}>
        <CircularProgress size={22} />
      </Stack>
    );
  }
  if (error) return <Alert severity="error">{error.message}</Alert>;
  if (!analytics) return null;
  const symbol = analytics.currency_symbol;

  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent>
        <Stack spacing={2}>
          <Typography variant="h6" fontWeight={950}>
            Analytics
          </Typography>
          <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
            <Metric label={t('partners.listProductsPage.productViews')} value={analytics.total_views} />
            <Metric label={t('partners.listProductsPage.totalClicks')} value={analytics.total_clicks} />
            <Metric label={t('shell.nav.orders')} value={analytics.orders} />
            <Metric label={t('partners.listProductsPage.unitsSold')} value={analytics.units_sold} />
            <Metric label={t('partners.listProductsPage.grossRevenue')} value={money(symbol, analytics.gross_revenue)} />
            <Metric label={t('partners.listProductsPage.totalEarning')} value={money(symbol, analytics.total_earning)} />
            <Metric label={t('partners.listProductsPage.podsListedIn')} value={analytics.linked_pods} />
          </Stack>
          {analytics.variants.length > 0 && (
            <>
              <Divider />
              <Typography variant="subtitle2" fontWeight={800}>
                By variant
              </Typography>
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>{t('partners.listProductsPage.variant')}</TableCell>
                      <TableCell align="right">Sold</TableCell>
                      <TableCell align="right">{t('shell.nav.orders')}</TableCell>
                      <TableCell align="right">{t('partners.listProductsPage.clicks')}</TableCell>
                      <TableCell align="right">{t('partners.listProductsPage.views')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {analytics.variants.map((variant: any) => (
                      <TableRow key={variant.variant_id || variant.variant_label}>
                        <TableCell>{variant.variant_label}</TableCell>
                        <TableCell align="right">{variant.units_sold}</TableCell>
                        <TableCell align="right">{variant.orders}</TableCell>
                        <TableCell align="right">{variant.clicks}</TableCell>
                        <TableCell align="right">{variant.views}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </>
          )}
          {analytics.locations.length > 0 && (
            <>
              <Divider />
              <Typography variant="subtitle2" fontWeight={800}>
                Purchase locations
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {analytics.locations.map((entry: any) => (
                  <Chip key={entry.location} label={`${entry.location}: ${entry.units_sold} sold`} size="small" />
                ))}
              </Stack>
            </>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
