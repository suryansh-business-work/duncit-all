import { Spinner, Text, XStack, YStack } from 'tamagui';
import { CRM_WEBSITE_PAGE_STATUS_TONE } from '@duncit/utils';

import { SURFACE } from '@/components/surface';
import { ToneChip } from '@/components/ToneChip';
import { useTranslation } from '@/hooks/useTranslation';
import { LinkText } from './parts/LinkText';
import { TabIconButton } from './TabIconButton';
import type { WebsitePage } from './WebsitePagesState';

interface Props {
  page: WebsitePage;
  fetching: boolean;
  onFetch: () => void;
  onView: () => void;
  onDelete: () => void;
}

/** One saved page: its address and title, how it stands, its size, and fetch / view / delete. */
export function WebsitePageRow({ page, fetching, onFetch, onView, onDelete }: Readonly<Props>) {
  const { t } = useTranslation();
  const fetched = page.status === 'FETCHED';
  return (
    <YStack {...SURFACE} gap="$2" testID={`website-page-${page.id}`}>
      <LinkText href={page.url} testID={`website-link-${page.id}`} />
      {page.title ? (
        <Text color="$muted" fontSize="$2">
          {page.title}
        </Text>
      ) : null}
      <XStack alignItems="center" gap="$2" flexWrap="wrap">
        <ToneChip
          label={page.status}
          tone={CRM_WEBSITE_PAGE_STATUS_TONE[page.status] ?? 'default'}
        />
        <Text color="$muted" fontSize="$2">
          {t('crm.components.chars')}
        </Text>
        <Text fontSize="$2">
          {page.content_chars ? page.content_chars.toLocaleString() : t('crmApp.common.dash')}
        </Text>
        <XStack flex={1} justifyContent="flex-end" alignItems="center">
          {fetching ? (
            <Spinner color="$accentText" aria-label={t('crm.components.fetchContent')} />
          ) : (
            <TabIconButton
              icon={fetched ? 'refresh' : 'download'}
              label={
                fetched ? t('crm.websitePages.refetchContent') : t('crm.components.fetchContent')
              }
              onPress={onFetch}
              tone="accent"
              testID={`website-fetch-${page.id}`}
            />
          )}
          <TabIconButton
            icon="article"
            label={t('crm.components.viewContent')}
            onPress={onView}
            disabled={!page.content_text}
            tone="neutral"
            testID={`website-view-${page.id}`}
          />
          <TabIconButton
            icon="delete"
            label={t('crm.components.deletePage')}
            onPress={onDelete}
            tone="danger"
            testID={`website-delete-${page.id}`}
          />
        </XStack>
      </XStack>
      {page.error ? (
        <Text color="$danger" fontSize="$2">
          {page.error}
        </Text>
      ) : null}
    </YStack>
  );
}
