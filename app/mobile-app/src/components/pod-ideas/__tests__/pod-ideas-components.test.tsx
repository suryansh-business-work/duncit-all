import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import {
  IdeaCard,
  IdeaCommentRow,
  IdeaComposerSheet,
  IdeaDeleteConfirm,
  IdeaDetailsBody,
  IdeasList,
} from '@/components/pod-ideas';
import { PodIdeaStatus } from '@/generated/graphql/graphql';
import type { PodIdea, PodIdeaComment, PodIdeaDetail } from '@/hooks/usePodIdeas';
import { renderWithProviders } from '@/utils/test-utils';

const idea = (over: Partial<PodIdea> = {}): PodIdea =>
  ({
    id: '1',
    author_id: 'u1',
    title: 'Board game night',
    description: 'A cosy evening of games.',
    likes_count: 3,
    liked_by_me: false,
    shares_count: 1,
    comments_count: 2,
    status: 'APPROVED',
    created_at: new Date().toISOString(),
    author: { user_id: 'u1', full_name: 'Asha', first_name: 'Asha' },
    ...over,
  }) as PodIdea;

const cardHandlers = () => ({
  onOpen: jest.fn(),
  onLike: jest.fn(),
  onShare: jest.fn(),
  onDelete: jest.fn(),
});

describe('IdeaCard', () => {
  it('fires like/comment/share/delete for the viewer’s own idea with a status chip', () => {
    const h = cardHandlers();
    renderWithProviders(<IdeaCard idea={idea()} myId="u1" showStatus {...h} />);
    fireEvent.press(screen.getByTestId('idea-like-1'));
    fireEvent.press(screen.getByTestId('idea-comment-1'));
    fireEvent.press(screen.getByTestId('idea-share-1'));
    fireEvent.press(screen.getByTestId('idea-delete-1'));
    expect(h.onLike).toHaveBeenCalled();
    expect(h.onOpen).toHaveBeenCalled();
    expect(h.onShare).toHaveBeenCalled();
    expect(h.onDelete).toHaveBeenCalled();
    expect(screen.getByText('APPROVED')).toBeOnTheScreen();
  });

  it('hides the delete affordance for other members and falls back to a U avatar', () => {
    renderWithProviders(
      <IdeaCard idea={idea({ author: null, liked_by_me: true })} myId="me" {...cardHandlers()} />,
    );
    expect(screen.queryByTestId('idea-delete-1')).toBeNull();
    expect(screen.getByText('U')).toBeOnTheScreen();
    expect(screen.getByText('Member')).toBeOnTheScreen();
  });

  it('colours the chip for rejected and pending statuses', () => {
    const { rerender } = renderWithProviders(
      <IdeaCard idea={idea({ status: PodIdeaStatus.Rejected })} showStatus {...cardHandlers()} />,
    );
    expect(screen.getByText('REJECTED')).toBeOnTheScreen();
    rerender(
      <IdeaCard idea={idea({ status: PodIdeaStatus.Pending })} showStatus {...cardHandlers()} />,
    );
    expect(screen.getByText('PENDING')).toBeOnTheScreen();
  });
});

describe('IdeasList', () => {
  const listHandlers = () => ({
    onOpen: jest.fn(),
    onLike: jest.fn(),
    onShare: jest.fn(),
    onDelete: jest.fn(),
  });

  it('renders both sections and wires card actions', () => {
    const h = listHandlers();
    renderWithProviders(
      <IdeasList
        isLoading={false}
        hasData
        ideas={[idea({ id: '1' })]}
        myIdeas={[idea({ id: '2', status: PodIdeaStatus.Pending })]}
        myId="u1"
        {...h}
      />,
    );
    expect(screen.getByText('Your submissions')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('idea-like-1'));
    fireEvent.press(screen.getByTestId('idea-comment-1'));
    fireEvent.press(screen.getByTestId('idea-share-1'));
    fireEvent.press(screen.getByTestId('idea-delete-1'));
    expect(h.onLike).toHaveBeenCalledWith('1');
    expect(h.onShare).toHaveBeenCalled();
    expect(h.onDelete).toHaveBeenCalledWith('1');
  });

  it('shows the loading spinner before data arrives', () => {
    renderWithProviders(
      <IdeasList isLoading hasData={false} ideas={[]} myIdeas={[]} {...listHandlers()} />,
    );
    expect(screen.getByTestId('pod-ideas-loading')).toBeOnTheScreen();
  });

  it('shows the empty state once loaded with no ideas', () => {
    renderWithProviders(
      <IdeasList isLoading={false} hasData ideas={[]} myIdeas={[]} {...listHandlers()} />,
    );
    expect(screen.getByTestId('pod-ideas-empty')).toBeOnTheScreen();
  });
});

