import { useState } from 'react';
import { Modal } from 'react-native';
import { ModalSafeArea } from '@/components/ModalSafeArea';
import { Spinner, Text, YStack } from 'tamagui';

import { CommentComposer } from '@/components/details/pod-comments/CommentComposer';
import { KeyboardScreen } from '@/components/KeyboardScreen';
import { useLoadingRegion } from '@/components/Skeleton';
import { ModalThemeScope } from '@/components/ModalThemeScope';
import { usePostViewer } from '@/hooks/usePostViewer';
import { fireAndForget } from '@/utils/fire-and-forget';
import { PostMedia } from './PostMedia';
import { PostViewerBody } from './PostViewerBody';
import { PostViewerHeader } from './PostViewerHeader';

interface Props {
  postId: string;
  meId?: string;
  onClose: () => void;
  /** Fired after the post is deleted so the grid refreshes. */
  onDeleted: () => void;
}

/** Full-screen post viewer with like + comments, and a 3-dot menu holding
 * Delete (your own post) or Report (anyone else's) — the RN twin of mWeb's
 * profile PostDialog (the profile-image like/comment experience). */
export function PostViewerSheet({ postId, meId, onClose, onDeleted }: Readonly<Props>) {
  const { post, isLoading, toggleLike, addComment, deleteComment, deletePost } =
    usePostViewer(postId);
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const loadingRegion = useLoadingRegion();
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
          <YStack
            flex={1}
            testID="post-viewer"
            backgroundColor="$background"
            onAccessibilityEscape={onClose}
          >
            <ModalSafeArea edges={['top', 'bottom']} style={{ flex: 1 }}>
              <PostViewerHeader
                post={post}
                canDelete={canDelete}
                onDelete={() => fireAndForget(removePost())}
                onClose={onClose}
              />

              {isLoading && !post ? (
                <YStack flex={1} alignItems="center" justifyContent="center">
                  <Spinner testID="post-viewer-loading" color="$primary" {...loadingRegion} />
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
            </ModalSafeArea>
          </YStack>
        </KeyboardScreen>
      </ModalThemeScope>
    </Modal>
  );
}
