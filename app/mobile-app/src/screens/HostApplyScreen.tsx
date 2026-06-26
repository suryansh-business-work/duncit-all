import { Image } from 'react-native';
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

/** Host applies to host in a new category: category → survey → request submitted. */
export function HostApplyScreen() {
  const goBack = useGoBack();
  const { color: ink } = useThemeColors();
  const { data: brandingData } = useBranding();
  const logoUrl = brandingData?.branding?.logo_url;
  const flow = useHostRequestFlow();

  if (flow.phase === 'success') return <HostRequestSuccess />;

  const headerTitle = flow.phase === 'survey' ? flow.survey?.title || 'Apply Now' : 'Apply Now';

  return (
    <YStack flex={1} testID="host-apply-screen">
      <AppBackground />
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        {logoUrl ? (
          <XStack justifyContent="center" paddingTop={8}>
            <Image
              source={{ uri: logoUrl }}
              style={{ height: 28, width: 120, resizeMode: 'contain' }}
            />
          </XStack>
        ) : null}
        <XStack alignItems="center" gap={8} paddingHorizontal={12} paddingVertical={8}>
          <XStack
            testID="host-apply-back"
            role="button"
            aria-label="Go back"
            onPress={goBack}
            width={40}
            height={40}
            alignItems="center"
            justifyContent="center"
            borderRadius={20}
            pressStyle={{ opacity: 0.7 }}
          >
            <MaterialIcons name="arrow-back" size={22} color={ink} />
          </XStack>
          <Text fontSize={18} fontWeight="800" color={ink}>
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
