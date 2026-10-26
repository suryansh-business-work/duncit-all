import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import PostDialog from '../post-dialog/PostDialog';
import PostCommentList from '../post-dialog/PostCommentList';
import PostActions from '../post-dialog/PostActions';
import PostDialogHeader from '../post-dialog/PostDialogHeader';
import UploadDialog from '../UploadDialog';
import { ADD_COMMENT, CREATE_POST, DELETE_COMMENT, DELETE_POST, TOGGLE_LIKE } from '../queries';
import { fallbackT } from '../../../i18n/fallback';

const h = vi.hoisted(() => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  share: vi.fn(),
  muts: {} as Record<string, ReturnType<typeof vi.fn>>,
}));

vi.mock('@apollo/client/react', async (orig) => ({
  ...(await orig<object>()),
  useQuery: h.useQuery,
  useMutation: h.useMutation,
}));
vi.mock('../../../utils/dateFormat', async (orig) => ({ ...(await orig<object>()), formatDateTime: (d: string) => `DT:${d}` }));
vi.mock('../../../utils/share', () => ({ sharePost: h.share }));
vi.mock('../../../components/content-report/ContentActionsMenu', () => ({
  default: (p: { canDelete: boolean; canReport: boolean; onDelete: () => void; onReport: () => void }) => (
    <div data-testid="menu" data-delete={String(p.canDelete)} data-report={String(p.canReport)}>
      <button data-testid="menu-delete" onClick={p.onDelete} />
      <button data-testid="menu-report" onClick={p.onReport} />
    </div>
  ),
}));
vi.mock('../../../components/content-report/ReportContentDialog', () => ({
  default: (p: { targetId: string | null; onClose: () => void }) => (
    <div data-testid="report-dialog" data-target={p.targetId ?? ''}>
      <button data-testid="report-close" onClick={p.onClose} />
    </div>
  ),
}));
vi.mock('../../../components/ConfirmDialog', () => ({
  default: (p: { open: boolean; busy?: boolean; onConfirm: () => void; onClose: () => void }) =>
    p.open ? (
      <div data-testid="confirm" data-busy={String(Boolean(p.busy))}>
        <button data-testid="confirm-yes" onClick={p.onConfirm} />
        <button data-testid="confirm-no" onClick={p.onClose} />
      </div>
    ) : null,
}));
vi.mock('../../../components/MediaPickerDialog', () => ({
  default: (p: { open: boolean; onClose: () => void; onPicked: (u: string) => void }) =>
    p.open ? (
      <div data-testid="picker">
        <button data-testid="picker-pick" onClick={() => p.onPicked('https://img/new.png')} />
        <button data-testid="picker-close" onClick={p.onClose} />
      </div>
    ) : null,
}));

const comment = (id: string, over: object = {}) => ({
  id,
  text: `text-${id}`,
  author_id: 'other',
  created_at: `2026-06-0${id}T00:00:00.000Z`,
  author: { full_name: `Name ${id}`, first_name: 'Zed', profile_photo: null },
  ...over,
});
const post = (over: object = {}) => ({
  id: 'p1',
  author_id: 'me',
  image_url: 'https://img/p.png',
  caption: 'Nice day',
  likes_count: 2,
  liked_by_me: false,
  created_at: '2026-06-01T00:00:00.000Z',
  author: { full_name: 'Asha Rao', first_name: 'asha', profile_photo: 'https://img/a.png' },
  comments: [comment('2'), comment('1')],
  ...over,
});

const setupMutations = (failing: string[] = []) => {
  h.muts = {};
  const byDoc = new Map<unknown, string>([
    [TOGGLE_LIKE, 'like'],
    [ADD_COMMENT, 'comment'],
    [DELETE_COMMENT, 'deleteComment'],
    [DELETE_POST, 'deletePost'],
    [CREATE_POST, 'createPost'],
  ]);
  h.useMutation.mockImplementation((doc: unknown) => {
    const name = byDoc.get(doc) ?? 'unknown';
    const fn = h.muts[name] ?? (h.muts[name] = vi.fn());
    fn.mockImplementation(async () => {
      if (failing.includes(name)) throw new Error('nope');
      return { data: {} };
    });
    return [fn, { loading: false }];
  });
};

