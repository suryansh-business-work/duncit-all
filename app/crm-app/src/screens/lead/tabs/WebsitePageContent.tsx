import { Text } from 'tamagui';

import { useTranslation } from '@/hooks/useTranslation';
import type { WebsitePage } from './WebsitePagesState';
import { TabSheet } from './TabSheet';

/** A page's fetched title and extracted text, read-only — the portal's page content dialog. */
export function WebsitePageContent({
  page,
  onClose,
}: Readonly<{ page: WebsitePage | null; onClose: () => void }>) {
  const { t } = useTranslation();
  return (
    <TabSheet
      open={Boolean(page)}
      title={page?.title || t('crm.websitePages.pageContent')}
      subtitle={page?.url}
      onClose={onClose}
      testID="website-content"
    >
      {page?.content_text ? (
        <>
          <Text color="$muted" fontSize="$2">
            {t('crm.websitePages.charsExtracted', {
              vars: { count: page.content_chars.toLocaleString() },
            })}
          </Text>
          <Text selectable>{page.content_text}</Text>
        </>
      ) : (
        <Text color="$muted">{t('crm.websitePages.noContent')}</Text>
      )}
    </TabSheet>
  );
}
