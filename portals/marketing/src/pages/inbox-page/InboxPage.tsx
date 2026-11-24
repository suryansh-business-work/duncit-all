import { useCallback, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Alert, Box, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { DuncitTabs, tabPanelProps, useTabParam, type DuncitTabItem } from '@duncit/tabs';
import { PageHeader, type PortalTourStep } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import type { Translate } from '@duncit/shell';
import RunsGuide from '../activity-page/RunsGuide';
import { INBOX_CHANNELS, INBOX_CHANNEL_LABEL, inboxViewOf } from './copy';
import type { InboxChannel } from './dm.queries';
import ConversationDrawer from './dms/ConversationDrawer';
import InboxChannelPanel from './InboxChannelPanel';
import InboxSummaryCards from './InboxSummaryCards';
import InboxDrawer from './drawer/InboxDrawer';
import { SOCIAL_INBOX_SETUP, type InboxAccount, type InboxComment, type SocialReplyCapability } from './queries';

const TOUR_ID = 'marketing.inbox';
const NO_ACCOUNTS: InboxAccount[] = [];
const NO_CAPABILITIES: SocialReplyCapability[] = [];

const tourSteps = (t: Translate): PortalTourStep[] => [
  { anchor: 'inbox-cards', title: t('marketing.inbox.tourCardsTitle'), body: t('marketing.inbox.tourCardsBody') },
  { anchor: 'inbox-table', title: t('marketing.inbox.tourTableTitle'), body: t('marketing.inbox.tourTableBody') },
];

const channelTabs = (t: Translate): DuncitTabItem<InboxChannel>[] => INBOX_CHANNELS.map((value) => ({ value, label: t(INBOX_CHANNEL_LABEL[value]) }));

/**
 * Marketing → Social → Inbox: every comment, Threads reply and direct message
 * from every connected account, worked as one queue. `?channel=` picks the
 * tab (all, dms, comments, threads); `?view=FLAGGED` (UNASSIGNED, MINE, ALL)
 * pins the slice a card opens — open items otherwise. The Flagged view is the
 * AI review the Monitoring tab shows, so the two read the same verdicts.
 */
export default function InboxPage() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const view = inboxViewOf(params);
  const tabs = useTabParam<InboxChannel>({ items: channelTabs(t), fallback: 'all', param: 'channel' });
  const [openComment, setOpenComment] = useState<InboxComment | null>(null);
  const [openConversation, setOpenConversation] = useState<string | null>(null);
  const tableRefetch = useRef<(() => void) | null>(null);
  const cardsRefetch = useRef<(() => void) | null>(null);
  const { data, error } = useQuery<{ socialAccounts: InboxAccount[]; socialReplyCapabilities: SocialReplyCapability[] }>(SOCIAL_INBOX_SETUP);

  const refresh = useCallback(() => {
    tableRefetch.current?.();
    cardsRefetch.current?.();
  }, []);
  const commentChanged = useCallback(
    (comment: InboxComment) => {
      setOpenComment(comment);
      refresh();
    },
    [refresh]
  );
  const showAll = view !== 'ALL';
  const toggle = (
    <DuncitButton
      variant="text"
      onClick={() => setParams({ channel: tabs.value, view: showAll ? 'ALL' : 'OPEN' })}
      data-testid="inbox-toggle-all"
    >
      {showAll ? t('marketing.inbox.showEverything') : t('marketing.inbox.showOpen')}
    </DuncitButton>
  );

  return (
    <Stack spacing={2} sx={{ p: 2 }} data-testid="inbox-page">
      <PageHeader title={t('marketing.inbox.title')} subtitle={t('marketing.inbox.unifiedSubtitle')} />
      <RunsGuide
        id={TOUR_ID}
        summary={t('marketing.inbox.unifiedIntroSummary')}
        steps={[t('marketing.inbox.unifiedIntroStep1'), t('marketing.inbox.unifiedIntroStep2'), t('marketing.inbox.unifiedIntroStep3')]}
        tour={tourSteps(t)}
      />
      {error && <Alert severity="error">{parseApiError(error)}</Alert>}
      <DuncitTabs {...tabs} idPrefix="inbox" variant="scrollable" scrollButtons="auto" />
      <InboxSummaryCards channel={tabs.value} refetchRef={cardsRefetch} />
      <Box {...tabPanelProps('inbox', tabs.value)} data-tour="inbox-table">
        <InboxChannelPanel
          channel={tabs.value}
          view={view}
          accounts={data?.socialAccounts ?? NO_ACCOUNTS}
          onOpenComment={setOpenComment}
          onOpenConversation={setOpenConversation}
          refetchRef={tableRefetch}
          toolbarActions={toggle}
        />
      </Box>
      <InboxDrawer
        comment={openComment}
        capabilities={data?.socialReplyCapabilities ?? NO_CAPABILITIES}
        onClose={() => setOpenComment(null)}
        onChanged={commentChanged}
      />
      <ConversationDrawer conversationId={openConversation} onClose={() => setOpenConversation(null)} onChanged={refresh} />
    </Stack>
  );
}
