import { Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import { formatCount, formatINR } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import type { BrandAnalytics } from './queries';

/** The window's best sellers, or a line saying nothing sold. */
export function TopProductsTable({ analytics }: Readonly<{ analytics: BrandAnalytics }>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2" component="h3">
        {t('shell.brandConsole.topTitle')}
      </Typography>
      {analytics.top_products.length === 0 ? (
        <Typography variant="body2" sx={{ color: 'text.secondary' }} data-testid="brand-analytics-top-empty">
          {t('shell.brandConsole.topEmpty')}
        </Typography>
      ) : (
        <TableContainer>
          <Table size="small" data-testid="brand-analytics-top-products">
            <caption>{t('shell.brandConsole.topCaption', { vars: { days: analytics.days } })}</caption>
            <TableHead>
              <TableRow>
                <TableCell scope="col">{t('shell.brandConsole.colProduct')}</TableCell>
                <TableCell scope="col" align="right">
                  {t('shell.brandConsole.colUnits')}
                </TableCell>
                <TableCell scope="col" align="right">
                  {t('shell.brandConsole.colGross')}
                </TableCell>
                <TableCell scope="col" align="right">
                  {t('shell.brandConsole.colNet')}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {analytics.top_products.map((product) => (
                <TableRow key={product.product_id}>
                  <TableCell component="th" scope="row">
                    {product.name}
                  </TableCell>
                  <TableCell align="right">{formatCount(product.units_sold)}</TableCell>
                  <TableCell align="right">{formatINR(product.gross_revenue)}</TableCell>
                  <TableCell align="right">{formatINR(product.net_earnings)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Stack>
  );
}
