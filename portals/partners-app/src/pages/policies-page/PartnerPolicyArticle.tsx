import { useQuery } from '@apollo/client';
import { Alert, Box, CircularProgress, Skeleton, Stack, Typography } from '@mui/material';
import { POLICY_BY_SLUG } from './queries';

export default function PartnerPolicyArticle({ slug }: Readonly<{ slug: string }>) {
  const { data, loading, error } = useQuery(POLICY_BY_SLUG, { variables: { slug }, fetchPolicy: 'cache-and-network' });
  if (loading && !data) return <PolicySkeleton />;
  if (error) return <Alert severity="error">Could not load policy: {error.message}</Alert>;
  const policy = data?.policyBySlug;
  if (!policy) return <Alert severity="warning">No policy found.</Alert>;
  if (!policy.is_active) return <Alert severity="info">This policy is currently hidden.</Alert>;

  return (
    <Box>
      <Typography variant="h4" fontWeight={950} sx={{ mb: 2 }}>{policy.title}</Typography>
      <Box
        className="ql-editor"
        sx={{
          '& img': { maxWidth: '100%', height: 'auto', borderRadius: 1 },
          '& a': { color: 'primary.main' },
          '& h1, & h2, & h3': { mt: 3, mb: 1.5, fontWeight: 900 },
          '& p': { mb: 1.25, lineHeight: 1.7 },
          '& ul, & ol': { pl: 3, mb: 1.5 },
          '& blockquote': { borderLeft: 4, borderColor: 'divider', pl: 2, color: 'text.secondary', my: 2 },
          '& pre': { bgcolor: 'action.hover', p: 2, borderRadius: 1, overflowX: 'auto', fontFamily: 'monospace' },
        }}
        dangerouslySetInnerHTML={{ __html: policy.content || '' }}
      />
      <Typography variant="caption" color="text.secondary" sx={{ mt: 4, display: 'block', textAlign: 'right' }}>Last updated {new Date(policy.updated_at).toLocaleDateString()}</Typography>
      {loading && <CircularProgress size={18} sx={{ position: 'fixed', top: 80, right: 24 }} />}
    </Box>
  );
}

function PolicySkeleton() {
  return <Stack spacing={1.5}><Skeleton variant="text" width="60%" height={48} /><Skeleton variant="rectangular" height={20} /><Skeleton variant="rectangular" height={20} /><Skeleton variant="rectangular" height={120} /></Stack>;
}