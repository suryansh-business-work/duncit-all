import { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, XStack, YStack } from 'tamagui';
import {
  buildPodFeedbackInput,
  canSubmitPodFeedback,
  orderedAspects,
  type PodFeedbackReminderChoice,
  type PodFeedbackScores,
} from '@duncit/utils';
import { logs } from '@duncit/logs';

import { PodFeedbackFields } from '@/components/support/PodFeedbackFields';
import { PodFeedbackReminder } from '@/components/support/PodFeedbackReminder';
import { useBouncer, type PendingPodFeedback } from '@/hooks/useBouncer';
import { useKeyboardInset } from '@/hooks/useKeyboardInset';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

/** Scrim padding — the bottom edge also has to clear the on-screen keyboard. */
const SCRIM_PADDING = 24;

/**
 * After a guest attends a pod and reopens the app, ask how it went — part by
 * part: the evening itself, the host, the room, the club admin behind it,
 * safety, food.
 *
 * The twin of mWeb's prompt (rule 27): same questions in the same order, from
 * @duncit/utils, and the same words from the shared translation bundle. Which
 * parts a pod HAS is the server's answer, not a rule copied into two apps.
 */
export function PodFeedbackPrompt() {
  const { t } = useTranslation();
  const { getPendingPodFeedback, submitPodFeedback, remindPodFeedback } = useBouncer();
  const [pod, setPod] = useState<PendingPodFeedback>(null);
  const [dismissed, setDismissed] = useState(false);
  const [asking, setAsking] = useState(false);
  const [scores, setScores] = useState<PodFeedbackScores>({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  // The prompt is a floating scrim outside every screen scaffold, so nothing
  // above it lifts the comment box clear of the keyboard.
  const keyboardInset = useKeyboardInset();

  useEffect(() => {
    let on = true;
    getPendingPodFeedback()
      .then((p) => on && setPod(p))
      .catch(() => undefined);
    return () => {
      on = false;
    };
  }, [getPendingPodFeedback]);

  const aspects = useMemo(() => orderedAspects(pod?.feedback_aspects), [pod?.feedback_aspects]);
  const ready = canSubmitPodFeedback(scores);

  if (!pod || dismissed) return null;

  /**
   * Closing the prompt is an answer in its own right, so it is written down.
   * The sheet goes first: a guest who just said "stop asking" should not be
   * held in front of it by a slow request, and a failed write only means the
   * next launch asks once more.
   */
  const remind = (choice: PodFeedbackReminderChoice) => {
    setAsking(false);
    setDismissed(true);
    remindPodFeedback(pod.id, choice).catch((error) =>
      logs.mobileApp.error('PodFeedbackPrompt', 'remind', { error, choice }),
    );
  };

  const submit = async () => {
    setBusy(true);
    setFailed(false);
    try {
      await submitPodFeedback(buildPodFeedbackInput({ podId: pod.id, scores, message, aspects }));
      setDismissed(true);
    } catch {
      // Closing on a failure would throw the guest's answers away silently.
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <YStack
      testID="pod-feedback-prompt"
      position="absolute"
      top={0}
      left={0}
      right={0}
      bottom={0}
      zIndex={200}
      backgroundColor="rgba(0,0,0,0.55)"
      alignItems="center"
      justifyContent="center"
      padding={SCRIM_PADDING}
      paddingBottom={SCRIM_PADDING + keyboardInset}
    >
      {asking ? (
        <PodFeedbackReminder title={pod.title} onChoose={remind} />
      ) : (
        <YStack
          width="100%"
          maxWidth={360}
          maxHeight="90%"
          gap={12}
          padding={20}
          borderRadius={16}
          backgroundColor="$background"
        >
          <Text fontSize={16} fontWeight="700" color="$color">
            {t('mweb.podFeedback.title', { vars: { title: pod.title } })}
          </Text>
          <Text fontSize={12} color="$muted">
            {t('mweb.podFeedback.subtitle')}
          </Text>

          {/* Seven rows plus a keyboard on a small phone: the sheet scrolls
              rather than pushing its buttons off the screen. */}
          <ScrollView showsVerticalScrollIndicator={false}>
            <PodFeedbackFields
              aspects={aspects}
              scores={scores}
              onScore={(aspect, value) => setScores((prev) => ({ ...prev, [aspect]: value }))}
              message={message}
              onMessage={setMessage}
            />
          </ScrollView>
          {failed && (
            <Text testID="pod-feedback-error" fontSize={12} color="$red10">
              {t('mweb.podFeedback.failed')}
            </Text>
          )}

          <XStack gap={8} justifyContent="flex-end">
            <XStack
              pressStyle={PRESS_STYLE.control}
              testID="pod-feedback-skip"
              role="button"
              aria-label={t('mweb.podFeedback.close')}
              onPress={() => setAsking(true)}
              height={42}
              paddingHorizontal={18}
              alignItems="center"
              justifyContent="center"
              borderRadius={999}
              borderWidth={1}
              borderColor="$borderColor"
            >
              <Text fontSize={14} fontWeight="600" color="$color">
                {t('mweb.podFeedback.close')}
              </Text>
            </XStack>
            <XStack
              pressStyle={PRESS_STYLE.control}
              testID="pod-feedback-submit"
              role="button"
              aria-label={t('mweb.podFeedback.submit')}
              aria-disabled={!ready || busy}
              onPress={!ready || busy ? undefined : () => void submit()}
              height={42}
              paddingHorizontal={18}
              alignItems="center"
              justifyContent="center"
              borderRadius={999}
              backgroundColor="$primary"
              opacity={!ready || busy ? 0.5 : 1}
            >
              <Text fontSize={14} fontWeight="600" color="$onPrimary">
                {busy ? t('mweb.podFeedback.submitting') : t('mweb.podFeedback.submit')}
              </Text>
            </XStack>
          </XStack>
        </YStack>
      )}
    </YStack>
  );
}
