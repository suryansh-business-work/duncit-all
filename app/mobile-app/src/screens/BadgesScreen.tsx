import { ScrollView, Spinner, Text, YStack } from 'tamagui';

import { sortBadgeProgress } from '@duncit/utils';
import { StackScreen } from '@/components/StackScreen';
import { BadgeProgressCard } from '@/components/badges';
import { useBadges } from '@/hooks/useBadges';
import { useTranslation } from '@/hooks/useTranslation';

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
  const { rows, isLoading, hasError } = useBadges();
  const sorted = sortBadgeProgress(rows);
  const unlocked = sorted.filter((row) => row.achieved).length;

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
      <YStack gap={12}>
        {sorted.map((row) => (
          <BadgeProgressCard key={row.badge.id} row={row} />
        ))}
      </YStack>
    );
  }

  return (
    <StackScreen title={t('mweb.badges.title')} testID="badges-screen">
      <ScrollView flex={1} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <YStack gap={12}>
          <YStack gap={4}>
            <Text fontSize={13} color="$muted">
              {t('mweb.badges.intro')}
            </Text>
            {sorted.length > 0 ? (
              <Text fontSize={12} fontWeight="700" color="$muted">
                {t('mweb.badges.summary', { vars: { unlocked, total: sorted.length } })}
              </Text>
            ) : null}
          </YStack>
          {body}
        </YStack>
      </ScrollView>
    </StackScreen>
  );
}