const dialog = (data: object | undefined, props: { postId?: string | null; loading?: boolean; failing?: string[]; meId?: string } = {}) => {
  setupMutations(props.failing);
  h.useQuery.mockReturnValue({ data, loading: Boolean(props.loading) });
  const onClose = vi.fn();
  const onDeleted = vi.fn();
  render(<PostDialog postId={props.postId === undefined ? 'p1' : props.postId} meId={props.meId ?? 'me'} onClose={onClose} onDeleted={onDeleted} />);
  return { onClose, onDeleted };
};

beforeEach(() => vi.clearAllMocks());

describe('PostDialog', () => {
  it('shows a loader on the first read, and does not read while closed', () => {
    dialog(undefined, { loading: true });
    expect(screen.getByTestId('post-dialog-loading')).toBeInTheDocument();
    expect(h.useQuery.mock.calls[0][1].skip).toBe(false);
  });

  it('says the post was not found, and skips the read when no post is selected', () => {
    dialog(undefined, { postId: null });
    expect(h.useQuery.mock.calls[0][1].skip).toBe(true);
    expect(screen.queryByTestId('post-dialog-not-found')).not.toBeInTheDocument();
  });

  it('says the post was not found when the read comes back empty', () => {
    dialog({ post: null });
    expect(screen.getByTestId('post-dialog-not-found')).toHaveTextContent(fallbackT('mweb.profile.postNotFound'));
  });

  it('shows the author with oldest comment first, and offers delete (not report) on your own post', () => {
    dialog({ post: post() });
    expect(screen.getByTestId('post-dialog-header-author')).toHaveTextContent('Asha Rao');
    const order = [...screen.getByTestId('post-comment-list-comments').children].map((n) => n.getAttribute('data-testid'));
    expect(order).toEqual(['post-comment-list-comment-1', 'post-comment-list-comment-2']);
    expect(screen.getByTestId('menu')).toHaveAttribute('data-delete', 'true');
    expect(screen.getByTestId('menu')).toHaveAttribute('data-report', 'false');
  });

  it('treats a post with no comment list as having no comments, and offers report on someone else post', () => {
    dialog({ post: post({ comments: null, author_id: 'someone' }) });
    expect(screen.getByTestId('post-comment-list-empty')).toBeInTheDocument();
    expect(screen.getByTestId('menu')).toHaveAttribute('data-report', 'true');
  });

  it('closes from the header', () => {
    const { onClose } = dialog({ post: post() });
    fireEvent.click(screen.getByTestId('post-dialog-header-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('likes with the heart, and a failed like leaves the dialog usable', async () => {
    dialog({ post: post() });
    fireEvent.click(screen.getByTestId('post-actions-like'));
    await waitFor(() => expect(h.muts.like).toHaveBeenCalledWith({ variables: { id: 'p1' } }));
    const failing = dialog({ post: post() }, { failing: ['like'] });
    expect(failing.onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getAllByTestId('post-actions-like')[1]);
    await waitFor(() => expect(h.muts.like).toHaveBeenCalledTimes(1));
    expect(screen.getAllByTestId('post-actions-likes-count')[1]).toHaveTextContent('2 likes');
  });

  it('double-tap likes an unliked post but never unlikes a liked one', async () => {
    const now = vi.spyOn(Date, 'now');
    dialog({ post: post() });
    now.mockReturnValue(1000);
    fireEvent.click(screen.getByTestId('post-media'));
    now.mockReturnValue(1100);
    fireEvent.click(screen.getByTestId('post-media'));
    await waitFor(() => expect(h.muts.like).toHaveBeenCalledTimes(1));
    now.mockRestore();
  });

  it('does not unlike on double-tap when already liked', async () => {
    const now = vi.spyOn(Date, 'now');
    dialog({ post: post({ liked_by_me: true, likes_count: 1 }) });
    expect(screen.getByTestId('post-actions-likes-count')).toHaveTextContent('1 like');
    expect(screen.getByTestId('post-actions-like')).toHaveAttribute('aria-pressed', 'true');
    now.mockReturnValue(1000);
    fireEvent.click(screen.getByTestId('post-media'));
    now.mockReturnValue(1100);
    fireEvent.click(screen.getByTestId('post-media'));
    expect(h.muts.like).not.toHaveBeenCalled();
    now.mockRestore();
  });

  it('sends a trimmed comment with Enter or the send button and clears the box; blank is not sent', async () => {
    dialog({ post: post() });
    const box = screen.getByLabelText(fallbackT('mweb.common.addAComment'));
    expect(screen.getByTestId('post-actions-send')).toBeDisabled();
    fireEvent.change(box, { target: { value: '   ' } });
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(h.muts.comment).not.toHaveBeenCalled();
    fireEvent.change(box, { target: { value: '  hello  ' } });
    fireEvent.keyDown(box, { key: 'Enter', shiftKey: true });
    expect(h.muts.comment).not.toHaveBeenCalled();
    fireEvent.keyDown(box, { key: 'Enter' });
    await waitFor(() => expect(h.muts.comment).toHaveBeenCalledWith({ variables: { id: 'p1', text: 'hello' } }));
    await waitFor(() => expect(box).toHaveValue(''));
    fireEvent.change(box, { target: { value: 'again' } });
    fireEvent.click(screen.getByTestId('post-actions-send'));
    await waitFor(() => expect(h.muts.comment).toHaveBeenCalledTimes(2));
  });

  it('keeps the comment text when sending fails so it can be retried', async () => {
    dialog({ post: post() }, { failing: ['comment'] });
    const box = screen.getByLabelText(fallbackT('mweb.common.addAComment'));
    fireEvent.change(box, { target: { value: 'keep me' } });
    fireEvent.click(screen.getByTestId('post-actions-send'));
    await waitFor(() => expect(h.muts.comment).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByTestId('post-actions-send')).not.toBeDisabled());
    expect(box).toHaveValue('keep me');
  });

  it('focuses the comment box from the comment icon', () => {
    dialog({ post: post() });
    fireEvent.click(screen.getByTestId('post-actions-comment-icon'));
    expect(screen.getByLabelText(fallbackT('mweb.common.addAComment'))).toHaveFocus();
  });

  it('deletes a comment and survives a failed delete', async () => {
    dialog({ post: post() });
    fireEvent.click(screen.getByTestId('post-comment-list-comment-1-delete'));
    await waitFor(() => expect(h.muts.deleteComment).toHaveBeenCalledWith({ variables: { id: 'p1', commentId: '1' } }));
    dialog({ post: post() }, { failing: ['deleteComment'] });
    fireEvent.click(screen.getAllByTestId('post-comment-list-comment-2-delete')[1]);
    await waitFor(() => expect(h.muts.deleteComment).toHaveBeenCalledTimes(1));
  });

  it('confirms before deleting the post, then deletes and tells the page', async () => {
    const { onDeleted } = dialog({ post: post() });
    fireEvent.click(screen.getByTestId('menu-delete'));
    fireEvent.click(screen.getByTestId('confirm-no'));
    expect(screen.queryByTestId('confirm')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('menu-delete'));
    fireEvent.click(screen.getByTestId('confirm-yes'));
    await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1));
    expect(h.muts.deletePost).toHaveBeenCalledWith({ variables: { id: 'p1' } });
    expect(screen.queryByTestId('confirm')).not.toBeInTheDocument();
  });

  it('keeps the post and the confirm dialog when deleting fails', async () => {
    const { onDeleted } = dialog({ post: post() }, { failing: ['deletePost'] });
    fireEvent.click(screen.getByTestId('menu-delete'));
    fireEvent.click(screen.getByTestId('confirm-yes'));
    await waitFor(() => expect(h.muts.deletePost).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByTestId('confirm')).toHaveAttribute('data-busy', 'false'));
    expect(onDeleted).not.toHaveBeenCalled();
  });

  it('starts and ends a report from the header menu', () => {
    dialog({ post: post({ author_id: 'someone' }) });
    fireEvent.click(screen.getByTestId('menu-report'));
    expect(screen.getByTestId('report-dialog')).toHaveAttribute('data-target', 'p1');
    fireEvent.click(screen.getByTestId('report-close'));
    expect(screen.getByTestId('report-dialog')).toHaveAttribute('data-target', '');
  });

  it('does not close the confirm while a delete is in flight', async () => {
    setupMutations();
    let release: () => void = () => undefined;
    h.useMutation.mockImplementation((doc: unknown) => [
      doc === DELETE_POST ? vi.fn(() => new Promise<void>((r) => { release = r; })) : vi.fn(),
      { loading: false },
    ]);
    h.useQuery.mockReturnValue({ data: { post: post() }, loading: false });
    const onDeleted = vi.fn();
    render(<PostDialog postId="p1" meId="me" onClose={vi.fn()} onDeleted={onDeleted} />);
    fireEvent.click(screen.getByTestId('menu-delete'));
    fireEvent.click(screen.getByTestId('confirm-yes'));
    await waitFor(() => expect(screen.getByTestId('confirm')).toHaveAttribute('data-busy', 'true'));
    fireEvent.click(screen.getByTestId('confirm-no'));
    expect(screen.getByTestId('confirm')).toBeInTheDocument();
    release();
    await waitFor(() => expect(onDeleted).toHaveBeenCalled());
  });
});

