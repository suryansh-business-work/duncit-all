import { Link as RouterLink, Navigate, useParams } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Alert, Box, Card, CardContent, CircularProgress, Stack, Typography } from '@mui/material';
import ArticleIcon from '@mui/icons-material/Article';
import { DuncitButton } from '@duncit/buttons';
import PartnerPolicyArticle from './PartnerPolicyArticle';
import { PUBLIC_POLICIES } from './queries';
import { useTranslation } from '@duncit/shell';

export default function PartnerPoliciesPage() {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const { data, loading, error } = useQuery<any>(PUBLIC_POLICIES, { fetchPolicy: 'cache-and-network' });
  const policies = data?.publicPolicies ?? [];

  if (!slug && policies.length > 0) return <Navigate to={`/policies/${policies[0].slug}`} replace />;

  return (
    <Stack spacing={2.25}>
      <Box sx={{ p: 2.25, borderRadius: 2, color: '#fff', background: 'linear-gradient(145deg, #15111c 0%, #2a1926 55%, #111827 100%)' }}>
        <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.68)', fontWeight: 900 }}>{t('partners.common.duncitPartners')}</Typography>
        <Typography variant="h4" sx={{
          fontWeight: 950
        }}>{t('shell.nav.policies')}</Typography>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.72)', mt: 0.75 }}>{t('partners.policiesPage.policyContentIsManagedFromThe')}</Typography>
      </Box>
      {error && <Alert severity="error">{error.message}</Alert>}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{
        alignItems: "flex-start"
      }}>
        <Card variant="outlined" sx={{ borderRadius: 2, width: { xs: '100%', md: 260 }, flexShrink: 0 }}>
          <CardContent>
            <Stack spacing={1}>
              {loading && policies.length === 0 && <CircularProgress size={22} />}
              {policies.length === 0 && !loading && <Typography variant="body2" sx={{
                color: "text.secondary"
              }}>{t('partners.policiesPage.noActivePoliciesYet')}</Typography>}
              {policies.map((policy: any) => <DuncitButton key={policy.id} component={RouterLink} to={`/policies/${policy.slug}`} startIcon={<ArticleIcon />} variant={policy.slug === slug ? 'contained' : 'text'} sx={{ justifyContent: 'flex-start', borderRadius: 1.25 }}>{policy.title}</DuncitButton>)}
            </Stack>
          </CardContent>
        </Card>
        <Card variant="outlined" sx={{ borderRadius: 2, flex: 1, width: '100%' }}>
          <CardContent>{slug ? <PartnerPolicyArticle slug={slug} /> : <Alert severity="info">{t('partners.policiesPage.selectAPolicy')}</Alert>}</CardContent>
        </Card>
      </Stack>
    </Stack>
  );
}