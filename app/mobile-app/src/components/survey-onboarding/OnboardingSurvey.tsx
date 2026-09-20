import { type ComponentProps } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { AppBackground } from '@/components/AppBackground';
import { KeyboardScreen } from '@/components/KeyboardScreen';
import { useGoBack } from '@/hooks/useGoBack';
import type { RootStackParamList } from '@/navigation/types';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { SurveyKind } from '@/graphql/onboarding-survey';
import { useOnboardingFlow } from './useOnboardingFlow';
import { SurveyHeader } from './SurveyHeader';
import { SocialHandlesSection } from './SocialHandlesSection';
import { IntroPhase } from './IntroPhase';
import { CategoryPhase } from './CategoryPhase';
import { CategorySummaryBanner } from './CategorySummaryBanner';
import { SurveyPhase } from './SurveyPhase';
import { MeetingPhase } from './MeetingPhase';
import { formatDateTime } from '@/utils/date-format';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

type IconName = ComponentProps<typeof MaterialIcons>['name'];

interface Props {
  kind: SurveyKind;
  title: string;
  subtitle: string;
  icon: IconName;
}

/** Category → survey → meeting gate before host/venue registration. */
export function OnboardingSurvey({ kind, title, subtitle, icon }: Readonly<Props>) {
  const { t } = useTranslation();
  const goBack = useGoBack();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { accent } = useThemeColors();
  const flow = useOnboardingFlow(kind);

  if (flow.phase === 'done') {
    if (!flow.bookedSlot) {
      return <PlaceholderScreen title={title} subtitle={subtitle} icon={icon} />;
    }
    const slotLabel = formatDateTime(flow.bookedSlot);
    return (
      <YStack flex={1} testID="onboarding-thanks">
        <AppBackground />
        <SafeAreaView edges={['top']} style={{ flex: 1 }}>
          <YStack flex={1} alignItems="center" justifyContent="center" gap={16} padding={24}>
            <YStack
              width={72}
              height={72}
              borderRadius={36}
              alignItems="center"
              justifyContent="center"
              backgroundColor="$soft"
            >
              <MaterialIcons name="event-available" size={36} color={accent} />
            </YStack>
            <Text role="heading" textAlign="center" fontSize={24} fontWeight="600" color="$color">
              You{'’'}re booked!
            </Text>
            <Text textAlign="center" fontSize={14} color="$muted">
              Thank you for your submission! Your onboarding meeting is booked for {slotLabel}. Our
              onboarding team will meet you at your selected slot — please join 5 minutes early.
            </Text>
            <XStack
              testID="thanks-done"
              role="button"
              aria-label={t('mweb.surveyOnboarding.backToHome')}
              tabIndex={0}
              onPress={goBack}
              alignSelf="stretch"
              height={52}
              alignItems="center"
              justifyContent="center"
              borderRadius={999}
              backgroundColor="$primary"
              pressStyle={PRESS_STYLE.solid}
            >
              <Text fontSize={16} fontWeight="600" color="$onPrimary">
                Done
              </Text>
            </XStack>
          </YStack>
        </SafeAreaView>
      </YStack>
    );
  }

  const nonSurveyTitle = flow.phase === 'meeting' ? 'Book your onboarding meeting' : title;
  const headerTitle = flow.phase === 'survey' ? flow.survey?.title || title : nonSurveyTitle;
  // Every phase ends on Duncit's social media handles (Onboarding > Onboarding Intro).
  const footer = <SocialHandlesSection handles={flow.socialHandles} />;

  return (
    <YStack flex={1} testID="onboarding-survey">
      <AppBackground />
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <SurveyHeader
          title={headerTitle}
          onBack={() => {
            // Step back a phase (preserving answers) instead of leaving the
            // whole flow; only exit when already at the first phase.
            if (!flow.stepBack()) goBack();
          }}
        />

        {(flow.phase === 'survey' || flow.phase === 'meeting') && (
          <CategorySummaryBanner labels={flow.labels} onChange={flow.goToCategory} />
        )}
        <KeyboardScreen flush>
          {flow.phase === 'intro' && (
            <IntroPhase
              html={flow.introHtml}
              loading={flow.introLoading}
              onContinue={flow.startCategory}
              footer={footer}
            />
          )}
          {flow.phase === 'category' && (
            <CategoryPhase
              busy={flow.busy}
              error={flow.error}
              onContinue={flow.chooseCategory}
              initialScope={flow.scope}
              footer={footer}
            />
          )}
          {flow.phase === 'survey' && flow.survey && (
            <SurveyPhase
              survey={flow.survey}
              answer={flow.answer}
              busy={flow.busy}
              error={flow.error}
              onSubmit={flow.submitSurvey}
              footer={footer}
            />
          )}
          {flow.phase === 'meeting' && (
            <MeetingPhase
              survey={flow.survey}
              answer={flow.answer}
              slots={flow.slots}
              slotsLoading={flow.slotsLoading}
              selectedSlot={flow.selectedSlot}
              setSelectedSlot={flow.setSelectedSlot}
              name={flow.name}
              setName={flow.setName}
              lockName={flow.lockName}
              ext={flow.ext}
              phone={flow.phone}
              hasProfilePhone={flow.hasProfilePhone}
              onGoToProfile={() => navigation.navigate('Account')}
              notes={flow.notes}
              setNotes={flow.setNotes}
              busy={flow.busy}
              error={flow.error}
              onSubmit={flow.submitMeeting}
              footer={footer}
            />
          )}
        </KeyboardScreen>
      </SafeAreaView>
    </YStack>
  );
}
