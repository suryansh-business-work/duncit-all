import { useState } from 'react';
import { FlatList, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { Spinner, Text, XStack, YStack } from 'tamagui';

import { KeyboardScreen } from '@/components/KeyboardScreen';
import { ModalThemeScope } from '@/components/ModalThemeScope';
import { usePodComments, type PodComment } from '@/hooks/useDetails';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { RootStackParamList } from '@/navigation/types';
import { CommentComposer } from './CommentComposer';
import { CommentRow } from './CommentRow';

interface Props {
  podId: string;
  open: boolean;
  viewerId: string | null;
  viewerPhoto?: string | null;
  onClose: () => void;
  onCountChange: (delta: number) => void;
}

/** Comments bottom sheet — list + add/like/delete. Likes update in place; deleting
 * your own comment goes through a long-press + confirmation (explore items 3,4,5,11). */
export function PodCommentsSheet({
  podId,
  open,
  viewerId,
  viewerPhoto,
  onClose,
  onCountChange,
}: Readonly<Props>) {
  const { color } = useThemeColors();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { comments, isLoading, error, add, remove, toggleLike } = usePodComments(podId, open);
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PodComment | null>(null);

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

  const confirmDelete = async (target: PodComment) => {
    setDeleteTarget(null);
    try {
      await remove(target.id);
      onCountChange(-1);
    } catch {
      /* remove() restored the comment; leave the count unchanged */
    }
  };

  const openProfile = (authorId: string) => {
    onClose();
    navigation.navigate('PublicProfile', { userId: authorId });
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
                        onToggleLike={() => toggleLike(item.id)}
                        onRequestDelete={() => setDeleteTarget(item)}
                        onOpenProfile={() => openProfile(item.author_id)}
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
                  viewerPhoto={viewerPhoto}
                />
              </SafeAreaView>
            </YStack>

            {deleteTarget ? (
              <YStack
                testID="comment-delete-confirm"
                position="absolute"
                top={0}
                left={0}
                right={0}
                bottom={0}
                alignItems="center"
                justifyContent="center"
                backgroundColor="rgba(0,0,0,0.55)"
                padding={28}
              >
                <YStack
                  width="100%"
                  maxWidth={360}
                  gap={6}
                  padding={20}
                  borderRadius={18}
                  backgroundColor="$background"
                >
                  <Text fontSize={16} fontWeight="900" color="$color">
                    Delete comment?
                  </Text>
                  <Text fontSize={13} color="$muted">
                    This comment will be permanently removed.
                  </Text>
                  <XStack gap={10} marginTop={12} justifyContent="flex-end">
                    <XStack
                      testID="comment-delete-cancel"
                      role="button"
                      aria-label="Cancel"
                      onPress={() => setDeleteTarget(null)}
                      height={42}
                      paddingHorizontal={18}
                      borderRadius={12}
                      alignItems="center"
                      justifyContent="center"
                      borderWidth={1}
                      borderColor="$borderColor"
                    >
                      <Text fontSize={14} fontWeight="800" color="$color">
                        Cancel
                      </Text>
                    </XStack>
                    <XStack
                      testID="comment-delete-confirm-btn"
                      role="button"
                      aria-label="Delete"
                      onPress={() => confirmDelete(deleteTarget)}
                      height={42}
                      paddingHorizontal={18}
                      borderRadius={12}
                      alignItems="center"
                      justifyContent="center"
                      backgroundColor="$danger"
                    >
                      <Text fontSize={14} fontWeight="900" color="#ffffff">
                        Delete
                      </Text>
                    </XStack>
                  </XStack>
                </YStack>
              </YStack>
            ) : null}
          </YStack>
        </KeyboardScreen>
      </ModalThemeScope>
    </Modal>
  );
}
