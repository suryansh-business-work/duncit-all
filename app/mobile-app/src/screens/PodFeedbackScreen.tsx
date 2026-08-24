import { useEffect, useMemo, useState } from 'react';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { ScrollView, Spinner, Text, YStack } from 'tamagui';
import {
  buildPodFeedbackInput,
  canSubmitPodFeedback,
  orderedAspects,
  scoresFromMyFeedback,
  type PodFeedbackAspect,
  type PodFeedbackScores,
} from '@duncit/utils';

import { PodFeedbackCard } from '@/components/support/PodFeedbackCard';
import { StackScreen } from '@/components/StackScreen';
import { useBouncer, type PodFeedbackForm } from '@/hooks/useBouncer';
import { useGoBack } from '@/hooks/useGoBack';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';

/**
 * The pod rating form as its own screen, behind the link a host shares with
 * the people who came (mWeb's /pod/:podId/feedback).
 *
 * A guest who has already rated the pod opens their own answers rather than an
 * empty form — following the link twice must not cost them what they said the
 * first time, and submitting again edits that one rating.
 */
export function PodFeedbackScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'PodFeedback'>>();
  const podId = route.params?.podId ?? '';
  const goBack = useGoBack();
  const { t } = useTranslation();
  const { getPodFeedbackForm, submitPodFeedback } = useBouncer();

  const [form, setForm] = useState<PodFeedbackForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [edited, setEdited] = useState<PodFeedbackScores | null>(null);
  const [editedMessage, setEditedMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let on = true;
    getPodFeedbackForm(podId)
      .then((data) => on && setForm(data))
      .catch(() => undefined)
      .finally(() => on && setLoading(false));
    return () => {
      on = false;
    };
  }, [getPodFeedbackForm, podId]);

  const mine = form?.mine ?? null;
  const aspects = useMemo(
    () => orderedAspects(form?.pod.feedback_aspects),
    [form?.pod.feedback_aspects],
  );
  // Untouched, the form IS the stored rating; the first edit takes over.
  const scores = edited ?? scoresFromMyFeedback(mine);
  const message = editedMessage ?? mine?.message ?? '';

  const score = (aspect: PodFeedbackAspect, value: number) => {
    setSaved(false);
    setEdited({ ...scores, [aspect]: value });
  };

  const submit = async () => {
    if (!form || !canSubmitPodFeedback(scores)) return;
    setSaving(true);
    setFailed(false);
    try {
      await submitPodFeedback(
        buildPodFeedbackInput({ podId: form.pod.id, scores, message, aspects }),
      );
      setSaved(true);
    } catch {
      // Leaving on a failure would throw the guest's answers away silently.
      setFailed(true);
    } finally {
      setSaving(false);
    }
  };

  let body;
  if (loading) {
    body = <Spinner testID="pod-feedback-loading" color="$primary" />;
  } else if (form?.can_rate) {
    body = (
      <PodFeedbackCard
        podTitle={form.pod.title}
        // Saved this visit counts too: the answers are stored, so the screen
        // must not offer to "submit" them a second time as if they were new.
        rated={!!mine || saved}
        aspects={aspects}
        scores={scores}
        onScore={score}
        message={message}
        onMessage={(value) => {
          setSaved(false);
          setEditedMessage(value);
        }}
        saving={saving}
        failed={failed}
        saved={saved}
        onSubmit={submit}
        onLeave={goBack}
      />
    );
  } else if (form) {
    // The link travels further than the pod did: whoever opens it without
    // having been marked present is told why, rather than shown stars the
    // submit would refuse.
    body = (
      <Text testID="pod-feedback-no-access" color="$warning" fontSize={13}>
        {t('mweb.podFeedback.noAccess')}
      </Text>
    );
  } else {
    body = (
      <Text testID="pod-feedback-load-error" color="$danger" fontSize={13}>
        {t('mweb.podFeedback.loadFailed')}
      </Text>
    );
  }

  return (
    <StackScreen title={t('mweb.podFeedback.pageTitle')} testID="pod-feedback-screen">
      <ScrollView flex={1} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <YStack gap={12}>{body}</YStack>
      </ScrollView>
    </StackScreen>
  );
}
