import { Text, YStack } from 'tamagui';

import { ClubAdminCard } from '@/components/pod-pending/ClubAdminCard';
import type { ClubDetail } from '@/hooks/useDetails';

type ClubAdmin = ClubDetail['club_admins'][number];

/** The people who run this club and how to reach them — name, email, phone and
 * WhatsApp, straight off each admin's profile. Renders the same contact card
 * the host's waiting page uses (mWeb twin: ClubAdminsSection, rule 27). */
export function ClubAdminsSection({ admins }: Readonly<{ admins: ClubAdmin[] }>) {
  if (admins.length === 0) return null;

  return (
    <YStack gap={12} testID="club-admins">
      <Text fontSize={16} fontWeight="700" color="$color">
        Club Admins
      </Text>
      {admins.map((admin) => (
        <ClubAdminCard
          key={admin.id}
          caption="Contact the Club Admin"
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
