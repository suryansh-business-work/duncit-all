import { useState, type ReactNode } from 'react';
import { FlatList, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Spinner, Text, XStack, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DuncitButton } from '@/components/DuncitButton';
import { KeyboardScreen } from '@/components/KeyboardScreen';
import { ModalSafeArea } from '@/components/ModalSafeArea';
import { ModalThemeScope } from '@/components/ModalThemeScope';
import { TutorialCommentForm } from '@/forms/tutorial-comment';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { useTutorialComments, type TutorialCommentItem } from '@/hooks/useTutorialComments';
import { TutorialCommentRow } from './TutorialCommentRow';

interface Props {
  tutorialId: string;
  onClose: () => void;
  /** +1 / -1 so the feed's comment count follows the sheet. */
  onCountChange: (delta: number) => void;
}

/** A tutorial's comments in a bottom sheet: paged list, add, delete your own. */
export function TutorialCommentsSheet({ tutorialId, onClose, onCountChange }: Readonly<Props>) {
  const { t } = useTranslation();
  const { color } = useThemeColors();
  const comments = useTutorialComments(tutorialId);
  const [deleteTarget, setDeleteTarget] = useState<TutorialCommentItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteFailed, setDeleteFailed] = useState(false);

  const add = async (text: string) => {
    await comments.add(text);
    onCountChange(1);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteFailed(false);
    try {
      if (await comments.remove(deleteTarget.id)) onCountChange(-1);
      setDeleteTarget(null);
    } catch {
      setDeleteFailed(true);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  let body: ReactNode;
  if (comments.loading && comments.rows.length === 0) {
    body = (
      <YStack flex={1} alignItems="center" justifyContent="center">
        <Spinner color="$primary" />
      </YStack>
    );
  } else if (comments.failed && comments.rows.length === 0) {
    body = (
      <YStack flex={1} alignItems="center" justifyContent="center" gap={12} padding={16}>
        <Text role="alert" color="$danger">
          {t('mweb.tutorials.commentsLoadFailed')}
        </Text>
        <DuncitButton testID="tutorial-comments-retry" label={t('mweb.tutorials.retry')} onPress={comments.retry} variant="ghost" />
      </YStack>
    );
  } else if (comments.rows.length === 0) {
    body = (
      <Text padding={16} color="$muted" testID="tutorial-comments-empty">
        {t('mweb.tutorials.commentsEmpty')}
      </Text>
    );
  } else {
    body = (
      <FlatList
        style={{ flex: 1 }}
        data={comments.rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        onEndReached={() => {
          comments.loadMore().catch(() => undefined);
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={comments.loading ? <Spinner color="$primary" /> : null}
        renderItem={({ item }) => <TutorialCommentRow comment={item} onRequestDelete={() => setDeleteTarget(item)} />}
      />
    );
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <ModalThemeScope>
        <KeyboardScreen>
          <YStack flex={1} testID="tutorial-comments-sheet">
            <YStack
              role="button"
              importantForAccessibility="no"
              aria-label={t('mweb.tutorials.close')}
              onPress={onClose}
              position="absolute"
              top={0}
              left={0}
              right={0}
              bottom={0}
              backgroundColor="$color"
              opacity={0.5}
            />
            <YStack position="absolute" left={0} right={0} bottom={0} height="72%" backgroundColor="$surface" borderTopLeftRadius={28} borderTopRightRadius={28}>
              <ModalSafeArea edges={['bottom']} style={{ flex: 1 }}>
                <XStack alignItems="center" justifyContent="space-between" paddingHorizontal={16} paddingTop={16} paddingBottom={8}>
                  <Text role="heading" fontSize={17} fontWeight="600" color="$color">
                    {t('mweb.tutorials.commentsTitle')}
                  </Text>
                  <XStack
                    testID="tutorial-comments-close"
                    role="button"
                    tabIndex={0}
                    aria-label={t('mweb.tutorials.close')}
                    onPress={onClose}
                    pressStyle={PRESS_STYLE.surface}
                    width={44}
                    height={44}
                    borderRadius={22}
                    backgroundColor="$soft"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <MaterialIcons name="close" size={20} color={color} />
                  </XStack>
                </XStack>
                {deleteFailed ? (
                  <Text role="alert" paddingHorizontal={16} fontSize={13} color="$danger">
                    {t('mweb.tutorials.commentDeleteFailed')}
                  </Text>
                ) : null}
                {body}
                <TutorialCommentForm onSubmit={add} />
              </ModalSafeArea>
            </YStack>
            <ConfirmDialog
              open={deleteTarget !== null}
              title={t('mweb.tutorials.deleteConfirmTitle')}
              message={t('mweb.tutorials.deleteConfirmBody')}
              confirmLabel={t('mweb.tutorials.deleteConfirm')}
              cancelLabel={t('mweb.tutorials.cancel')}
              destructive
              busy={deleting}
              onConfirm={() => {
                confirmDelete().catch(() => setDeleteFailed(true));
              }}
              onCancel={() => setDeleteTarget(null)}
              testID="tutorial-comment-delete-confirm"
            />
          </YStack>
        </KeyboardScreen>
      </ModalThemeScope>
    </Modal>
  );
}
