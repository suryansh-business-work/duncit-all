import { useState } from 'react';
import { Alert, Box, LinearProgress } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import { DuncitButton } from '@duncit/buttons';
import { PageHeader } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import { useSocialSetup } from '../social-accounts-page/useSocialSetup';
import PublishTab from '../social-accounts-page/publish/PublishTab';
import ComposerDialog, { type ComposerRequest } from '../social-accounts-page/publish/ComposerDialog';
import PostDetailDrawer from '../social-accounts-page/posts/PostDetailDrawer';
import ConnectAccountsDrawer from './ConnectAccountsDrawer';

/**
 * Marketing → Social Calendar: the Social Accounts publishing calendar on a
 * page of its own, Buffer-style. Press a date to write a post for it, post now
 * or schedule it to Instagram, Facebook, LinkedIn, X and YouTube, and switch
 * to the Queue / Drafts / Sent lists. The accounts it posts to are connected
 * from the settings drawer without leaving the page.
 */
export default function SocialCalendarPage() {
  const { t } = useTranslation();
  const { providers, accounts, loading, error, reload } = useSocialSetup();
  const [composer, setComposer] = useState<ComposerRequest | null>(null);
  const [openPostId, setOpenPostId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const openSettings = () => setSettingsOpen(true);

  const connectButton = (
    <DuncitButton variant="outlined" startIcon={<SettingsIcon />} onClick={openSettings} data-testid="social-calendar-connect">
      {t('marketing.socialCalendar.connectAccounts')}
    </DuncitButton>
  );

  return (
    <Box sx={{ p: 2 }} data-testid="social-calendar-page">
      <PageHeader
        title={t('marketing.socialCalendar.title')}
        subtitle={t('marketing.socialCalendar.subtitle')}
        actions={connectButton}
        sx={{ mb: 2 }}
      />
      {loading && <LinearProgress sx={{ mb: 2 }} />}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {parseApiError(error)}
        </Alert>
      )}
      {!loading && !error && accounts.length === 0 && (
        <Alert
          severity="info"
          sx={{ mb: 2 }}
          action={
            <DuncitButton color="inherit" size="small" onClick={openSettings}>
              {t('marketing.socialCalendar.connectAccounts')}
            </DuncitButton>
          }
        >
          {t('marketing.socialCalendar.noAccounts')}
        </Alert>
      )}

      <PublishTab onCompose={setComposer} onOpenPost={setOpenPostId} />

      <ComposerDialog request={composer} accounts={accounts} onClose={() => setComposer(null)} />
      <PostDetailDrawer postId={openPostId} onClose={() => setOpenPostId(null)} />
      <ConnectAccountsDrawer
        open={settingsOpen}
        providers={providers}
        accounts={accounts}
        onChanged={reload}
        onClose={() => setSettingsOpen(false)}
      />
    </Box>
  );
}
