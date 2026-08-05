import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { AppImage } from '@/components/AppImage';
import { useThemeColors } from '@/hooks/useThemeColors';
import { mailtoUrl, telUrl, whatsappUrl } from '@/utils/pod-pending';
import { ActionLink } from './ActionLink';
import { InfoRow, type InfoRowProps } from './InfoRow';

/** The contact details a club admin is rendered from — satisfied both by the
 * pod-pending view's `club_admin` and by a club's `club_admins` entry. */
export interface ClubAdminContact {
  name: string;
  profile_photo?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
}

/** "Need Help? Contact the Club Admin" card — profile, contact rows and
 * Call / Message (WhatsApp) / Email actions. Support availability is not
 * tracked anywhere in the system, so no such row is rendered. */
export function ClubAdminCard({
  admin,
  caption = 'Need Help? Contact the Club Admin',
}: Readonly<{ admin: ClubAdminContact; caption?: string }>) {
  const { muted } = useThemeColors();
  const waUrl = whatsappUrl(admin.whatsapp ?? '');
  // TODO(i18n) — row labels ship as literals until this feature is localized.
  const rows: InfoRowProps[] = [];
  if (admin.phone) {
    rows.push({ icon: 'phone', label: 'Phone', value: admin.phone, testID: 'club-admin-phone' });
  }
  if (admin.whatsapp) {
    rows.push({
      icon: 'chat',
      label: 'WhatsApp',
      value: admin.whatsapp,
      testID: 'club-admin-whatsapp',
    });
  }
  if (admin.email) {
    rows.push({ icon: 'email', label: 'Email', value: admin.email, testID: 'club-admin-email' });
  }

  return (
    <YStack
      testID="club-admin-card"
      gap={10}
      padding={12}
      borderWidth={1}
      borderColor="$borderColor"
      borderRadius={12}
      backgroundColor="$surface"
    >
      <Text fontSize={12} fontWeight="600" color="$muted">
        {caption}
      </Text>
      <XStack alignItems="center" gap={10}>
        {admin.profile_photo ? (
          <AppImage
            testID="club-admin-photo"
            source={{ uri: admin.profile_photo }}
            style={{ width: 44, height: 44, borderRadius: 22 }}
          />
        ) : (
          <XStack
            testID="club-admin-avatar-fallback"
            width={44}
            height={44}
            borderRadius={22}
            alignItems="center"
            justifyContent="center"
            borderWidth={1}
            borderColor="$borderColor"
          >
            <MaterialIcons name="person" size={22} color={muted} />
          </XStack>
        )}
        <Text flex={1} fontSize={16} fontWeight="700" color="$color">
          {admin.name}
        </Text>
      </XStack>
      {rows.map((row) => (
        <InfoRow key={row.label} {...row} />
      ))}
      <XStack gap={18} flexWrap="wrap">
        {/* TODO(i18n) — action labels ship as literals until this feature is localized. */}
        {admin.phone ? (
          <ActionLink testID="club-admin-call" icon="call" label="Call" url={telUrl(admin.phone)} />
        ) : null}
        {waUrl ? (
          <ActionLink testID="club-admin-message" icon="chat" label="Message" url={waUrl} />
        ) : null}
        {admin.email ? (
          <ActionLink
            testID="club-admin-email-action"
            icon="email"
            label="Email"
            url={mailtoUrl(admin.email)}
          />
        ) : null}
      </XStack>
    </YStack>
  );
}
