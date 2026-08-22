import { useState } from 'react';
import { Text, TextArea, XStack, YStack } from 'tamagui';

import { Field } from '@/components/Field';
import { Backdrop, ModalButton } from './ModalBase';
import { FEEDBACK_SCALE, feedbackOption } from './feedback-scale';
import { useTranslation } from '@/hooks/useTranslation';

const THANK_YOU =
  'Thank you for your feedback. Your feedback helps us improve the Duncit support experience.';

interface ScaleProps {
  rating: number;
  onPick: (n: number) => void;
}

/** The tappable 1-5 emoji row (B8). */
function EmojiScale({ rating, onPick }: Readonly<ScaleProps>) {
  return (
    <XStack gap={6} justifyContent="center">
      {FEEDBACK_SCALE.map((o) => (
        <YStack
          key={o.value}
          testID={`feedback-emoji-${o.value}`}
          role="button"
          aria-label={`${o.value} ${o.label}`}
          onPress={() => onPick(o.value)}
          alignItems="center"
          gap={2}
          padding={4}
          borderRadius={10}
          borderWidth={1}
          borderColor={o.value === rating ? '$primary' : 'transparent'}
          pressStyle={{ opacity: 0.7 }}
        >
          <Text fontSize={26}>{o.emoji}</Text>
        </YStack>
      ))}
    </XStack>
  );
}

interface Props {
  open: boolean;
  busy?: boolean;
  /** Existing rating — when set the form is read-only (one-time, B8). */
  rating?: number | null;
  feedbackComment?: string | null;
  /** True once the server has accepted this submission (shows the thank-you). */
  done?: boolean;
  error?: string;
  onSubmit: (rating: number, comment: string) => void;
  onClose: () => void;
}

/** Collects (or shows) a one-time 1-5 emoji satisfaction rating + comment (B8). */
export function SupportFeedbackModal({
  open,
  busy,
  rating,
  feedbackComment,
  done,
  error,
  onSubmit,
  onClose,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const [picked, setPicked] = useState(0);
  const [comment, setComment] = useState('');
  if (!open) return null;

  const existing = feedbackOption(rating);
  if (existing && !done) {
    return (
      <Backdrop
        testID="support-feedback-modal"
        footer={
          <XStack justifyContent="flex-end">
            <ModalButton
              testID="feedback-close"
              label={t('mweb.common.close')}
              primary
              onPress={onClose}
            />
          </XStack>
        }
      >
        <Text fontSize={16} fontWeight="700" color="$color">
          Your feedback
        </Text>
        <Text testID="feedback-readonly" fontSize={15} color="$color">
          Your rating: {existing.emoji} {existing.label}
        </Text>
        {feedbackComment ? (
          <Text testID="feedback-readonly-comment" fontSize={13} color="$muted">
            {feedbackComment}
          </Text>
        ) : null}
      </Backdrop>
    );
  }

  if (done) {
    return (
      <Backdrop
        testID="support-feedback-modal"
        footer={
          <XStack justifyContent="flex-end">
            <ModalButton
              testID="feedback-done"
              label={t('mweb.common.done')}
              primary
              onPress={onClose}
            />
          </XStack>
        }
      >
        <Text testID="feedback-thanks" fontSize={14} color="$color">
          {THANK_YOU}
        </Text>
      </Backdrop>
    );
  }

  return (
    <Backdrop
      testID="support-feedback-modal"
      footer={
        <XStack gap={8} justifyContent="flex-end">
          <ModalButton
            testID="feedback-skip"
            label={t('mweb.supportChat.skip')}
            onPress={onClose}
          />
          <ModalButton
            testID="feedback-submit"
            label={busy ? 'Sending…' : 'Submit'}
            primary
            disabled={!picked || busy}
            onPress={() => onSubmit(picked, comment)}
          />
        </XStack>
      }
    >
      <Text fontSize={16} fontWeight="700" color="$color">
        How did we do?
      </Text>
      <EmojiScale rating={picked} onPick={setPicked} />
      <Field label={t('mweb.common.comments')}>
        <TextArea
          testID="feedback-comment"
          aria-label={t('mweb.common.comments')}
          value={comment}
          onChangeText={setComment}
          placeholder={t('mweb.supportChat.anythingToAddOptional')}
          placeholderTextColor="$muted"
          maxLength={1000}
          backgroundColor="$surface"
          borderColor="$borderColor"
        />
      </Field>
      {error ? (
        <Text testID="feedback-error" fontSize={12} color="$danger">
          {error}
        </Text>
      ) : null}
    </Backdrop>
  );
}
