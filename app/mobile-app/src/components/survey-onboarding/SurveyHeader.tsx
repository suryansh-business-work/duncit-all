import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { AppImage } from '@/components/AppImage';
import { useBranding } from '@/hooks/useBranding';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  title: string;
  onBack: () => void;
}

/** The onboarding gate's top: the brand logo, then Back beside the phase title. */
export function SurveyHeader({ title, onBack }: Readonly<Props>) {
  const { t } = useTranslation();
  const { color: ink } = useThemeColors();
  const { data: brandingData } = useBranding();
  const logoUrl = brandingData?.branding?.logo_url;

  return (
    <>
      {logoUrl ? (
        <XStack justifyContent="center" paddingTop={8}>
          <AppImage
            source={{ uri: logoUrl }}
            style={{ height: 28, width: 120 }}
            resizeMode="contain"
          />
        </XStack>
      ) : null}
      <XStack alignItems="center" gap={12} paddingHorizontal={16} paddingVertical={8}>
        <XStack
          testID="onboarding-back"
          role="button"
          aria-label={t('mweb.common.goBack')}
          tabIndex={0}
          hitSlop={2}
          onPress={onBack}
          width={40}
          height={40}
          alignItems="center"
          justifyContent="center"
          borderRadius={20}
          borderWidth={1}
          borderColor="$borderColor"
          backgroundColor="$surface"
          pressStyle={PRESS_STYLE.control}
        >
          <MaterialIcons name="arrow-back" size={22} color={ink} />
        </XStack>
        <Text role="heading" flexShrink={1} fontSize={17} fontWeight="600" color="$color">
          {title}
        </Text>
      </XStack>
    </>
  );
}
