import { useState } from 'react';
import { XStack, YStack } from 'tamagui';
import { fireAndForget, logs } from '@duncit/logs';

import { Card } from '@/components/Card';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DuncitButton } from '@/components/DuncitButton';
import { StateView } from '@/components/StateView';
import { ToneChip } from '@/components/ToneChip';
import { WebsiteScrapeForm } from '@/forms/website-scrape';
import { useTranslation } from '@/hooks/useTranslation';
import { LinkText } from './parts/LinkText';
import { TabAlert } from './TabAlert';
import { TabSheet } from './TabSheet';
import { isWebsiteKind, type LeadTabProps, type WebsiteKind } from './TabsBTypes';
import { WebsitePageContent } from './WebsitePageContent';
import { WebsitePageRow } from './WebsitePageRow';
import { useWebsitePages, type WebsitePage } from './WebsitePagesState';

const SCOPE = 'crm-app/WebsitePagesTab';

function WebsitePanel({ kind, id }: Readonly<{ kind: WebsiteKind; id: string }>) {
  const { t } = useTranslation();
  const w = useWebsitePages(kind, id);
  const [scrapeOpen, setScrapeOpen] = useState(false);
  const [viewing, setViewing] = useState<WebsitePage | null>(null);
  const [removing, setRemoving] = useState<WebsitePage | null>(null);

  if (w.siteLoading || w.siteError) {
    return <StateView loading={w.siteLoading} error={w.siteError} onRetry={w.refetchSite} />;
  }
  if (!w.website) return <TabAlert tone="info">{t('crm.websitePages.noWebsite')}</TabAlert>;
  const website = w.website;
  const count = w.unfetched.length;
  const fetchLabel = w.progress
    ? t('crm.websitePages.fetching', { vars: { done: w.progress.done, total: w.progress.total } })
    : t('crm.websitePages.fetchAll', { vars: { count } });

  return (
    <YStack gap="$3" testID="website-tab">
      <Card title={t('crm.common.website')}>
        <LinkText href={website} testID="website-link" />
        <XStack>
          <ToneChip
            label={t('crm.websitePages.savedCount', { count: w.pages.length })}
            tone="default"
          />
        </XStack>
        <XStack gap="$2" flexWrap="wrap">
          <DuncitButton
            label={fetchLabel}
            onPress={() => fireAndForget(w.fetchAll(), logs.mobileApp, SCOPE, 'fetchAll')}
            variant="outline"
            size="sm"
            disabled={Boolean(w.progress) || count === 0}
            testID="website-fetch-all"
          />
          <DuncitButton
            label={t('crm.websitePages.scrape')}
            onPress={() => {
              w.clearError();
              setScrapeOpen(true);
            }}
            size="sm"
            testID="website-scrape"
          />
        </XStack>
      </Card>
      {w.error ? (
        <TabAlert tone="danger" onClose={w.clearError} testID="website-error">
          {w.error}
        </TabAlert>
      ) : null}
      <StateView
        loading={w.pagesLoading}
        error={w.pagesError}
        empty={w.pages.length === 0 ? t('crm.websitePages.empty') : null}
        onRetry={w.refetchPages}
      />
      {w.pages.map((page) => (
        <WebsitePageRow
          key={page.id}
          page={page}
          fetching={w.fetchingId === page.id}
          onFetch={() => fireAndForget(w.fetchOne(page), logs.mobileApp, SCOPE, 'fetchOne')}
          onView={() => setViewing(page)}
          onDelete={() => setRemoving(page)}
        />
      ))}
      <TabSheet
        open={scrapeOpen}
        title={t('crm.components.scrapeWebsitePages')}
        busy={w.scraping}
        onClose={() => setScrapeOpen(false)}
        testID="website-scrape-sheet"
      >
        {w.error ? <TabAlert tone="danger">{w.error}</TabAlert> : null}
        <WebsiteScrapeForm
          website={website}
          busy={w.scraping}
          onCancel={() => setScrapeOpen(false)}
          onSubmit={async ({ limit }) => {
            if (await w.scrape(limit)) setScrapeOpen(false);
          }}
        />
      </TabSheet>
      <WebsitePageContent page={viewing} onClose={() => setViewing(null)} />
      <ConfirmDialog
        open={Boolean(removing)}
        title={t('crm.components.deletePage')}
        message={t('crm.websitePages.deleteMessage', { vars: { url: removing?.url ?? '' } })}
        confirmLabel={t('shell.common.delete')}
        cancelLabel={t('shell.common.cancel')}
        danger
        busy={w.deleting}
        onConfirm={() => {
          if (!removing) return;
          const done = w.remove(removing).then(() => setRemoving(null));
          fireAndForget(done, logs.mobileApp, SCOPE, 'delete');
        }}
        onCancel={() => setRemoving(null)}
        testID="website-delete"
      />
    </YStack>
  );
}

/**
 * The lead's Website tab: scrape its site into a saved page list, fetch each
 * page's readable content (one at a time or all that are left), read it and
 * delete pages. Venue and host leads, as in the portal.
 */
export function WebsitePagesTab({ kind, id }: Readonly<LeadTabProps>) {
  if (!isWebsiteKind(kind)) return null;
  return <WebsitePanel kind={kind} id={id} />;
}
