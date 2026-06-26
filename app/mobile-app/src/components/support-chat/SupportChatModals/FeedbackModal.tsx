import { useState } from 'react';
import { Text, TextArea, XStack, YStack } from 'tamagui';

import { Backdrop, ModalButton } from './ModalBase';
import { FEEDBACK_SCALE, feedbackOption } from './feedback-scale';

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
  const [picked, setPicked] = useState(0);
  const [comment, setComment] = useState('');
  if (!open) return null;

  const existing = feedbackOption(rating);
  if (existing && !done) {
    return (
      <Backdrop testID="support-feedback-modal">
        <Text fontSize={16} fontWeight="900" color="$color">
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
        <XStack justifyContent="flex-end">
          <ModalButton testID="feedback-close" label="Close" primary onPress={onClose} />
        </XStack>
      </Backdrop>
    );
  }

  if (done) {
    return (
      <Backdrop testID="support-feedback-modal">
        <Text testID="feedback-thanks" fontSize={14} color="$color">
          {THANK_YOU}
        </Text>
        <XStack justifyContent="flex-end">
          <ModalButton testID="feedback-done" label="Done" primary onPress={onClose} />
        </XStack>
      </Backdrop>
    );
  }

  return (
    <Backdrop testID="support-feedback-modal">
      <Text fontSize={16} fontWeight="900" color="$color">
        How did we do?
      </Text>
      <EmojiScale rating={picked} onPick={setPicked} />
      <TextArea
        testID="feedback-comment"
        value={comment}
        onChangeText={setComment}
        placeholder="Anything to add? (optional)"
        maxLength={1000}
        backgroundColor="$surface"
        borderColor="$borderColor"
      />
      {error ? (
        <Text testID="feedback-error" fontSize={12} color="$danger">
          {error}
        </Text>
      ) : null}
      <XStack gap={8} justifyContent="flex-end">
        <ModalButton testID="feedback-skip" label="Skip" onPress={onClose} />
        <ModalButton
          testID="feedback-submit"
          label={busy ? 'Sending…' : 'Submit'}
          primary
          disabled={!picked || busy}
          onPress={() => onSubmit(picked, comment)}
        />
      </XStack>
    </Backdrop>
  );
}
