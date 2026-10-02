import { useState, type ReactNode } from 'react';
import { FlatList, Modal } from 'react-native';
import { ModalSafeArea } from '@/components/ModalSafeArea';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Spinner, Text, YStack } from 'tamagui';

import { KeyboardScreen } from '@/components/KeyboardScreen';
import { ModalThemeScope } from '@/components/ModalThemeScope';
import { usePodComments, type PodComment } from '@/hooks/useDetails';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';
import { CommentComposer } from '../CommentComposer';
import { CommentRow } from '../CommentRow';
import { PRESS_STYLE } from '@duncit/buttons-native';
import { useLoadingRegion } from '@/components/Skeleton';

import { CommentsSheetHeader } from './CommentsSheetHeader';
import { DeleteCommentConfirm } from './DeleteCommentConfirm';

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
  const loadingRegion = useLoadingRegion();
  const { color } = useThemeColors();
  const { t } = useTranslation();
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

  let commentsBody: ReactNode;
  if (isLoading) {
    commentsBody = (
      <YStack flex={1} alignItems="center" justifyContent="center">
        <Spinner {...loadingRegion} color="$primary" />
      </YStack>
    );
  } else if (error) {
    commentsBody = (
      <Text role="alert" padding={16} color="$danger">
        {error}
      </Text>
    );
  } else if (comments.length === 0) {
    commentsBody = (
      <Text padding={16} color="$muted" testID="pod-comments-empty">
        {t('mweb.podDetails.commentsEmpty')}
      </Text>
    );
  } else {
    commentsBody = (
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
    );
  }

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <ModalThemeScope>
        <KeyboardScreen>
          <YStack flex={1} testID="pod-comments-sheet">
            <YStack
              pressStyle={PRESS_STYLE.surface}
              role="button"
              importantForAccessibility="no"
              aria-label={t('mweb.podDetails.close')}
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
              backgroundColor="$surface"
              borderTopLeftRadius={28}
              borderTopRightRadius={28}
            >
              <ModalSafeArea edges={['bottom']} style={{ flex: 1 }}>
                <CommentsSheetHeader color={color} onClose={onClose} />

                {commentsBody}

                <CommentComposer
                  value={text}
                  onChange={setText}
                  onSubmit={submit}
                  disabled={!viewerId}
                  posting={posting}
                  viewerPhoto={viewerPhoto}
                />
              </ModalSafeArea>
            </YStack>

            {deleteTarget ? (
              <DeleteCommentConfirm
                onCancel={() => setDeleteTarget(null)}
                onConfirm={() => confirmDelete(deleteTarget)}
              />
            ) : null}
          </YStack>
        </KeyboardScreen>
      </ModalThemeScope>
    </Modal>
  );
}
