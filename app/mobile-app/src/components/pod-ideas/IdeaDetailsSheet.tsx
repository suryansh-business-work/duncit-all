import { useState } from 'react';
import { Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Spinner, Text, XStack, YStack } from 'tamagui';

import { CommentComposer } from '@/components/details/pod-comments/CommentComposer';
import { KeyboardScreen } from '@/components/KeyboardScreen';
import { ModalThemeScope } from '@/components/ModalThemeScope';
import { usePodIdeaDetails } from '@/hooks/usePodIdeas';
import { useThemeColors } from '@/hooks/useThemeColors';
import { IdeaDetailsBody } from './IdeaDetailsBody';

interface Props {
  id: string;
  myId?: string;
  onClose: () => void;
  onChanged: () => void;
}

/** Idea details bottom sheet — description, like, and the comment thread with an
 * add-comment composer. RN port of mWeb's IdeaDetailsDialog. */
export function IdeaDetailsSheet({ id, myId, onClose, onChanged }: Readonly<Props>) {
  const { color } = useThemeColors();
  const { idea, isLoading, addComment, deleteComment, toggleLike } = usePodIdeaDetails(
    id,
    onChanged,
  );
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);

  const submit = async () => {
    const value = text.trim();
    if (!value || posting) return;
    setPosting(true);
    try {
      await addComment(value);
      setText('');
    } catch {
      /* leave the draft so the user can retry */
    } finally {
      setPosting(false);
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <ModalThemeScope>
        <KeyboardScreen>
          <YStack flex={1} testID="idea-details-sheet">
            <YStack
              role="button"
              aria-label="Close"
              onPress={onClose}
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
              height="82%"
              backgroundColor="$background"
              borderTopLeftRadius={20}
              borderTopRightRadius={20}
            >
              <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
                <XStack alignItems="center" justifyContent="space-between" padding={16}>
                  <Text flex={1} fontSize={18} fontWeight="900" color="$color" numberOfLines={1}>
                    {idea?.title ?? 'Pod idea'}
                  </Text>
                  <XStack
                    testID="idea-details-close"
                    role="button"
                    aria-label="Close"
                    onPress={onClose}
                    width={32}
                    height={32}
                    alignItems="center"
                    justifyContent="center"
                  >
                    <MaterialIcons name="close" size={20} color={color} />
                  </XStack>
                </XStack>

                {isLoading && !idea ? (
                  <YStack flex={1} alignItems="center" justifyContent="center">
                    <Spinner testID="idea-details-loading" color="$primary" />
                  </YStack>
                ) : null}
                {!(isLoading && !idea) && !idea ? (
                  <Text testID="idea-details-missing" padding={16} color="$muted">
                    Idea not found.
                  </Text>
                ) : null}
                {idea ? (
                  <IdeaDetailsBody
                    idea={idea}
                    myId={myId}
                    onToggleLike={toggleLike}
                    onDeleteComment={deleteComment}
                  />
                ) : null}

                {idea ? (
                  <CommentComposer
                    value={text}
                    onChange={setText}
                    onSubmit={submit}
                    disabled={!myId}
                    posting={posting}
                  />
                ) : null}
              </SafeAreaView>
            </YStack>
          </YStack>
        </KeyboardScreen>
      </ModalThemeScope>
    </Modal>
  );
}
