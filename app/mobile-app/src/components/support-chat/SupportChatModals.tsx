import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Input, Text, TextArea, XStack, YStack } from 'tamagui';

interface ButtonProps {
  testID: string;
  label: string;
  primary?: boolean;
  disabled?: boolean;
  onPress: () => void;
}

function ModalButton({ testID, label, primary, disabled, onPress }: Readonly<ButtonProps>) {
  return (
    <XStack
      testID={testID}
      role="button"
      aria-label={label}
      aria-disabled={disabled}
      onPress={disabled ? undefined : onPress}
      height={42}
      paddingHorizontal={18}
      alignItems="center"
      justifyContent="center"
      borderRadius={999}
      borderWidth={primary ? 0 : 1}
      borderColor="$borderColor"
      backgroundColor={primary ? '$primary' : 'transparent'}
      opacity={disabled ? 0.5 : 1}
      pressStyle={{ opacity: 0.85 }}
    >
      <Text fontSize={14} fontWeight="800" color={primary ? '$onPrimary' : '$color'}>
        {label}
      </Text>
    </XStack>
  );
}

function Backdrop({ testID, children }: Readonly<{ testID: string; children: React.ReactNode }>) {
  return (
    <YStack
      testID={testID}
      position="absolute"
      top={0}
      left={0}
      right={0}
      bottom={0}
      zIndex={100}
      backgroundColor="rgba(0,0,0,0.5)"
      alignItems="center"
      justifyContent="center"
      padding={24}
    >
      <YStack
        width="100%"
        maxWidth={360}
        gap={12}
        padding={20}
        borderRadius={16}
        backgroundColor="$background"
      >
        {children}
      </YStack>
    </YStack>
  );
}

interface FeedbackProps {
  open: boolean;
  busy?: boolean;
  onSubmit: (rating: number, comment: string) => void;
  onClose: () => void;
}

export function SupportFeedbackModal({ open, busy, onSubmit, onClose }: Readonly<FeedbackProps>) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  if (!open) return null;
  return (
    <Backdrop testID="support-feedback-modal">
      <Text fontSize={16} fontWeight="900" color="$color">
        How did we do?
      </Text>
      <XStack gap={6} justifyContent="center">
        {[1, 2, 3, 4, 5].map((n) => (
          <XStack
            key={n}
            testID={`feedback-star-${n}`}
            role="button"
            aria-label={`Rate ${n}`}
            onPress={() => setRating(n)}
            pressStyle={{ opacity: 0.7 }}
          >
            <MaterialIcons name={n <= rating ? 'star' : 'star-border'} size={32} color="#f5a623" />
          </XStack>
        ))}
      </XStack>
      <TextArea
        testID="feedback-comment"
        value={comment}
        onChangeText={setComment}
        placeholder="Anything to add? (optional)"
        maxLength={1000}
        backgroundColor="$surface"
        borderColor="$borderColor"
      />
      <XStack gap={8} justifyContent="flex-end">
        <ModalButton testID="feedback-skip" label="Skip" onPress={onClose} />
        <ModalButton
          testID="feedback-submit"
          label={busy ? 'Sending…' : 'Submit'}
          primary
          disabled={!rating || busy}
          onPress={() => onSubmit(rating, comment)}
        />
      </XStack>
    </Backdrop>
  );
}

interface EmailProps {
  open: boolean;
  busy?: boolean;
  done?: boolean;
  error?: string;
  onSend: (email: string) => void;
  onClose: () => void;
}

export function EmailTranscriptModal({
  open,
  busy,
  done,
  error,
  onSend,
  onClose,
}: Readonly<EmailProps>) {
  const [email, setEmail] = useState('');
  if (!open) return null;
  return (
    <Backdrop testID="support-email-modal">
      <Text fontSize={16} fontWeight="900" color="$color">
        Email this chat
      </Text>
      {done ? (
        <Text testID="email-done" fontSize={13} color="$muted">
          Transcript sent to {email}.
        </Text>
      ) : (
        <Input
          testID="email-input"
          value={email}
          onChangeText={setEmail}
          placeholder="Email address"
          keyboardType="email-address"
          autoCapitalize="none"
          backgroundColor="$surface"
          borderColor="$borderColor"
        />
      )}
      {error ? (
        <Text testID="email-error" fontSize={12} color="$danger">
          {error}
        </Text>
      ) : null}
      <XStack gap={8} justifyContent="flex-end">
        <ModalButton testID="email-close" label={done ? 'Done' : 'Cancel'} onPress={onClose} />
        {done ? null : (
          <ModalButton
            testID="email-send"
            label={busy ? 'Sending…' : 'Send'}
            primary
            disabled={busy || !email.trim()}
            onPress={() => onSend(email)}
          />
        )}
      </XStack>
    </Backdrop>
  );
}
