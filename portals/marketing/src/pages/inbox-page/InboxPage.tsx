import { useCallback, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Alert, Box, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { PageHeader, type PortalTourStep } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import type { Translate } from '@duncit/shell';
import RunsGuide from '../activity-page/RunsGuide';
import { inboxViewOf } from './copy';
import InboxSummaryCards from './InboxSummaryCards';
import InboxTable from './InboxTable';
import InboxDrawer from './drawer/InboxDrawer';
import { SOCIAL_INBOX_SETUP, type InboxAccount, type InboxComment, type SocialReplyCapability } from './queries';

const TOUR_ID = 'marketing.inbox';
const NO_ACCOUNTS: InboxAccount[] = [];
const NO_CAPABILITIES: SocialReplyCapability[] = [];

const tourSteps = (t: Translate): PortalTourStep[] => [
  { anchor: 'inbox-cards', title: t('marketing.inbox.tourCardsTitle'), body: t('marketing.inbox.tourCardsBody') },
  { anchor: 'inbox-table', title: t('marketing.inbox.tourTableTitle'), body: t('marketing.inbox.tourTableBody') },
];

/**
 * Marketing → Social → Inbox: every comment from every connected account as
 * one queue. `?view=FLAGGED` (UNASSIGNED, MINE, ALL) pins the slice a card
 * opens; open comments otherwise.
 */
export default function InboxPage() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const view = inboxViewOf(params);
  const [open, setOpen] = useState<InboxComment | null>(null);
  const tableRefetch = useRef<(() => void) | null>(null);
  const cardsRefetch = useRef<(() => void) | null>(null);
  const { data, error } = useQuery<{ socialAccounts: InboxAccount[]; socialReplyCapabilities: SocialReplyCapability[] }>(SOCIAL_INBOX_SETUP);

  const changed = useCallback((comment: InboxComment) => {
    setOpen(comment);
    tableRefetch.current?.();
    cardsRefetch.current?.();
  }, []);
  const close = useCallback(() => setOpen(null), []);
  const showAll = view !== 'ALL';

  return (
    <Stack spacing={2} sx={{ p: 2 }} data-testid="inbox-page">
      <PageHeader title={t('marketing.inbox.title')} subtitle={t('marketing.inbox.subtitle')} />
      <RunsGuide
        id={TOUR_ID}
        summary={t('marketing.inbox.introSummary')}
        steps={[t('marketing.inbox.introStep1'), t('marketing.inbox.introStep2'), t('marketing.inbox.introStep3')]}
        tour={tourSteps(t)}
      />
      {error && <Alert severity="error">{parseApiError(error)}</Alert>}
      <InboxSummaryCards refetchRef={cardsRefetch} />
      <Box data-tour="inbox-table">
        <InboxTable
          view={view}
          accounts={data?.socialAccounts ?? NO_ACCOUNTS}
          onOpen={setOpen}
          refetchRef={tableRefetch}
          toolbarActions={
            <DuncitButton variant="text" onClick={() => setParams({ view: showAll ? 'ALL' : 'OPEN' })} data-testid="inbox-toggle-all">
              {showAll ? t('marketing.inbox.showAll') : t('marketing.inbox.showOpen')}
            </DuncitButton>
          }
        />
      </Box>
      <InboxDrawer comment={open} capabilities={data?.socialReplyCapabilities ?? NO_CAPABILITIES} onClose={close} onChanged={changed} />
    </Stack>
  );
}
