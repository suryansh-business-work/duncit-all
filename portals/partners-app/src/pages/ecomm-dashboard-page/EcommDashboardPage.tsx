import { useQuery } from '@apollo/client';
import { Alert, Box, Button, Card, CardContent, CircularProgress, Stack, Typography } from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';
import { useNavigate } from 'react-router-dom';
import EcommStatCards from './EcommStatCards';
import { PARTNER_ECOMM_STATS } from './ecomm-dashboard.queries';

/** Partner E-Commerce Dashboard: owner-scoped brand/product/warehouse/order KPIs. */
export default function EcommDashboardPage() {
  const navigate = useNavigate();
  const { data, loading, error } = useQuery(PARTNER_ECOMM_STATS, { fetchPolicy: 'cache-and-network' });
  const stats = data?.partnerEcommStats ?? null;

  return (
    <Stack spacing={2.25} sx={{ width: '100%' }}>
      <Box
        sx={{
          p: 2.5,
          borderRadius: 2,
          color: 'primary.contrastText',
          background: (t) => `linear-gradient(135deg, ${t.palette.primary.dark} 0%, ${t.palette.primary.main} 100%)`,
        }}
      >
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
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
          <Button
            variant="outlined"
            startIcon={<StorefrontIcon />}
            onClick={() => navigate('/ecomm-brand')}
            sx={{ color: 'inherit', borderColor: 'rgba(255,255,255,0.55)', alignSelf: { md: 'center' } }}
          >
            Your Brands
          </Button>
        </Stack>
      </Box>
      {error && <Alert severity="error">{error.message}</Alert>}
      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <CardContent>
          <Stack spacing={2}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h6" fontWeight={950}>
                E-commerce performance
              </Typography>
              {loading && <CircularProgress size={22} />}
            </Stack>
            <EcommStatCards stats={stats} />
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