describe('IdeaComposerSheet', () => {
  it('validates, submits and closes on success', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const onClose = jest.fn();
    renderWithProviders(<IdeaComposerSheet open onClose={onClose} onSubmit={onSubmit} />);

    fireEvent.press(screen.getByTestId('idea-composer-submit'));
    expect(screen.getByTestId('idea-composer-error')).toBeOnTheScreen();

    fireEvent.changeText(screen.getByTestId('idea-title-input'), 'My idea');
    fireEvent.changeText(screen.getByTestId('idea-description-input'), 'Details here');
    fireEvent.press(screen.getByTestId('idea-composer-submit'));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(onSubmit).toHaveBeenCalledWith('My idea', 'Details here');
  });

  it('shows an error when the submit fails', async () => {
    const onSubmit = jest.fn().mockRejectedValue(new Error('nope'));
    renderWithProviders(<IdeaComposerSheet open onClose={jest.fn()} onSubmit={onSubmit} />);
    fireEvent.changeText(screen.getByTestId('idea-title-input'), 'My idea');
    fireEvent.changeText(screen.getByTestId('idea-description-input'), 'Details here');
    fireEvent.press(screen.getByTestId('idea-composer-submit'));
    await waitFor(() =>
      expect(screen.getByTestId('idea-composer-error')).toHaveTextContent(
        'Could not submit your idea. Please try again.',
      ),
    );
  });

  it('closes via the close button and ignores close while submitting', async () => {
    let resolveSubmit: () => void = () => undefined;
    const onSubmit = jest.fn(() => new Promise<void>((res) => (resolveSubmit = res)));
    const onClose = jest.fn();
    renderWithProviders(<IdeaComposerSheet open onClose={onClose} onSubmit={onSubmit} />);

    fireEvent.changeText(screen.getByTestId('idea-title-input'), 'T');
    fireEvent.changeText(screen.getByTestId('idea-description-input'), 'D');
    fireEvent.press(screen.getByTestId('idea-composer-submit'));
    // While the submit promise is pending, close is a no-op.
    fireEvent.press(screen.getByTestId('idea-composer-close'));
    expect(onClose).not.toHaveBeenCalled();
    resolveSubmit();
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('closes via the close button when idle', () => {
    const onClose = jest.fn();
    renderWithProviders(<IdeaComposerSheet open onClose={onClose} onSubmit={jest.fn()} />);
    fireEvent.press(screen.getByTestId('idea-composer-close'));
    expect(onClose).toHaveBeenCalled();
  });
});

describe('IdeaDeleteConfirm', () => {
  it('cancels and confirms when idle', () => {
    const onCancel = jest.fn();
    const onConfirm = jest.fn();
    const { rerender } = renderWithProviders(
      <IdeaDeleteConfirm open busy={false} onCancel={onCancel} onConfirm={onConfirm} />,
    );
    fireEvent.press(screen.getByTestId('idea-delete-confirm-btn'));
    expect(onConfirm).toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('idea-delete-cancel'));
    expect(onCancel).toHaveBeenCalled();

    rerender(<IdeaDeleteConfirm open busy onCancel={onCancel} onConfirm={onConfirm} />);
    fireEvent.press(screen.getByTestId('idea-delete-confirm-btn'));
    fireEvent.press(screen.getByTestId('idea-delete-cancel'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Deleting…')).toBeOnTheScreen();
  });
});

const comment = (over: Partial<PodIdeaComment> = {}): PodIdeaComment =>
  ({
    id: 'c1',
    author_id: 'me',
    text: 'Great idea',
    created_at: new Date().toISOString(),
    author: { user_id: 'me', full_name: 'Me', first_name: 'Me' },
    ...over,
  }) as PodIdeaComment;

describe('IdeaCommentRow', () => {
  it('shows a delete affordance for the viewer’s own comment', () => {
    const onDelete = jest.fn();
    renderWithProviders(<IdeaCommentRow comment={comment()} canDelete onDelete={onDelete} />);
    fireEvent.press(screen.getByTestId('idea-comment-delete-c1'));
    expect(onDelete).toHaveBeenCalled();
  });

  it('hides delete for others and falls back to Member', () => {
    renderWithProviders(
      <IdeaCommentRow comment={comment({ author: null })} canDelete={false} onDelete={jest.fn()} />,
    );
    expect(screen.queryByTestId('idea-comment-delete-c1')).toBeNull();
    expect(screen.getByText('Member')).toBeOnTheScreen();
  });
});

describe('IdeaDetailsBody', () => {
  const detail = (over: Partial<PodIdeaDetail> = {}): PodIdeaDetail =>
    ({
      ...idea(),
      comments: [comment()],
      ...over,
    }) as PodIdeaDetail;

  it('renders comments, likes and deletes a comment', () => {
    const onToggleLike = jest.fn();
    const onDeleteComment = jest.fn();
    renderWithProviders(
      <IdeaDetailsBody
        idea={detail({ likes_count: 1, shares_count: 2, liked_by_me: true })}
        myId="me"
        onToggleLike={onToggleLike}
        onDeleteComment={onDeleteComment}
      />,
    );
    expect(screen.getByText('1 like')).toBeOnTheScreen();
    expect(screen.getByText('2 shares')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('idea-details-like'));
    expect(onToggleLike).toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('idea-comment-delete-c1'));
    expect(onDeleteComment).toHaveBeenCalledWith('c1');
  });

  it('shows the empty comments state and plural/singular labels', () => {
    renderWithProviders(
      <IdeaDetailsBody
        idea={detail({ comments: [], likes_count: 2, shares_count: 1 })}
        onToggleLike={jest.fn()}
        onDeleteComment={jest.fn()}
      />,
    );
    expect(screen.getByTestId('idea-comments-empty')).toBeOnTheScreen();
    expect(screen.getByText('2 likes')).toBeOnTheScreen();
    expect(screen.getByText('1 share')).toBeOnTheScreen();
  });

  it('falls back to a U avatar and Member name when the author is missing', () => {
    renderWithProviders(
      <IdeaDetailsBody
        idea={detail({ author: null, comments: [] })}
        onToggleLike={jest.fn()}
        onDeleteComment={jest.fn()}
      />,
    );
    expect(screen.getByText('U')).toBeOnTheScreen();
    expect(screen.getByText('Member')).toBeOnTheScreen();
  });
});
