import { type ComponentProps } from 'react';
import { Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { Spinner, Text, XStack, YStack } from 'tamagui';

import { AppBackground } from '@/components/AppBackground';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useBranding } from '@/hooks/useBranding';
import type { SurveyKind } from '@/graphql/onboarding-survey';
import { useOnboardingFlow } from './useOnboardingFlow';
import { CategoryPhase } from './CategoryPhase';
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
  const navigation = useNavigation();
  const { color: ink } = useThemeColors();
  const { data: brandingData } = useBranding();
  const logoUrl = brandingData?.branding?.logo_url;
  const flow = useOnboardingFlow(kind);

  if (flow.phase === 'loading') {
    return (
      <YStack flex={1}>
        <AppBackground />
        <YStack flex={1} alignItems="center" justifyContent="center">
          <Spinner />
        </YStack>
      </YStack>
    );
  }
  if (flow.phase === 'done') {
    return <PlaceholderScreen title={title} subtitle={subtitle} icon={icon} />;
  }

  const headerTitle =
    flow.phase === 'survey'
      ? flow.survey?.title || title
      : flow.phase === 'meeting'
        ? 'Schedule a meeting'
        : title;

  return (
    <YStack flex={1} testID="onboarding-survey">
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
            role="button"
            aria-label="Go back"
            onPress={() => navigation.goBack()}
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

        {flow.phase === 'category' && (
          <CategoryPhase busy={flow.busy} error={flow.error} onContinue={flow.chooseCategory} />
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
            when={flow.when}
            setWhen={flow.setWhen}
            notes={flow.notes}
            setNotes={flow.setNotes}
            busy={flow.busy}
            error={flow.error}
            onSubmit={flow.submitMeeting}
          />
        )}
      </SafeAreaView>
    </YStack>
  );
}
