import { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, TextArea, XStack, YStack } from 'tamagui';
import {
  POD_FEEDBACK_ASPECT_KEY,
  buildPodFeedbackInput,
  canSubmitPodFeedback,
  orderedAspects,
  type PodFeedbackScores,
} from '@duncit/utils';

import { Field } from '@/components/Field';
import { AspectRatingRow } from '@/components/support/AspectRatingRow';
import { useBouncer, type PendingPodFeedback } from '@/hooks/useBouncer';
import { useKeyboardInset } from '@/hooks/useKeyboardInset';
import { useTranslation } from '@/hooks/useTranslation';

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
  const { getPendingPodFeedback, submitPodFeedback } = useBouncer();
  const [pod, setPod] = useState<PendingPodFeedback>(null);
  const [dismissed, setDismissed] = useState(false);
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
          <YStack gap={2}>
            {aspects.map((aspect) => {
              const label = t(POD_FEEDBACK_ASPECT_KEY[aspect]);
              return (
                <AspectRatingRow
                  key={aspect}
                  aspect={aspect}
                  label={label}
                  value={scores[aspect] ?? 0}
                  onChange={(value) => setScores((prev) => ({ ...prev, [aspect]: value }))}
                  starLabel={(stars) =>
                    t('mweb.podFeedback.rateAspect', { vars: { aspect: label, stars } })
                  }
                />
              );
            })}
          </YStack>
        </ScrollView>

        <Field label={t('mweb.podFeedback.comments')}>
          <TextArea
            testID="pod-feedback-comment"
            aria-label={t('mweb.podFeedback.comments')}
            value={message}
            onChangeText={setMessage}
            placeholder={t('mweb.podFeedback.commentsPlaceholder')}
            placeholderTextColor="$muted"
            maxLength={1000}
            backgroundColor="$surface"
            borderColor="$borderColor"
          />
        </Field>
        {failed && (
          <Text testID="pod-feedback-error" fontSize={12} color="$red10">
            {t('mweb.podFeedback.failed')}
          </Text>
        )}

        <XStack gap={8} justifyContent="flex-end">
          <XStack
            testID="pod-feedback-skip"
            role="button"
            aria-label={t('mweb.podFeedback.skip')}
            onPress={() => setDismissed(true)}
            height={42}
            paddingHorizontal={18}
            alignItems="center"
            justifyContent="center"
            borderRadius={999}
            borderWidth={1}
            borderColor="$borderColor"
          >
            <Text fontSize={14} fontWeight="600" color="$color">
              {t('mweb.podFeedback.skip')}
            </Text>
          </XStack>
          <XStack
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
    </YStack>
  );
}
