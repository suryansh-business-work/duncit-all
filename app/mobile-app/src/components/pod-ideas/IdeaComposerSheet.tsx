import { useState } from 'react';
import { Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Input, Spinner, Text, XStack, YStack } from 'tamagui';

import { KeyboardScreen } from '@/components/KeyboardScreen';
import { ModalThemeScope } from '@/components/ModalThemeScope';
import { useThemeColors } from '@/hooks/useThemeColors';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (title: string, description: string) => Promise<void>;
}

/** Bottom sheet to share a new pod idea (title + description). Validates that
 * both are present, then submits and closes. RN port of mWeb's composer dialog. */
export function IdeaComposerSheet({ open, onClose, onSubmit }: Readonly<Props>) {
  const { color, onPrimary } = useThemeColors();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setTitle('');
    setDescription('');
    setError('');
  };

  const close = () => {
    if (submitting) return;
    reset();
    onClose();
  };

  const submit = async () => {
    if (!title.trim() || !description.trim()) {
      setError('Title and description are both required.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await onSubmit(title, description);
      reset();
      onClose();
    } catch {
      setError('Could not submit your idea. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={close}>
      <ModalThemeScope>
        <KeyboardScreen>
          <YStack flex={1} testID="idea-composer-sheet">
            <YStack
              role="button"
              aria-label="Close"
              onPress={close}
              position="absolute"
              top={0}
              left={0}
              right={0}
              bottom={0}
              backgroundColor="rgba(0,0,0,0.5)"
            />
            <YStack
              position="absolute"
              left={0}
              right={0}
              bottom={0}
              backgroundColor="$background"
              borderTopLeftRadius={20}
              borderTopRightRadius={20}
            >
              <SafeAreaView edges={['bottom']}>
                <XStack alignItems="center" justifyContent="space-between" padding={16}>
                  <Text fontSize={18} fontWeight="900" color="$color">
                    Share a pod idea
                  </Text>
                  <XStack
                    testID="idea-composer-close"
                    role="button"
                    aria-label="Close"
                    onPress={close}
                    width={32}
                    height={32}
                    alignItems="center"
                    justifyContent="center"
                  >
                    <MaterialIcons name="close" size={20} color={color} />
                  </XStack>
                </XStack>

                <YStack gap={10} paddingHorizontal={16} paddingBottom={16}>
                  <Input
                    testID="idea-title-input"
                    value={title}
                    onChangeText={(t) => setTitle(t.slice(0, 160))}
                    placeholder="Title"
                    placeholderTextColor="$muted"
                    backgroundColor="$surface"
                  />
                  <Input
                    testID="idea-description-input"
                    value={description}
                    onChangeText={(t) => setDescription(t.slice(0, 2000))}
                    placeholder="Describe the vibe, format, location, audience…"
                    placeholderTextColor="$muted"
                    backgroundColor="$surface"
                    multiline
                    numberOfLines={5}
                    minHeight={120}
                  />
                  {error ? (
                    <Text testID="idea-composer-error" color="$danger" fontSize={12.5}>
                      {error}
                    </Text>
                  ) : null}
                  <XStack
                    testID="idea-composer-submit"
                    role="button"
                    aria-label="Submit idea"
                    aria-disabled={submitting}
                    onPress={submit}
                    height={48}
                    alignItems="center"
                    justifyContent="center"
                    gap={8}
                    borderRadius={12}
                    backgroundColor="$primary"
                    opacity={submitting ? 0.7 : 1}
                    pressStyle={{ opacity: 0.85 }}
                  >
                    {submitting ? <Spinner size="small" color={onPrimary} /> : null}
                    <Text fontSize={14} fontWeight="900" color={onPrimary}>
                      {submitting ? 'Submitting…' : 'Submit'}
                    </Text>
                  </XStack>
                </YStack>
              </SafeAreaView>
            </YStack>
          </YStack>
        </KeyboardScreen>
      </ModalThemeScope>
    </Modal>
  );
}