describe('PostCommentList', () => {
  const list = (p: object, comments: object[], meId = 'me', canDeletePost = false) => {
    const onDeleteComment = vi.fn();
    render(<PostCommentList post={p} sortedComments={comments as never} meId={meId} canDeletePost={canDeletePost} onDeleteComment={onDeleteComment} />);
    return onDeleteComment;
  };

  it('shows the caption with its author and time, and the empty prompt', () => {
    list(post(), []);
    expect(screen.getByTestId('post-comment-list-caption')).toHaveTextContent('Asha Rao');
    expect(screen.getByTestId('post-comment-list-caption')).toHaveTextContent('Nice day');
    expect(screen.getByTestId('post-comment-list-caption')).toHaveTextContent('DT:2026-06-01T00:00:00.000Z');
    expect(screen.getByTestId('post-comment-list-empty')).toBeInTheDocument();
  });

  it('falls back to User with a U avatar when the author is unknown, and shows no caption when empty', () => {
    list(post({ caption: '', author: null }), []);
    expect(screen.queryByTestId('post-comment-list-caption')).not.toBeInTheDocument();
  });

  it('uses a placeholder name and initial when the caption author has no details', () => {
    list(post({ author: { full_name: null, first_name: null, profile_photo: null } }), []);
    expect(screen.getByTestId('post-comment-list-caption')).toHaveTextContent('U');
  });

  it('shows delete only on your own comments, or on every comment of your own post', () => {
    const own = comment('1', { author_id: 'me' });
    const theirs = comment('2');
    const onDelete = list(post(), [own, theirs]);
    expect(screen.getByTestId('post-comment-list-comment-1-delete')).toBeInTheDocument();
    expect(screen.queryByTestId('post-comment-list-comment-2-delete')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('post-comment-list-comment-1-delete'));
    expect(onDelete).toHaveBeenCalledWith('1');
  });

  it('lets the post owner remove any comment, and names an anonymous commenter', () => {
    list(post(), [comment('3', { author: null })], 'me', true);
    const row = screen.getByTestId('post-comment-list-comment-3');
    expect(within(row).getByText('User')).toBeInTheDocument();
    expect(within(row).getByTestId('post-comment-list-comment-3-delete')).toBeInTheDocument();
  });
});

