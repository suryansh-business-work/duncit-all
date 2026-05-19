import { Link as RouterLink, Navigate, useParams } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { Alert, Box, Button, Card, CardContent, CircularProgress, Stack, Typography } from '@mui/material';
import ArticleIcon from '@mui/icons-material/Article';
import PartnerPolicyArticle from './PartnerPolicyArticle';
import { PUBLIC_POLICIES } from './queries';

export default function PartnerPoliciesPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data, loading, error } = useQuery(PUBLIC_POLICIES, { fetchPolicy: 'cache-and-network' });
  const policies = data?.publicPolicies ?? [];

  if (!slug && policies.length > 0) return <Navigate to={`/policies/${policies[0].slug}`} replace />;

  return (
    <Stack spacing={2.25}>
      <Box sx={{ p: 2.25, borderRadius: 2, color: '#fff', background: 'linear-gradient(145deg, #15111c 0%, #2a1926 55%, #111827 100%)' }}>
        <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.68)', fontWeight: 900 }}>Duncit Partners</Typography>
        <Typography variant="h4" fontWeight={950}>Policies</Typography>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.72)', mt: 0.75 }}>Policy content is managed from the admin panel.</Typography>
      </Box>
      {error && <Alert severity="error">{error.message}</Alert>}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="flex-start">
        <Card variant="outlined" sx={{ borderRadius: 2, width: { xs: '100%', md: 260 }, flexShrink: 0 }}>
          <CardContent>
            <Stack spacing={1}>
              {loading && policies.length === 0 && <CircularProgress size={22} />}
              {policies.length === 0 && !loading && <Typography variant="body2" color="text.secondary">No active policies yet.</Typography>}
              {policies.map((policy: any) => <Button key={policy.id} component={RouterLink} to={`/policies/${policy.slug}`} startIcon={<ArticleIcon />} variant={policy.slug === slug ? 'contained' : 'text'} sx={{ justifyContent: 'flex-start', borderRadius: 1.25 }}>{policy.title}</Button>)}
            </Stack>
          </CardContent>
        </Card>
        <Card variant="outlined" sx={{ borderRadius: 2, flex: 1, width: '100%' }}>
          <CardContent>{slug ? <PartnerPolicyArticle slug={slug} /> : <Alert severity="info">Select a policy.</Alert>}</CardContent>
        </Card>
      </Stack>
    </Stack>
  );
}