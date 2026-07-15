import { type ComponentProps } from 'react';
import { AppImage } from '@/components/AppImage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { AppBackground } from '@/components/AppBackground';
import { KeyboardScreen } from '@/components/KeyboardScreen';
import { useGoBack } from '@/hooks/useGoBack';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useBranding } from '@/hooks/useBranding';
import type { SurveyKind } from '@/graphql/onboarding-survey';
import { useOnboardingFlow } from './useOnboardingFlow';
import { CategoryPhase } from './CategoryPhase';
import { CategorySummaryBanner } from './CategorySummaryBanner';
import { SurveyPhase } from './SurveyPhase';
import { MeetingPhase } from './MeetingPhase';

type IconName = ComponentProps<typeof MaterialIcons>['name'];

interface Props {
  kind: SurveyKind;
  title: string;
  subtitle: string;
  icon: IconName;
}

/** Category → survey → meeting gate before host/venue registration. */
export function OnboardingSurvey({ kind, title, subtitle, icon }: Readonly<Props>) {
  const goBack = useGoBack();
  const { color: ink } = useThemeColors();
  const { data: brandingData } = useBranding();
  const logoUrl = brandingData?.branding?.logo_url;
  const flow = useOnboardingFlow(kind);

  if (flow.phase === 'done') {
    if (!flow.bookedSlot) {
      return <PlaceholderScreen title={title} subtitle={subtitle} icon={icon} />;
    }
    const slotLabel = new Date(flow.bookedSlot).toLocaleString(undefined, {
      dateStyle: 'full',
      timeStyle: 'short',
    });
    return (
      <YStack flex={1} testID="onboarding-thanks">
        <AppBackground />
        <SafeAreaView edges={['top']} style={{ flex: 1 }}>
          <YStack flex={1} alignItems="center" justifyContent="center" gap={14} padding={24}>
            <MaterialIcons name="event-available" size={56} color={ink} />
            <Text textAlign="center" fontSize={22} fontWeight="900" color={ink}>
              You{'’'}re booked!
            </Text>
            <Text textAlign="center" fontSize={14.5} color={ink} opacity={0.85}>
              Thank you for your submission! Your onboarding meeting is booked for {slotLabel}. Our
              onboarding team will meet you at your selected slot — please join 5 minutes early.
            </Text>
            <XStack
              testID="thanks-done"
              role="button"
              aria-label="Back to Home"
              onPress={goBack}
              paddingHorizontal={22}
              paddingVertical={12}
              borderRadius={999}
              backgroundColor="$primary"
              pressStyle={{ opacity: 0.85 }}
            >
              <Text fontSize={14.5} fontWeight="900" color="$onPrimary">
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

  return (
    <YStack flex={1} testID="onboarding-survey">
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
        <XStack alignItems="center" gap={8} paddingHorizontal={12} paddingVertical={8}>
          <XStack
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

        {(flow.phase === 'survey' || flow.phase === 'meeting') && (
          <CategorySummaryBanner labels={flow.labels} onChange={flow.goToCategory} />
        )}
        <KeyboardScreen>
          {flow.phase === 'category' && (
            <CategoryPhase
              busy={flow.busy}
              error={flow.error}
              onContinue={flow.chooseCategory}
              initialScope={flow.scope}
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
              notes={flow.notes}
              setNotes={flow.setNotes}
              busy={flow.busy}
              error={flow.error}
              onSubmit={flow.submitMeeting}
            />
          )}
        </KeyboardScreen>
      </SafeAreaView>
    </YStack>
  );
}
