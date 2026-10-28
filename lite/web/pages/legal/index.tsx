import { useParams } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Box, Stack, Typography } from '@mui/material';
import { useDateFormat } from '@duncit/app-settings';
import { QueryGuard, RICH_TEXT_BODY_SX } from '@duncit/ui';
import { useWebT } from '../../../shared/i18n';
import { LITE_POLICY, type LitePolicyPage } from '../../graphql/policies';
import { usePageTitle } from '../../lib/usePageTitle';
import { NotFoundPage } from '../not-found';
import { PolicySkeleton } from './PolicySkeleton';

/** One policy as a readable article: its title, when it last changed, and the text. */
function PolicyArticle({ policy }: Readonly<{ policy: LitePolicyPage }>) {
  const { t } = useWebT();
  const { formatDate } = useDateFormat();
  return (
    <Stack component="article" spacing={3} sx={{ maxWidth: 760, mx: 'auto', width: '100%' }} data-testid="policy-page">
      {/* The page's one h1, larger than any heading inside the policy text. */}
      <Stack spacing={0.75} sx={{ pb: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography component="h1" variant="h2" sx={{ fontSize: { xs: '2rem', md: '2.6rem' }, fontWeight: 800 }}>
          {policy.title}
        </Typography>
        {policy.updated_at ? (
          <Typography color="text.secondary">{t('liteWeb.legal.updated', { vars: { date: formatDate(policy.updated_at) } })}</Typography>
        ) : null}
      </Stack>
      {/*
        The console's rich-text HTML, printed the way every Duncit surface prints a policy
        (RICH_TEXT_BODY_SX), so it renders on the server too. The API refuses scripts, frames,
        forms, embedded objects and event handlers when the policy is saved.
      */}
      <Box sx={RICH_TEXT_BODY_SX} dangerouslySetInnerHTML={{ __html: policy.content }} data-testid="policy-body" />
    </Stack>
  );
}

/** /legal/:slug — a policy page the console wrote (privacy, terms of use, data policy…). */
export function PolicyPage() {
  const { slug = '' } = useParams();
  const { data, loading, error } = useQuery<{ litePolicy: LitePolicyPage | null }>(LITE_POLICY, { variables: { slug }, fetchPolicy: 'cache-and-network' });
  const policy = data?.litePolicy ?? null;
  usePageTitle(policy?.title ?? '');
  if (!loading && !error && !policy) return <NotFoundPage />;
  return (
    <QueryGuard loading={loading && !policy} error={error} skeleton={<PolicySkeleton />}>
      {() => (policy ? <PolicyArticle policy={policy} /> : null)}
    </QueryGuard>
  );
}
