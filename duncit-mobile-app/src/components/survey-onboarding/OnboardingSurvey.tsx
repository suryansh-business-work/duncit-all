import { useEffect, useState, type ComponentProps } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { Button, Input, Spinner, Text, TextArea, XStack, YStack } from 'tamagui';

import { AppBackground } from '@/components/AppBackground';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { useThemeColors } from '@/hooks/useThemeColors';
import { graphqlRequest } from '@/services/graphql.client';
import { toErrorMessage } from '@/utils/errors';
import {
  ActiveSurveyDocument,
  MySurveyResponseDocument,
  MyMeetingDocument,
  RequestMeetingDocument,
  SubmitSurveyResponseDocument,
  type ActiveSurveyResult,
  type MyMeetingResult,
  type MyResponseResult,
  type SurveyAnswerInput,
  type SurveyKind,
  type SurveyQuestion,
} from '@/graphql/onboarding-survey';

type IconName = ComponentProps<typeof MaterialIcons>['name'];

interface Props {
  kind: SurveyKind;
  title: string;
  subtitle: string;
  icon: IconName;
}

type Answer = { value: string; values: string[] };
type Phase = 'loading' | 'survey' | 'meeting' | 'done';

/** Survey + meeting gate before host/venue registration; forwards to the placeholder once done. */
export function OnboardingSurvey({ kind, title, subtitle, icon }: Props) {
  const navigation = useNavigation();
  const { color: ink, primary } = useThemeColors();
  const [phase, setPhase] = useState<Phase>('loading');
  const [survey, setSurvey] = useState<ActiveSurveyResult['activeSurvey']>(null);
  const [meetingDone, setMeetingDone] = useState(false);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [when, setWhen] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [mine, active, meet] = await Promise.all([
          graphqlRequest<MyResponseResult, { kind: SurveyKind }>(
            MySurveyResponseDocument,
            { kind },
            { auth: true },
          ),
          graphqlRequest<ActiveSurveyResult, { kind: SurveyKind }>(
            ActiveSurveyDocument,
            { kind },
            { auth: true },
          ),
          graphqlRequest<MyMeetingResult, { kind: SurveyKind }>(
            MyMeetingDocument,
            { kind },
            { auth: true },
          ),
        ]);
        if (!alive) return;
        const surveyDone = !!mine.mySurveyResponse || !active.activeSurvey;
        setSurvey(active.activeSurvey);
        setMeetingDone(!!meet.myMeeting);
        setPhase(!surveyDone ? 'survey' : !meet.myMeeting ? 'meeting' : 'done');
      } catch {
        if (alive) setPhase('done'); // never block on a survey error
      }
    })();
    return () => {
      alive = false;
    };
  }, [kind]);

  const get = (qid: string): Answer => answers[qid] ?? { value: '', values: [] };
  const set = (qid: string, patch: Partial<Answer>) =>
    setAnswers((a) => ({ ...a, [qid]: { ...get(qid), ...patch } }));
  const toggle = (q: SurveyQuestion, opt: string) => {
    const cur = get(q.qid).values;
    set(q.qid, { values: cur.includes(opt) ? cur.filter((v) => v !== opt) : [...cur, opt] });
  };

  const submitSurvey = async () => {
    const inputs = (survey?.questions ?? []).filter((q) => q.type !== 'SECTION');
    for (const q of inputs) {
      if (!q.required) continue;
      const a = get(q.qid);
      const filled = q.type === 'MCQ' && q.multi ? a.values.length > 0 : a.value.trim() !== '';
      if (!filled) {
        setError(`Please answer: ${q.label}`);
        return;
      }
    }
    setError(null);
    setBusy(true);
    try {
      const payload: SurveyAnswerInput[] = inputs.map((q) =>
        q.type === 'MCQ' && q.multi
          ? { qid: q.qid, values: get(q.qid).values }
          : { qid: q.qid, value: get(q.qid).value },
      );
      await graphqlRequest(
        SubmitSurveyResponseDocument,
        { kind, answers: payload },
        { auth: true },
      );
      setPhase(meetingDone ? 'done' : 'meeting');
    } catch (e) {
      setError(toErrorMessage(e, 'Could not submit the survey'));
    } finally {
      setBusy(false);
    }
  };

  const submitMeeting = async () => {
    const date = new Date(when);
    if (!when || Number.isNaN(date.getTime())) {
      setError('Enter a date & time like 2026-07-01 15:30');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await graphqlRequest(
        RequestMeetingDocument,
        { kind, input: { requested_at: date.toISOString(), notes: notes || null } },
        { auth: true },
      );
      setPhase('done');
    } catch (e) {
      setError(toErrorMessage(e, 'Could not request the meeting'));
    } finally {
      setBusy(false);
    }
  };

  if (phase === 'loading') {
    return (
      <YStack flex={1}>
        <AppBackground />
        <YStack flex={1} alignItems="center" justifyContent="center">
          <Spinner />
        </YStack>
      </YStack>
    );
  }
  if (phase === 'done') {
    return <PlaceholderScreen title={title} subtitle={subtitle} icon={icon} />;
  }

  return (
    <YStack flex={1} testID="onboarding-survey">
      <AppBackground />
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
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
            {phase === 'survey' ? survey?.title || title : 'Schedule a meeting'}
          </Text>
        </XStack>

        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
          {phase === 'survey' &&
            (survey?.questions ?? []).map((q) => {
              if (q.type === 'SECTION') {
                return (
                  <YStack key={q.qid} gap={2}>
                    <Text fontSize={16} fontWeight="800" color={ink}>
                      {q.label}
                    </Text>
                    {q.help ? (
                      <Text fontSize={13} opacity={0.7} color={ink}>
                        {q.help}
                      </Text>
                    ) : null}
                  </YStack>
                );
              }
              const a = get(q.qid);
              return (
                <YStack key={q.qid} gap={6}>
                  <Text fontSize={14} fontWeight="700" color={ink}>
                    {q.label}
                    {q.required ? ' *' : ''}
                  </Text>
                  {q.help ? (
                    <Text fontSize={12} opacity={0.7} color={ink}>
                      {q.help}
                    </Text>
                  ) : null}
                  {q.type === 'TEXT' && (
                    <Input
                      testID={`q-${q.qid}`}
                      value={a.value}
                      onChangeText={(t) => set(q.qid, { value: t })}
                    />
                  )}
                  {q.type === 'TEXTAREA' && (
                    <TextArea
                      testID={`q-${q.qid}`}
                      value={a.value}
                      onChangeText={(t) => set(q.qid, { value: t })}
                      minHeight={90}
                    />
                  )}
                  {q.type === 'MCQ' &&
                    q.options.map((opt) => {
                      const selected = q.multi ? a.values.includes(opt) : a.value === opt;
                      return (
                        <Button
                          key={opt}
                          testID={`opt-${q.qid}-${opt}`}
                          size="$3"
                          chromeless
                          justifyContent="flex-start"
                          onPress={() => (q.multi ? toggle(q, opt) : set(q.qid, { value: opt }))}
                        >
                          <Text
                            color={selected ? primary : ink}
                            fontWeight={selected ? '800' : '400'}
                          >
                            {selected ? '●' : '○'} {opt}
                          </Text>
                        </Button>
                      );
                    })}
                </YStack>
              );
            })}

          {phase === 'meeting' && (
            <YStack gap={10}>
              <Text fontSize={13} opacity={0.8} color={ink}>
                Pick a time that suits you — our team will confirm your onboarding meeting.
              </Text>
              <Text fontSize={14} fontWeight="700" color={ink}>
                Preferred date & time *
              </Text>
              <Input
                testID="meeting-when"
                value={when}
                onChangeText={setWhen}
                placeholder="2026-07-01 15:30"
              />
              <Text fontSize={14} fontWeight="700" color={ink}>
                Notes (optional)
              </Text>
              <TextArea
                testID="meeting-notes"
                value={notes}
                onChangeText={setNotes}
                minHeight={70}
              />
            </YStack>
          )}

          {error ? <Text color="$red10">{error}</Text> : null}
          <Button
            testID="primary-action"
            disabled={busy}
            onPress={phase === 'survey' ? submitSurvey : submitMeeting}
            backgroundColor={primary}
            color="white"
            fontWeight="800"
          >
            {busy ? 'Saving…' : phase === 'survey' ? 'Continue' : 'Request meeting'}
          </Button>
        </ScrollView>
      </SafeAreaView>
    </YStack>
  );
}
