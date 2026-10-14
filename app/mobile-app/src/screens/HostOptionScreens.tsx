import type { ReactNode } from 'react';
import { Spinner, YStack } from 'tamagui';

import { HostApplyBanner } from '@/components/host-manage/HostApplyBanner';
import { HostCategoriesCard } from '@/components/host-manage/HostCategoriesCard';
import { HostShareSection } from '@/components/host-manage/HostShareSection';
import { RefreshScrollView } from '@/components/PullToRefresh';
import { StackScreen } from '@/components/StackScreen';
import { useHostPayouts } from '@/hooks/useHostPayouts';
import { useMe } from '@/hooks/useMe';
import { useTranslation } from '@/hooks/useTranslation';

/** The frame both Host Options screens share: title, scroll, and the host gate —
 * only an approved host has payouts or categories to show. */
function HostOptionFrame({
  title,
  testID,
  children,
}: Readonly<{ title: string; testID: string; children: ReactNode }>) {
  const { t } = useTranslation();
  const { data, isLoading } = useMe();
  const me = data?.me;
  const isHost = me?.roles?.includes('HOST') ?? false;
  return (
    <StackScreen title={title} testID={testID}>
      <RefreshScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
      >
        <YStack gap={16}>
          {isLoading && !me ? (
            <Spinner role="progressbar" aria-label={t('mweb.a11y.loading')} color="$primary" />
          ) : null}
          {me && isHost ? children : null}
        </YStack>
      </RefreshScrollView>
    </StackScreen>
  );
}

function HostShareList() {
  return <HostShareSection {...useHostPayouts()} />;
}

/** Host Options → Host Share (/host/share): every completion payout the host has
 * earned — moved off Hosts Management so that screen lists pods only. */
export function HostShareScreen() {
  const { t } = useTranslation();
  return (
    <HostOptionFrame title={t('mweb.studioOptions.hostShare')} testID="host-share-screen">
      <HostShareList />
    </HostOptionFrame>
  );
}

/** Host Options → Your Categories (/host/categories): the categories the host is
 * approved for and the way to apply for another. */
export function HostCategoriesScreen() {
  const { t } = useTranslation();
  return (
    <HostOptionFrame title={t('mweb.studioOptions.hostCategories')} testID="host-categories-screen">
      <HostCategoriesCard />
      <HostApplyBanner />
    </HostOptionFrame>
  );
}
