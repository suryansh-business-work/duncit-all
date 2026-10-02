import { Modal, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Spinner, Text, XStack, YStack } from 'tamagui';

import { AppImage } from '@/components/AppImage';
import { ModalSafeArea } from '@/components/ModalSafeArea';
import { ModalThemeScope } from '@/components/ModalThemeScope';
import { SHEET_SAFE_AREA } from '@/components/DuncitDialog/sheet-body';
import { ClubSocialLinks } from '@/components/details/club/ClubSocialLinks';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';
import { ClubAdminContactRow } from './ClubAdminContactRow';
import type { CreatePodClub } from './create-pod.types';
import { useCreatePodClubDetails, type CreatePodClubDetails } from './useCreatePodClubDetails';

interface Props {
  club: CreatePodClub;
  open: boolean;
  onClose: () => void;
}

/** Rating, WhatsApp chats and admin contacts — read once the sheet opens. */
function ClubExtras({ details }: Readonly<{ details: CreatePodClubDetails }>) {
  const { t } = useTranslation();
  const { warning } = useThemeColors();
  return (
    <YStack gap={14}>
      <XStack testID="club-preview-rating" alignItems="center" gap={4}>
        <MaterialIcons name="star" size={16} color={warning} />
        {details.ratings_count > 0 ? (
          <Text fontSize={14} color="$color">
            <Text fontWeight="700">{details.rating.toFixed(1)}</Text>
            {' · '}
            {t('mweb.createPod.clubRatingsCount', { count: details.ratings_count })}
          </Text>
        ) : (
          <Text fontSize={14} color="$muted">
            {t('mweb.createPod.clubNoRatings')}
          </Text>
        )}
      </XStack>
      <ClubSocialLinks club={details} />
      <YStack gap={10}>
        <Text fontSize={14} fontWeight="600" color="$color" role="heading">
          {t('mweb.createPod.clubAdmins')}
        </Text>
        {details.club_admins.length === 0 ? (
          <Text fontSize={13} color="$muted">
            {t('mweb.podDetails.clubAdminsEmpty')}
          </Text>
        ) : (
          details.club_admins.map((admin) => <ClubAdminContactRow key={admin.id} admin={admin} />)
        )}
      </YStack>
    </YStack>
  );
}

/** Brief "View club details" sheet — gallery strip, a clamped description, the
 * club's rating, its WhatsApp community + group chat and every admin's contact
 * details. mWeb twin: create-pod ClubDetailsDialog (rule 27). */
export function ClubDetailsSheet({ club, open, onClose }: Readonly<Props>) {
  const { color: ink } = useThemeColors();
  const { t } = useTranslation();
  const { details, isLoading, hasError } = useCreatePodClubDetails(open ? club.id : null);
  const images = (club.club_feature_images_and_videos ?? []).filter(
    (item) => (item.type ?? 'IMAGE') === 'IMAGE',
  );

  let extras = null;
  if (isLoading && !details) extras = <Spinner testID="club-preview-loading" color="$accent" />;
  else if (hasError) {
    extras = (
      <Text fontSize={13} color="$danger">
        {t('mweb.createPod.clubDetailsLoadFailed')}
      </Text>
    );
  } else if (details) extras = <ClubExtras details={details} />;

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <ModalThemeScope>
        <YStack
          flex={1}
          alignItems="center"
          justifyContent="center"
          testID="club-preview-dialog"
          onAccessibilityEscape={onClose}
        >
          <YStack
            pressStyle={PRESS_STYLE.surface}
            importantForAccessibility="no"
            role="button"
            aria-label={t('mweb.auth.close')}
            onPress={onClose}
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            backgroundColor="rgba(0,0,0,0.5)"
          />
          <YStack
            width="90%"
            maxWidth={440}
            maxHeight="80%"
            backgroundColor="$surface"
            borderRadius={28}
            padding={20}
          >
            <ModalSafeArea edges={[]} style={SHEET_SAFE_AREA}>
              <XStack alignItems="center" justifyContent="space-between" gap={12} paddingBottom={12}>
                <Text
                  testID="club-preview-title"
                  role="heading"
                  fontSize={17}
                  fontWeight="600"
                  color="$color"
                  numberOfLines={1}
                  flex={1}
                >
                  {club.club_name}
                </Text>
                <XStack
                  testID="club-preview-close"
                  tabIndex={0}
                  role="button"
                  aria-label={t('mweb.createPod.closeClubDetails')}
                  onPress={onClose}
                  width={40}
                  height={40}
                  alignItems="center"
                  justifyContent="center"
                  borderRadius={20}
                  backgroundColor="$soft"
                  pressStyle={PRESS_STYLE.control}
                >
                  <MaterialIcons name="close" size={20} color={ink} />
                </XStack>
              </XStack>
              <ScrollView showsVerticalScrollIndicator={false}>
                <YStack gap={14}>
                  {images.length > 0 ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <XStack gap={8}>
                        {images.map((item) => (
                          <AppImage
                            key={item.url}
                            source={{ uri: item.url }}
                            style={{ width: 88, height: 66, borderRadius: 16 }}
                          />
                        ))}
                      </XStack>
                    </ScrollView>
                  ) : null}
                  <Text fontSize={14} color="$muted" lineHeight={20} numberOfLines={3}>
                    {club.club_description?.trim() || t('mweb.createPod.noDescription')}
                  </Text>
                  {extras}
                </YStack>
              </ScrollView>
            </ModalSafeArea>
          </YStack>
        </YStack>
      </ModalThemeScope>
    </Modal>
  );
}
