import { Text, XStack, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';
import { formatCount, formatMoney, formatRating, type ClubAdminClubRow } from '@duncit/utils';

import { useTranslation } from '@/hooks/useTranslation';
import { MetricCell } from '../MetricCell';

interface Props {
  clubs: readonly ClubAdminClubRow[];
  currency: string;
  /** Opens the club's pods. */
  onOpen: (clubId: string) => void;
}

/** The per-club breakdown — one tappable row per club, with the three
 * columns the MUI table shows. */
export function ClubBreakdown({ clubs, currency, onOpen }: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <YStack gap={10} testID="club-dashboard-clubs">
      <Text fontSize={15} fontWeight="700" color="$color">
        {t('clubAdmin.dashboard.perClubBreakdown')}
      </Text>
      {clubs.length === 0 ? (
        <Text testID="club-dashboard-clubs-empty" fontSize={13} color="$muted">
          {t('clubAdmin.dashboard.noClubs')}
        </Text>
      ) : null}
      {clubs.map((club) => (
        <YStack
          key={club.club_id}
          testID={`club-dashboard-club-${club.club_id}`}
          role="button"
          aria-label={club.club_name}
          onPress={() => onOpen(club.club_id)}
          pressStyle={PRESS_STYLE.surface}
          gap={8}
          padding={12}
          borderRadius={12}
          borderWidth={1}
          borderColor="$borderColor"
          backgroundColor="$surface"
        >
          <Text fontSize={14.5} fontWeight="600" color="$color" numberOfLines={1}>
            {club.club_name}
          </Text>
          <XStack gap={10}>
            <MetricCell
              testID={`club-dashboard-club-${club.club_id}-pods`}
              label={t('clubAdmin.dashboard.column.totalPods')}
              value={formatCount(club.total_pods)}
            />
            <MetricCell
              testID={`club-dashboard-club-${club.club_id}-rating`}
              label={t('clubAdmin.dashboard.column.rating')}
              value={formatRating(club.rating)}
            />
            <MetricCell
              testID={`club-dashboard-club-${club.club_id}-revenue`}
              label={t('clubAdmin.dashboard.column.revenue')}
              value={formatMoney(club.revenue, { symbol: currency })}
            />
          </XStack>
        </YStack>
      ))}
    </YStack>
  );
}
