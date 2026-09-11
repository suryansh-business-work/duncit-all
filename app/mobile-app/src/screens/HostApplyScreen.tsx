import { AppImage } from '@/components/AppImage';

import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { AppBackground } from '@/components/AppBackground';
import { KeyboardScreen } from '@/components/KeyboardScreen';
import { CategoryPhase } from '@/components/survey-onboarding/CategoryPhase';
import { SurveyPhase } from '@/components/survey-onboarding/SurveyPhase';
import { HostRequestSuccess } from '@/components/survey-onboarding/HostRequestSuccess';
import { useHostRequestFlow } from '@/components/survey-onboarding/useHostRequestFlow';
import { useBranding } from '@/hooks/useBranding';
import { useGoBack } from '@/hooks/useGoBack';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

/** Host applies to host in a new category: category → survey → request submitted. */
export function HostApplyScreen() {
  const { t } = useTranslation();
  const goBack = useGoBack();
  const { color: ink } = useThemeColors();
  const { data: brandingData } = useBranding();
  const logoUrl = brandingData?.branding?.logo_url;
  const flow = useHostRequestFlow();

  if (flow.phase === 'success') return <HostRequestSuccess />;

  // The same heading mWeb's host-apply page carries: the survey's own title
  // while answering it, otherwise "Host a new category".
  const categoryTitle = t('mweb.hostApply.hostANewCategory');
  const headerTitle = flow.phase === 'survey' ? flow.survey?.title || categoryTitle : categoryTitle;

  return (
    <YStack flex={1} testID="host-apply-screen">
      <AppBackground />
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        {logoUrl ? (
          <XStack justifyContent="center" paddingTop={8}>
            <AppImage
              source={{ uri: logoUrl }}
              style={{ height: 28, width: 120, resizeMode: 'contain' }}
            />
          </XStack>
        ) : null}
        <XStack alignItems="center" gap={12} paddingHorizontal={16} paddingVertical={8}>
          <XStack
            testID="host-apply-back"
            role="button"
            aria-label={t('mweb.common.goBack')}
            onPress={goBack}
            width={40}
            height={40}
            alignItems="center"
            justifyContent="center"
            borderRadius={20}
            borderWidth={1}
            borderColor="$cardBorder"
            backgroundColor="$surface"
            pressStyle={PRESS_STYLE.control}
          >
            <MaterialIcons name="arrow-back" size={20} color={ink} />
          </XStack>
          <Text flex={1} fontSize={17} fontWeight="600" color="$color" numberOfLines={1}>
            {headerTitle}
          </Text>
        </XStack>

        <KeyboardScreen>
          {flow.phase === 'category' && (
            <CategoryPhase
              busy={flow.busy}
              error={flow.error}
              onContinue={flow.chooseCategory}
              disabledIds={flow.takenIds}
            />
          )}
          {flow.phase === 'survey' && flow.survey && (
            <SurveyPhase
              survey={flow.survey}
              answer={flow.answer}
              busy={flow.busy}
              error={flow.error}
              onSubmit={flow.submitSurvey}
            />
          )}
        </KeyboardScreen>
      </SafeAreaView>
    </YStack>
  );
}
