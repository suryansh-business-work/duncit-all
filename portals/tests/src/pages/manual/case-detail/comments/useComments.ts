import { useCallback, useMemo } from 'react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client/react';
import { notifyError } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import {
  ADD_MANUAL_CASE_COMMENT,
  DELETE_MANUAL_CASE_COMMENT,
  EDIT_MANUAL_CASE_COMMENT,
  MANUAL_TEST_COMMENTS,
  type AddCommentData,
  type AddCommentVariables,
  type CommentsData,
  type CommentsVariables,
  type EditCommentData,
  type EditCommentVariables,
} from '../../shared/comment.queries';
import { manualErrorText } from '../../shared/errors';
import type { ManualComment } from '../../shared/types';

const NO_COMMENTS: ManualComment[] = [];
const where = (component: string) => ({ page: '/manual/cases/:caseKey', component });

/**
 * A case's comment thread, oldest first, a page at a time — with add, edit and
 * delete written straight into the cached thread (no reload of the page).
 * Each action reports its own failure and answers whether it worked.
 */
export function useComments(caseId: string) {
  const { t } = useTranslation();
  const client = useApolloClient();
  const variables = useMemo<CommentsVariables>(() => ({ case_id: caseId, offset: 0 }), [caseId]);
  const { data, loading, error, fetchMore } = useQuery<CommentsData, CommentsVariables>(MANUAL_TEST_COMMENTS, {
    variables,
    fetchPolicy: 'cache-and-network',
  });
  const [addComment, adding] = useMutation<AddCommentData, AddCommentVariables>(ADD_MANUAL_CASE_COMMENT);
  const [editComment] = useMutation<EditCommentData, EditCommentVariables>(EDIT_MANUAL_CASE_COMMENT);
  const [deleteComment] = useMutation<{ deleteManualCaseComment: boolean }, { id: string }>(DELETE_MANUAL_CASE_COMMENT);
  const rows = data?.manualTestComments.rows ?? NO_COMMENTS;
  const total = data?.manualTestComments.total ?? 0;

  const rewrite = useCallback(
    (change: (thread: CommentsData['manualTestComments']) => CommentsData['manualTestComments']) =>
      client.cache.updateQuery<CommentsData, CommentsVariables>({ query: MANUAL_TEST_COMMENTS, variables }, (previous) =>
        previous ? { manualTestComments: change(previous.manualTestComments) } : previous
      ),
    [client, variables]
  );

  const loadMore = useCallback(async () => {
    try {
      await fetchMore({
        variables: { offset: rows.length },
        updateQuery: (previous, { fetchMoreResult }) => ({
          manualTestComments: {
            total: fetchMoreResult.manualTestComments.total,
            rows: [...previous.manualTestComments.rows, ...fetchMoreResult.manualTestComments.rows],
          },
        }),
      });
    } catch (err) {
      notifyError(manualErrorText(t, err, t('testsManual.comments.loadFailed'), where('useComments.loadMore')));
    }
  }, [fetchMore, rows.length, t]);

  const add = useCallback(
    async (body: string): Promise<boolean> => {
      try {
        const result = await addComment({ variables: { case_id: caseId, body } });
        const added = result.data?.addManualCaseComment;
        // Shown at the end only when the thread is fully loaded; otherwise "load more" reaches it.
        if (added) {
          rewrite((thread) => ({
            total: thread.total + 1,
            rows: thread.rows.length >= thread.total ? [...thread.rows, added] : thread.rows,
          }));
        }
        return true;
      } catch (err) {
        notifyError(manualErrorText(t, err, t('testsManual.comments.addFailed'), where('useComments.add')));
        return false;
      }
    },
    [addComment, caseId, rewrite, t]
  );

  const edit = useCallback(
    async (id: string, body: string): Promise<boolean> => {
      try {
        await editComment({ variables: { id, body } });
        return true;
      } catch (err) {
        notifyError(manualErrorText(t, err, t('testsManual.comments.editFailed'), where('useComments.edit')));
        return false;
      }
    },
    [editComment, t]
  );

  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        await deleteComment({ variables: { id } });
        rewrite((thread) => ({ total: Math.max(0, thread.total - 1), rows: thread.rows.filter((row) => row.id !== id) }));
        return true;
      } catch (err) {
        notifyError(manualErrorText(t, err, t('testsManual.comments.deleteFailed'), where('useComments.remove')));
        return false;
      }
    },
    [deleteComment, rewrite, t]
  );

  return { rows, total, loading: loading && !data, error, loadMore, add, adding: adding.loading, edit, remove };
}