describe('PostActions', () => {
  it('pluralises likes and reflects an unliked state', () => {
    render(<PostActions post={post({ likes_count: 0 })} comment="" setComment={vi.fn()} onLike={vi.fn()} onSend={vi.fn()} submitting={false} />);
    expect(screen.getByTestId('post-actions-likes-count')).toHaveTextContent('0 likes');
    expect(screen.getByTestId('post-actions-like')).toHaveAttribute('aria-pressed', 'false');
  });

  it('disables send while submitting', () => {
    render(<PostActions post={post()} comment="hi" setComment={vi.fn()} onLike={vi.fn()} onSend={vi.fn()} submitting />);
    expect(screen.getByTestId('post-actions-send')).toBeDisabled();
  });
});

describe('PostDialogHeader', () => {
  it('shares the post under the author name, or Post when the author is unknown', () => {
    const { unmount } = render(<PostDialogHeader post={post()} canDelete={false} onClose={vi.fn()} onRequestDelete={vi.fn()} />);
    fireEvent.click(screen.getByTestId('post-dialog-header-share'));
    expect(h.share).toHaveBeenCalledWith('p1', 'Asha Rao');
    unmount();
    render(<PostDialogHeader post={post({ author: null })} canDelete onClose={vi.fn()} onRequestDelete={vi.fn()} />);
    fireEvent.click(screen.getByTestId('post-dialog-header-share'));
    expect(h.share).toHaveBeenLastCalledWith('p1', 'Post');
    expect(screen.getByTestId('post-dialog-header-author')).toHaveTextContent('User');
  });
});

