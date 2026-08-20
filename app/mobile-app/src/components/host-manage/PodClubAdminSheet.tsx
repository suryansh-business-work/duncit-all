import { Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SHEET_SAFE_AREA } from '@/components/DuncitDialog/sheet-body';
import { MaterialIcons } from '@expo/vector-icons';
import { Button, ScrollView, Spinner, Text, XStack, YStack } from 'tamagui';

import { ModalThemeScope } from '@/components/ModalThemeScope';
import { ClubAdminCard } from '@/components/pod-pending';
import { useClubAdmins } from '@/hooks/useClubAdmins';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

export interface PodClubAdminTarget {
  id: string;
  pod_title: string;
  club_id?: string | null;
}

/** "Pod Club Admin" — who runs the club this pod belongs to, and how to reach
 * them, plus a support ticket that carries the pod through. Tamagui twin of
 * mWeb's PodClubAdminDialog (rule 27). */
export function PodClubAdminSheet({
  pod,
  onClose,
  onSupport,
}: Readonly<{ pod: PodClubAdminTarget | null; onClose: () => void; onSupport: () => void }>) {
  const { t } = useTranslation();
  const { onPrimary } = useThemeColors();
  const { admins, isLoading, hasError } = useClubAdmins(pod?.club_id ?? null);

  let body;
  if (isLoading) {
    body = (
      <YStack alignItems="center" paddingVertical={28} testID="pod-club-admin-loading">
        <Spinner size="large" />
      </YStack>
    );
  } else if (hasError) {
    body = (
      <Text testID="pod-club-admin-error" fontSize={13} color="$danger">
        {t('mweb.podClubAdmin.loadFailed')}
      </Text>
    );
  } else if (admins.length === 0) {
    body = (
      <Text testID="pod-club-admin-empty" fontSize={13} color="$muted">
        {t('mweb.podClubAdmin.none')}
      </Text>
    );
  } else {
    body = (
      <YStack gap={10}>
        {admins.map((admin) => (
          <ClubAdminCard
            key={admin.id}
            caption={t('mweb.podClubAdmin.caption')}
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

  return (
    <Modal visible={!!pod} transparent animationType="fade" onRequestClose={onClose}>
      <ModalThemeScope>
        <YStack flex={1} justifyContent="flex-end" testID="pod-club-admin-sheet">
          <YStack
            role="button"
            aria-label={t('mweb.podClubAdmin.close')}
            onPress={onClose}
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            backgroundColor="rgba(0,0,0,0.5)"
          />
          <YStack
            backgroundColor="$background"
            borderTopLeftRadius={20}
            borderTopRightRadius={20}
            padding={18}
            maxHeight="85%"
          >
            <SafeAreaView edges={['bottom']} style={SHEET_SAFE_AREA}>
              <Text fontSize={16} fontWeight="700" color="$color">
                {t('mweb.podClubAdmin.title')}
              </Text>
              <Text
                fontSize={12.5}
                color="$muted"
                paddingTop={2}
                paddingBottom={12}
                numberOfLines={1}
              >
                {pod?.pod_title ?? ''}
              </Text>
              <ScrollView showsVerticalScrollIndicator={false}>{body}</ScrollView>
              <XStack gap={10} paddingTop={14}>
                <Button flex={1} onPress={onClose} chromeless>
                  {t('mweb.podClubAdmin.close')}
                </Button>
                <Button
                  testID="pod-club-admin-support"
                  flex={2}
                  onPress={onSupport}
                  backgroundColor="$primary"
                  color="$onPrimary"
                  fontWeight="700"
                  icon={<MaterialIcons name="support-agent" size={18} color={onPrimary} />}
                >
                  {t('mweb.podClubAdmin.support')}
                </Button>
              </XStack>
            </SafeAreaView>
          </YStack>
        </YStack>
      </ModalThemeScope>
    </Modal>
  );
}
