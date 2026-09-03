import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { formatCount } from '@duncit/utils';

import { AppImage } from '@/components/AppImage';
import { DuncitButton } from '@/components/DuncitButton';
import type { AdminClubRow as AdminClubRowData } from '@/hooks/useClubAdminClubs';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { MetricCell } from '../MetricCell';

const COVER_STYLE = { width: 56, height: 56, borderRadius: 12 } as const;

interface Props {
  club: AdminClubRowData;
  testID: string;
  onOpenPods: () => void;
  onEdit: () => void;
}

/** One club the admin runs — cover, name, category, locality, the three
 * figures, and the two doors: its pods and its page. */
export function AdminClubRow({ club, testID, onOpenPods, onEdit }: Readonly<Props>) {
  const { t } = useTranslation();
  const { onPrimary } = useThemeColors();
  const category = [club.super_category, club.category].filter(Boolean).join(' › ');
  const line = [category, club.locality].filter(Boolean).join(' · ');
  const verified = club.is_verified
    ? t('clubAdmin.clubs.verified')
    : t('clubAdmin.clubs.unverified');

  return (
    <YStack
      testID={testID}
      gap={10}
      padding={12}
      borderRadius={12}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
    >
      <XStack alignItems="center" gap={12}>
        {club.cover_image_url ? (
          <AppImage source={{ uri: club.cover_image_url }} style={COVER_STYLE} />
        ) : (
          <YStack
            width={56}
            height={56}
            borderRadius={12}
            alignItems="center"
            justifyContent="center"
            backgroundColor="$primary"
          >
            <MaterialIcons name="groups" size={26} color={onPrimary} />
          </YStack>
        )}
        <YStack flex={1} gap={2}>
          <Text fontSize={14.5} fontWeight="700" color="$color" numberOfLines={1}>
            {club.club_name}
          </Text>
          {line ? (
            <Text fontSize={12} color="$muted" numberOfLines={1}>
              {line}
            </Text>
          ) : null}
          <Text
            testID={`${testID}-verified`}
            fontSize={11.5}
            fontWeight="700"
            color={club.is_verified ? '$success' : '$muted'}
          >
            {verified}
          </Text>
        </YStack>
      </XStack>
      <XStack gap={10}>
        <MetricCell
          testID={`${testID}-followers`}
          label={t('clubAdmin.clubs.followers')}
          value={formatCount(club.followers_count)}
        />
        <MetricCell
          testID={`${testID}-pods`}
          label={t('clubAdmin.clubs.pods')}
          value={formatCount(club.total_pods)}
        />
        <MetricCell
          testID={`${testID}-upcoming`}
          label={t('clubAdmin.clubs.upcoming')}
          value={formatCount(club.upcoming_pods)}
        />
      </XStack>
      <XStack gap={10} justifyContent="flex-end">
        <DuncitButton
          testID={`${testID}-open-pods`}
          label={t('mweb.clubStudio.openPods')}
          onPress={onOpenPods}
          size="sm"
        />
        <DuncitButton
          testID={`${testID}-edit`}
          label={t('mweb.clubStudio.editClub')}
          onPress={onEdit}
          variant="outline"
          tone="neutral"
          size="sm"
        />
      </XStack>
    </YStack>
  );
}
