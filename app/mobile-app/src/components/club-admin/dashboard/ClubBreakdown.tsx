import { Fragment } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';
import { formatCount, formatMoney, formatRating, type ClubAdminClubRow } from '@duncit/utils';

import { SectionHeader } from '@/components/SectionHeader';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { MetricCell } from '../MetricCell';
import { RowDivider } from '../NavRow';

interface Props {
  clubs: readonly ClubAdminClubRow[];
  currency: string;
  /** Opens the club's pods. */
  onOpen: (clubId: string) => void;
}

/** The per-club breakdown — one tappable row per club inside one card, with
 * the three columns the MUI table shows. */
export function ClubBreakdown({ clubs, currency, onOpen }: Readonly<Props>) {
  const { t } = useTranslation();
  const { muted } = useThemeColors();

  return (
    <YStack gap={12} testID="club-dashboard-clubs">
      <SectionHeader title={t('clubAdmin.dashboard.perClubBreakdown')} />
      <SurfaceCard padding={0} overflow="hidden">
        {clubs.length === 0 ? (
          <Text testID="club-dashboard-clubs-empty" padding={16} fontSize={14} color="$muted">
            {t('clubAdmin.dashboard.noClubs')}
          </Text>
        ) : null}
        {clubs.map((club, index) => (
          <Fragment key={club.club_id}>
            {index > 0 ? <RowDivider /> : null}
            <XStack
              testID={`club-dashboard-club-${club.club_id}`}
              role="button"
              aria-label={club.club_name}
              onPress={() => onOpen(club.club_id)}
              pressStyle={PRESS_STYLE.row}
              alignItems="center"
              gap={8}
              paddingHorizontal={16}
              paddingVertical={14}
            >
              <YStack flex={1} gap={8}>
                <Text fontSize={16} fontWeight="600" color="$color" numberOfLines={1}>
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
              <MaterialIcons name="chevron-right" size={22} color={muted} />
            </XStack>
          </Fragment>
        ))}
      </SurfaceCard>
    </YStack>
  );
}
