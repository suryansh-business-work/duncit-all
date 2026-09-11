import { useWindowDimensions } from 'react-native';
import { Spinner, Text, XStack, YStack } from 'tamagui';

import { sortBadgeProgress } from '@duncit/utils';
import { StackScreen } from '@/components/StackScreen';
import { BadgeProgressCard } from '@/components/badges';
import { useBadges } from '@/hooks/useBadges';
import { useTranslation } from '@/hooks/useTranslation';
import { RefreshScrollView } from '@/components/PullToRefresh';

const GRID_GAP = 12;
const SIDE_PADDING = 16;

/**
 * The Badges section — every badge Duncit publishes, each stating the goal it
 * asks for and the window that goal has to happen in, with the member's own
 * progress against it. Reaching a goal unlocks the badge here and shows it on
 * their profile.
 *
 * RN twin of mWeb's BadgesPage (rule 27); reached from the sidebar row that
 * sits under FAQs.
 */
export function BadgesScreen() {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const { rows, isLoading, hasError } = useBadges();
  const sorted = sortBadgeProgress(rows);
  const unlocked = sorted.filter((row) => row.achieved).length;
  const tileWidth = Math.floor((width - SIDE_PADDING * 2 - GRID_GAP) / 2);

  let body = null;
  if (isLoading) {
    body = (
      <YStack testID="badges-loading" alignItems="center" paddingVertical={32}>
        <Spinner />
      </YStack>
    );
  } else if (hasError) {
    body = (
      <Text testID="badges-error" fontSize={14} color="$danger">
        {t('mweb.badges.loadError')}
      </Text>
    );
  } else if (sorted.length === 0) {
    body = (
      <Text testID="badges-empty" fontSize={14} color="$muted">
        {t('mweb.badges.empty')}
      </Text>
    );
  } else {
    body = (
      <XStack flexWrap="wrap" gap={GRID_GAP}>
        {sorted.map((row) => (
          <YStack key={row.badge.id} width={tileWidth}>
            <BadgeProgressCard row={row} />
          </YStack>
        ))}
      </XStack>
    );
  }

  return (
    <StackScreen title={t('mweb.badges.title')} testID="badges-screen">
      <RefreshScrollView
        flex={1}
        contentContainerStyle={{ padding: SIDE_PADDING, paddingBottom: 32 }}
      >
        <YStack gap={16}>
          {sorted.length > 0 ? (
            <Text fontSize={14} fontWeight="500" color="$muted">
              {t('mweb.badges.summary', { vars: { unlocked, total: sorted.length } })}
            </Text>
          ) : null}
          {body}
        </YStack>
      </RefreshScrollView>
    </StackScreen>
  );
}