describe('UploadDialog', () => {
  const upload = (failing: string[] = [], open = true) => {
    setupMutations(failing);
    const onClose = vi.fn();
    const onSuccess = vi.fn();
    const onError = vi.fn();
    render(<UploadDialog open={open} onClose={onClose} onSuccess={onSuccess} onError={onError} />);
    return { onClose, onSuccess, onError };
  };
  const pick = () => {
    fireEvent.click(screen.getByTestId('upload-dialog-choose-image'));
    fireEvent.click(screen.getByTestId('picker-pick'));
  };

  it('starts empty with a choose-image prompt', () => {
    upload();
    expect(screen.getByTestId('upload-dialog-empty')).toHaveTextContent(fallbackT('mweb.profile.pickAnImageToShare'));
  });

  it('previews the picked image, counts the caption, and changes the photo', () => {
    upload();
    pick();
    expect(screen.getByTestId('upload-dialog-preview')).toHaveAttribute('src', 'https://img/new.png');
    fireEvent.change(screen.getByTestId('upload-dialog-caption-input'), { target: { value: 'Hey' } });
    expect(screen.getByText('3/2200')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('upload-dialog-change-photo'));
    fireEvent.click(screen.getByTestId('picker-close'));
    expect(screen.queryByTestId('picker')).not.toBeInTheDocument();
  });

  it('shares the post with its caption and reports success', async () => {
    const { onSuccess } = upload();
    pick();
    fireEvent.change(screen.getByTestId('upload-dialog-caption-input'), { target: { value: 'Hey' } });
    fireEvent.click(screen.getByTestId('upload-dialog-share'));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith('Post shared.'));
    expect(h.muts.createPost).toHaveBeenCalledWith({ variables: { input: { image_url: 'https://img/new.png', caption: 'Hey' } } });
    expect(screen.getByTestId('upload-dialog-empty')).toBeInTheDocument();
  });

  it('reports the failure and keeps the picture so it can be retried', async () => {
    const { onError, onSuccess } = upload(['createPost']);
    pick();
    fireEvent.click(screen.getByTestId('upload-dialog-share'));
    await waitFor(() => expect(onError).toHaveBeenCalledWith('nope'));
    expect(onSuccess).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByTestId('upload-dialog-share')).not.toBeDisabled());
    expect(screen.getByTestId('upload-dialog-preview')).toBeInTheDocument();
  });

  it('says it could not share when the failure carries no message', async () => {
    setupMutations();
    h.useMutation.mockReturnValue([vi.fn().mockRejectedValue(undefined), { loading: false }]);
    const onError = vi.fn();
    render(<UploadDialog open onClose={vi.fn()} onSuccess={vi.fn()} onError={onError} />);
    pick();
    fireEvent.click(screen.getByTestId('upload-dialog-share'));
    await waitFor(() => expect(onError).toHaveBeenCalledWith('Could not share post'));
  });

  it('clears the draft and closes from the X, and cannot be closed while sharing', async () => {
    const { onClose } = upload();
    pick();
    fireEvent.change(screen.getByTestId('upload-dialog-caption-input'), { target: { value: 'Draft' } });
    fireEvent.click(screen.getByTestId('upload-dialog-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('upload-dialog-empty')).toBeInTheDocument();
  });

  it('ignores close while a share is in flight', async () => {
    let release: () => void = () => undefined;
    h.useMutation.mockReturnValue([vi.fn(() => new Promise<void>((r) => { release = r; })), { loading: false }]);
    const onClose = vi.fn();
    render(<UploadDialog open onClose={onClose} onSuccess={vi.fn()} onError={vi.fn()} />);
    pick();
    fireEvent.click(screen.getByTestId('upload-dialog-share'));
    await waitFor(() => expect(screen.getByTestId('upload-dialog-close')).toBeDisabled());
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
    release();
    await waitFor(() => expect(screen.getByTestId('upload-dialog-empty')).toBeInTheDocument());
  });

  it('logs nothing and shares nothing when there is no picture', () => {
    upload();
    expect(screen.queryByTestId('upload-dialog-share')).not.toBeInTheDocument();
    expect(h.muts.createPost).not.toHaveBeenCalled();
  });
});

describe('PostDialog image alt', () => {
  it('describes an uncaptioned image as a post', () => {
    dialog({ post: post({ caption: '' }) });
    expect(screen.getByAltText('post')).toHaveAttribute('src', 'https://img/p.png');
  });
});
