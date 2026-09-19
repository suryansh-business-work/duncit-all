import { useCallback, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, Box, LinearProgress } from '@mui/material';
import { DuncitTabs, tabPanelProps, useTabParam, type DuncitTabItem } from '@duncit/tabs';
import { PageHeader } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import { SOCIAL_SETUP, type SocialAccount, type SocialProviderStatus } from './queries';
import type { SocialIdea } from './publish.queries';
import { useConnectResult } from './useConnectResult';
import AccountsTab from './accounts/AccountsTab';
import PublishTab from './publish/PublishTab';
import ComposerDialog, { type ComposerRequest } from './publish/ComposerDialog';
import PostsTab from './posts/PostsTab';
import PostDetailDrawer from './posts/PostDetailDrawer';
import AnalyticsTab from './analytics/AnalyticsTab';
import MonitoringTab from './monitoring/MonitoringTab';
import IdeasTab from './ideas/IdeasTab';
import { ideaText } from './ideas/idea-text';

type Tab = 'accounts' | 'publish' | 'posts' | 'analytics' | 'monitoring' | 'ideas';
type Translate = ReturnType<typeof useTranslation>['t'];

/** Connect, then plan and post, then read how it went, then listen — and ideas for what next. */
const socialTabs = (t: Translate): DuncitTabItem<Tab>[] => [
  { value: 'accounts', label: t('marketing.social.tabAccounts') },
  { value: 'publish', label: t('marketing.social.tabPublish') },
  { value: 'posts', label: t('marketing.social.tabPosts') },
  { value: 'analytics', label: t('marketing.social.tabAnalytics') },
  { value: 'monitoring', label: t('marketing.social.tabMonitoring') },
  { value: 'ideas', label: t('marketing.social.tabIdeas') },
];

const NO_PROVIDERS: SocialProviderStatus[] = [];
const NO_ACCOUNTS: SocialAccount[] = [];

interface SetupData {
  socialProviders: SocialProviderStatus[];
  socialAccounts: SocialAccount[];
}

/**
 * Marketing → Social Accounts: Duncit's Buffer. Connect the pages and
 * channels, write and schedule posts to them, see every post and how it did,
 * watch the comments, and get AI ideas and analysis.
 *
 * The network apps' keys are never asked for here — Tech keeps them under
 * Environment Variables › Social apps, and a network without one says so.
 * The composer and the post detail live at page level, so any tab can open them.
 */
export default function SocialAccountsPage() {
  const { t } = useTranslation();
  const tabs = useTabParam<Tab>({ items: socialTabs(t), fallback: 'accounts' });
  const { data, loading, error, refetch } = useQuery<SetupData>(SOCIAL_SETUP, { fetchPolicy: 'cache-and-network' });
  const providers = data?.socialProviders ?? NO_PROVIDERS;
  const accounts = data?.socialAccounts ?? NO_ACCOUNTS;
  const [composer, setComposer] = useState<ComposerRequest | null>(null);
  const [openPostId, setOpenPostId] = useState<string | null>(null);

  const reload = useCallback(() => {
    refetch().catch(() => undefined);
  }, [refetch]);
  useConnectResult(reload);

  const pickIdea = (idea: SocialIdea) => setComposer({ text: ideaText(idea), idea_id: idea.id });

  return (
    <Box sx={{ p: 2 }} data-testid="social-accounts-page">
      <PageHeader title={t('marketing.social.title')} subtitle={t('marketing.social.subtitle')} sx={{ mb: 2 }} />
      <DuncitTabs {...tabs} idPrefix="social" variant="scrollable" scrollButtons="auto" sx={{ mb: 2 }} />
      {loading && !data && <LinearProgress sx={{ mb: 2 }} />}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {parseApiError(error)}
        </Alert>
      )}
      <Box {...tabPanelProps('social', tabs.value)}>
        {tabs.value === 'accounts' && <AccountsTab providers={providers} accounts={accounts} onChanged={reload} />}
        {tabs.value === 'publish' && <PublishTab onCompose={setComposer} onOpenPost={setOpenPostId} />}
        {tabs.value === 'posts' && <PostsTab accounts={accounts} onOpenPost={setOpenPostId} />}
        {tabs.value === 'analytics' && <AnalyticsTab accounts={accounts} />}
        {tabs.value === 'monitoring' && <MonitoringTab accounts={accounts} onChanged={reload} />}
        {tabs.value === 'ideas' && <IdeasTab onUse={pickIdea} />}
      </Box>

      <ComposerDialog request={composer} accounts={accounts} onClose={() => setComposer(null)} />
      <PostDetailDrawer postId={openPostId} onClose={() => setOpenPostId(null)} />
    </Box>
  );
}
