import { Text, YStack } from 'tamagui';

import { ClubAdminCard } from '@/components/pod-pending/ClubAdminCard';
import type { PodDetail } from '@/hooks/useDetails';
import { useTranslation } from '@/hooks/useTranslation';

type ClubAdmin = NonNullable<PodDetail['club']>['club_admins'][number];

/** The people who run the club this pod belongs to, and how to reach them.
 *
 * Renders the same contact card the club screen and the host's waiting screen
 * use, so a number that is dialable in one place is dialable in all of them
 * (mWeb twin: PodClubAdminsSection, rule 27). */
export function PodClubAdminsSection({ admins }: Readonly<{ admins: readonly ClubAdmin[] }>) {
  const { t } = useTranslation();
  if (admins.length === 0) {
    return (
      <Text fontSize={13} color="$muted">
        {t('mweb.podDetails.clubAdminsEmpty')}
      </Text>
    );
  }

  return (
    <YStack gap={12} testID="pod-club-admins">
      {admins.map((admin) => (
        <ClubAdminCard
          key={admin.id}
          caption={t('mweb.common.contactTheClubAdmin')}
          admin={{
            name: admin.name,
            profile_photo: admin.avatar_url,
            email: admin.email,
            phone: admin.phone,
            whatsapp: admin.whatsapp,
          }}
        />
      ))}
    </YStack>
  );
}
