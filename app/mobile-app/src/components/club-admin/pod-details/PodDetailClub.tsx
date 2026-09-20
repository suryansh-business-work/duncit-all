import { Text, XStack } from 'tamagui';

import { ClubAdminCard } from '@/components/pod-pending';
import type { ClubPodDetail } from '@/hooks/useClubPodDetail';
import { useDetailNav } from '@/hooks/useDetailNav';
import { useTranslation } from '@/hooks/useTranslation';
import { NavRow } from '../NavRow';
import { PodDetailSection } from './PodDetailSection';

type PodClub = NonNullable<ClubPodDetail['club']>;

/**
 * The pod's club, the way through to it, and the people who run it.
 *
 * Two blocks rather than one, for the reason `@duncit/pod-details` splits them
 * (rule 27): the club answers "which club is this", while the admins are the
 * people somebody picks up the phone to when a pod goes wrong — and a name
 * with no number beside it was never the answer to that. Each admin renders
 * through the SAME contact card the pod-pending screen already uses, so Call /
 * WhatsApp / Email behave identically wherever a club admin is offered.
 */
export function PodDetailClub({ club }: Readonly<{ club: PodClub | null }>) {
  const { t } = useTranslation();
  const { openClub } = useDetailNav();
  const admins = club?.club_admins ?? [];
  const caption = t('podDetailsPanel.podClubAdminsCard.clubAdminDetails');

  if (!club) {
    return (
      <PodDetailSection
        title={t('podDetailsPanel.podClubCard.club')}
        testID="club-pod-detail-club"
        emptyText={t('podDetailsPanel.common.noClubLinked')}
      />
    );
  }

  return (
    <>
      <PodDetailSection title={t('podDetailsPanel.podClubCard.club')} testID="club-pod-detail-club">
        <XStack alignItems="baseline" gap={8} flexWrap="wrap">
          <Text testID="club-pod-detail-club-name" fontSize={15} fontWeight="600" color="$color">
            {club.club_name}
          </Text>
          <Text fontSize={12} color="$muted">
            {`/${club.club_id}`}
          </Text>
        </XStack>
        <NavRow
          testID="club-pod-detail-view-club"
          icon="groups"
          label={t('podDetailsPanel.podClubCard.viewClub')}
          onPress={() => openClub(club.club_id)}
        />
      </PodDetailSection>
      {admins.length === 0 ? (
        <PodDetailSection
          title={caption}
          testID="club-pod-detail-club-admins"
          emptyText={t('podDetailsPanel.podClubAdminsCard.noClubAdmins')}
        />
      ) : null}
      {admins.map((admin) => (
        <ClubAdminCard
          key={admin.id}
          caption={caption}
          admin={{
            name: admin.name,
            profile_photo: admin.avatar_url,
            email: admin.email,
            phone: admin.phone,
            whatsapp: admin.whatsapp,
          }}
        />
      ))}
    </>
  );
}
