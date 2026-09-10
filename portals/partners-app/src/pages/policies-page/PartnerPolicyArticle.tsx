import { useQuery } from '@apollo/client/react';
import { Alert, Box, CircularProgress, Skeleton, Stack, Typography } from '@mui/material';
import { POLICY_BY_SLUG } from './queries';
import { formatDate } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import { RICH_TEXT_BODY_SX, mergeSx } from '@duncit/ui';

export default function PartnerPolicyArticle({ slug }: Readonly<{ slug: string }>) {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery<any>(POLICY_BY_SLUG, { variables: { slug }, fetchPolicy: 'cache-and-network' });
  if (loading && !data) return <PolicySkeleton />;
  if (error) return <Alert severity="error">Could not load policy: {error.message}</Alert>;
  const policy = data?.policyBySlug;
  if (!policy) return <Alert severity="warning">{t('partners.policiesPage.noPolicyFound')}</Alert>;
  if (!policy.is_active) return <Alert severity="info">{t('partners.policiesPage.thisPolicyIsCurrentlyHidden')}</Alert>;

  return (
    <Box>
      <Typography
        variant="h4"
        sx={{
          fontWeight: 950,
          mb: 2
        }}>{policy.title}</Typography>
      <Box
        className="ql-editor"
        // This portal sets its headings heavier than the shared default.
        sx={mergeSx(RICH_TEXT_BODY_SX, { '& h1, & h2, & h3': { mt: 3, mb: 1.5, fontWeight: 900 } })}
        dangerouslySetInnerHTML={{ __html: policy.content || '' }}
      />
      <Typography
        variant="caption"
        sx={{
          color: "text.secondary",
          mt: 4,
          display: 'block',
          textAlign: 'right'
        }}>Last updated {formatDate(policy.updated_at)}</Typography>
      {loading && <CircularProgress size={18} sx={{ position: 'fixed', top: 80, right: 24 }} />}
    </Box>
  );
}

function PolicySkeleton() {
  return <Stack spacing={1.5}><Skeleton variant="text" width="60%" height={48} /><Skeleton variant="rectangular" height={20} /><Skeleton variant="rectangular" height={20} /><Skeleton variant="rectangular" height={120} /></Stack>;
}