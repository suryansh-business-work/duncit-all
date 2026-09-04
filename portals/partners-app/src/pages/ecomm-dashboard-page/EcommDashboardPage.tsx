import { useQuery } from '@apollo/client/react';
import { Alert, Box, CircularProgress, Stack, Typography } from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';
import { DuncitButton } from '@duncit/buttons';
import { useNavigate } from 'react-router';
import { DuncitDashboard, type DashboardWidget } from '@duncit/dashboard';
import EcommStatCards from './EcommStatCards';
import EcommProductsChart from './EcommProductsChart';
import { PARTNER_ECOMM_STATS } from './ecomm-dashboard.queries';
import { useTranslation } from '@duncit/shell';

/** Partner E-Commerce Dashboard: owner-scoped brand/product/warehouse/order KPIs. */
export default function EcommDashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, loading, error } = useQuery<any>(PARTNER_ECOMM_STATS, { fetchPolicy: 'cache-and-network' });
  const stats = data?.partnerEcommStats ?? null;

  const widgets: DashboardWidget[] = [
    {
      id: 'performance',
      title: t('partners.ecommDashboardPage.eCommercePerformance'),
      headerActions: loading ? <CircularProgress size={22} /> : undefined,
      // The card row is one line at desktop and wraps below ~1050px — a fixed
      // h is dead space in one shape and a cut in the other.
      fitContent: true,
      defaultLayout: { x: 0, y: 0, w: 12, h: 4 },
      minW: 4,
      // minH floors the measured height — keep it low or empty stats pin a void.
      minH: 2,
      content: <EcommStatCards stats={stats} />,
    },
    {
      id: 'products',
      title: t('partners.ecommDashboardPage.productsPerformance'),
      // One row per sold product — a fixed h either clips a full catalogue or
      // pins a void under an empty state.
      fitContent: true,
      defaultLayout: { x: 0, y: 4, w: 12, h: 5 },
      minW: 4,
      minH: 2,
      content: <EcommProductsChart rows={stats?.product_performance ?? []} />,
    },
  ];

  return (
    <DuncitDashboard
      dashboardId="partners.ecomm"
      header={
        <Stack spacing={2.25}>
          <Box
            sx={{
              p: 2.5,
              borderRadius: 2,
              color: 'primary.contrastText',
              background: (t) => `linear-gradient(135deg, ${t.palette.primary.dark} 0%, ${t.palette.primary.main} 100%)`,
            }}
          >
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{
              justifyContent: "space-between"
            }}>
              <Box>
                <Typography variant="overline" sx={{ opacity: 0.8, fontWeight: 800 }}>
                  E-Commerce Brand
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 950, lineHeight: 1.05 }}>
                  Dashboard
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.85, fontWeight: 600, mt: 0.5 }}>
                  How your brands, products and orders are performing on Duncit.
                </Typography>
              </Box>
              <DuncitButton
                variant="outlined"
                startIcon={<StorefrontIcon />}
                onClick={() => navigate('/ecomm-brand')}
                sx={{ color: 'inherit', borderColor: 'rgba(255,255,255,0.55)', alignSelf: { md: 'center' } }}
              >
                Your Brands
              </DuncitButton>
            </Stack>
          </Box>
          {error && <Alert severity="error">{error.message}</Alert>}
        </Stack>
      }
      widgets={widgets}
    />
  );
}
