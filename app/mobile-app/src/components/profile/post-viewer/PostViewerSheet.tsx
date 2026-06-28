import { useState } from 'react';
import { Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Spinner, Text, XStack, YStack } from 'tamagui';

import { CommentComposer } from '@/components/details/pod-comments/CommentComposer';
import { KeyboardScreen } from '@/components/KeyboardScreen';
import { ModalThemeScope } from '@/components/ModalThemeScope';
import { usePostViewer } from '@/hooks/usePostViewer';
import { useThemeColors } from '@/hooks/useThemeColors';
import { sharePost } from '@/utils/share';
import { PostMedia } from './PostMedia';
import { PostViewerBody } from './PostViewerBody';

interface Props {
  postId: string;
  meId?: string;
  onClose: () => void;
  /** Fired after the post is deleted so the grid refreshes. */
  onDeleted: () => void;
}

/** Full-screen post viewer with like + comments + delete — the RN twin of
 * mWeb's profile PostDialog (the profile-image like/comment experience). */
export function PostViewerSheet({ postId, meId, onClose, onDeleted }: Readonly<Props>) {
  const { color } = useThemeColors();
  const { post, isLoading, toggleLike, addComment, deleteComment, deletePost } =
    usePostViewer(postId);
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const canDelete = !!meId && post?.author_id === meId;

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

  /** Double-tap likes only (never unlikes), reusing the existing toggle. */
  const likeOnDoubleTap = () => {
    if (!post?.liked_by_me) toggleLike();
  };

  const removePost = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await deletePost();
      onDeleted();
    } catch {
      /* keep the viewer open on failure */
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <ModalThemeScope>
        <KeyboardScreen>
          <YStack flex={1} testID="post-viewer" backgroundColor="$background">
            <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
              <XStack alignItems="center" justifyContent="space-between" padding={12}>
                <Text fontSize={16} fontWeight="900" color="$color" numberOfLines={1} flex={1}>
                  {post?.author?.full_name ?? 'Post'}
                </Text>
                {post ? (
                  <XStack
                    testID="post-viewer-share"
                    role="button"
                    aria-label="Share post"
                    onPress={() => sharePost(post.id, post.author?.full_name ?? 'Post')}
                    width={36}
                    height={36}
                    alignItems="center"
                    justifyContent="center"
                    pressStyle={{ opacity: 0.6 }}
                  >
                    <MaterialIcons name="share" size={20} color={color} />
                  </XStack>
                ) : null}
                {canDelete ? (
                  <XStack
                    testID="post-viewer-delete"
                    role="button"
                    aria-label="Delete post"
                    aria-disabled={deleting}
                    onPress={removePost}
                    width={36}
                    height={36}
                    alignItems="center"
                    justifyContent="center"
                    pressStyle={{ opacity: 0.6 }}
                  >
                    <MaterialIcons name="delete-outline" size={20} color={color} />
                  </XStack>
                ) : null}
                <XStack
                  testID="post-viewer-close"
                  role="button"
                  aria-label="Close"
                  onPress={onClose}
                  width={36}
                  height={36}
                  alignItems="center"
                  justifyContent="center"
                  pressStyle={{ opacity: 0.6 }}
                >
                  <MaterialIcons name="close" size={20} color={color} />
                </XStack>
              </XStack>

              {isLoading && !post ? (
                <YStack flex={1} alignItems="center" justifyContent="center">
                  <Spinner testID="post-viewer-loading" color="$primary" />
                </YStack>
              ) : null}
              {!(isLoading && !post) && !post ? (
                <Text testID="post-viewer-missing" padding={16} color="$muted">
                  Post not found.
                </Text>
              ) : null}

              {post ? (
                <>
                  {post.image_url ? (
                    <PostMedia imageUrl={post.image_url} onDoubleTapLike={likeOnDoubleTap} />
                  ) : null}
                  <PostViewerBody
                    post={post}
                    meId={meId}
                    onToggleLike={toggleLike}
                    onDeleteComment={deleteComment}
                  />
                  <CommentComposer
                    value={text}
                    onChange={setText}
                    onSubmit={submit}
                    disabled={!meId}
                    posting={posting}
                  />
                </>
              ) : null}
            </SafeAreaView>
          </YStack>
        </KeyboardScreen>
      </ModalThemeScope>
    </Modal>
  );
}
