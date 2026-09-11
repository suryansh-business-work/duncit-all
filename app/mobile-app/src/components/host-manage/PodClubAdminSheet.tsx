import { Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SHEET_SAFE_AREA } from '@/components/DuncitDialog/sheet-body';
import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Spinner, Text, XStack, YStack } from 'tamagui';

import { AskClubAdminHelp } from '@/components/AskClubAdminHelp';
import { DuncitButton } from '@/components/DuncitButton';
import { ModalThemeScope } from '@/components/ModalThemeScope';
import { ClubAdminCard } from '@/components/pod-pending';
import { useClubAdmins } from '@/hooks/useClubAdmins';
import { PodHelpSide } from '@/hooks/usePodClubAdminHelp';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

export interface PodClubAdminTarget {
  id: string;
  pod_title: string;
  club_id?: string | null;
}

/** "Pod Club Admin" — who runs the club this pod belongs to, how to reach
 * them, a one-press request for their help, and a support ticket that carries
 * the pod through. Tamagui twin of mWeb's PodClubAdminDialog (rule 27). */
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
        {pod ? (
          <AskClubAdminHelp
            podId={pod.id}
            side={PodHelpSide.Host}
            label={t('mweb.podClubAdmin.askHelp')}
          />
        ) : null}
      </YStack>
    );
  }

  return (
    <Modal visible={!!pod} transparent animationType="fade" onRequestClose={onClose}>
      <ModalThemeScope>
        <YStack flex={1} justifyContent="flex-end" testID="pod-club-admin-sheet">
          <YStack
            pressStyle={PRESS_STYLE.surface}
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
            borderTopLeftRadius={28}
            borderTopRightRadius={28}
            padding={18}
            maxHeight="85%"
          >
            <SafeAreaView edges={['bottom']} style={SHEET_SAFE_AREA}>
              <Text fontSize={17} fontWeight="600" color="$color">
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
                <YStack flex={1}>
                  <DuncitButton
                    label={t('mweb.podClubAdmin.close')}
                    variant="ghost"
                    tone="neutral"
                    fullWidth
                    onPress={onClose}
                  />
                </YStack>
                <YStack flex={2}>
                  <DuncitButton
                    testID="pod-club-admin-support"
                    label={t('mweb.podClubAdmin.support')}
                    fullWidth
                    icon={<MaterialIcons name="support-agent" size={18} color={onPrimary} />}
                    onPress={onSupport}
                  />
                </YStack>
              </XStack>
            </SafeAreaView>
          </YStack>
        </YStack>
      </ModalThemeScope>
    </Modal>
  );
}
