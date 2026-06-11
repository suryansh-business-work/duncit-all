import { useState } from 'react';
import { FlatList, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Spinner, Text, XStack, YStack } from 'tamagui';

import { KeyboardScreen } from '@/components/KeyboardScreen';
import { ModalThemeScope } from '@/components/ModalThemeScope';
import { usePodComments, type PodComment } from '@/hooks/useDetails';
import { useThemeColors } from '@/hooks/useThemeColors';
import { CommentComposer } from './CommentComposer';
import { CommentRow } from './CommentRow';

interface Props {
  podId: string;
  open: boolean;
  viewerId: string | null;
  onClose: () => void;
  onCountChange: (delta: number) => void;
}

/** Comments bottom sheet — list + add/delete. RN port of mWeb's
 * PodCommentsSheet; loads on open via usePodComments. */
export function PodCommentsSheet({
  podId,
  open,
  viewerId,
  onClose,
  onCountChange,
}: Readonly<Props>) {
  const { color } = useThemeColors();
  const { comments, isLoading, error, add, remove } = usePodComments(podId, open);
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);

  const submit = async () => {
    const value = text.trim();
    if (!value || posting) return;
    setPosting(true);
    try {
      await add(value);
      setText('');
      onCountChange(1);
    } catch {
      /* the thread is left intact; load errors surface in the list area */
    } finally {
      setPosting(false);
    }
  };

  const onDelete = async (id: string) => {
    await remove(id);
    onCountChange(-1);
  };

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <ModalThemeScope>
        <KeyboardScreen>
          <YStack flex={1} testID="pod-comments-sheet">
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
              height="72%"
              backgroundColor="$background"
              borderTopLeftRadius={20}
              borderTopRightRadius={20}
            >
              <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
                <XStack
                  alignItems="center"
                  justifyContent="space-between"
                  paddingHorizontal={16}
                  paddingTop={16}
                  paddingBottom={8}
                >
                  <Text fontSize={18} fontWeight="900" color="$color">
                    Comments
                  </Text>
                  <XStack
                    testID="pod-comments-close"
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

                {isLoading ? (
                  <YStack flex={1} alignItems="center" justifyContent="center">
                    <Spinner color="$primary" />
                  </YStack>
                ) : error ? (
                  <Text padding={16} color="$danger">
                    {error}
                  </Text>
                ) : comments.length === 0 ? (
                  <Text padding={16} color="$muted" testID="pod-comments-empty">
                    No comments yet. Be the first to comment.
                  </Text>
                ) : (
                  <FlatList<PodComment>
                    style={{ flex: 1 }}
                    data={comments}
                    keyExtractor={(c) => c.id}
                    contentContainerStyle={{ paddingHorizontal: 16 }}
                    renderItem={({ item }) => (
                      <CommentRow
                        comment={item}
                        canDelete={!!viewerId && item.author_id === viewerId}
                        onDelete={() => onDelete(item.id)}
                      />
                    )}
                  />
                )}

                <CommentComposer
                  value={text}
                  onChange={setText}
                  onSubmit={submit}
                  disabled={!viewerId}
                  posting={posting}
                />
              </SafeAreaView>
            </YStack>
          </YStack>
        </KeyboardScreen>
      </ModalThemeScope>
    </Modal>
  );
}
