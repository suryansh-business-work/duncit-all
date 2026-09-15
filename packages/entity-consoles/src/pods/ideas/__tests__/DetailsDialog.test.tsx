import type { ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { renderWithProviders } from '../../../../__tests__/testkit';
import DetailsDialog from '../DetailsDialog';
import { DELETE_COMMENT, POD_IDEA_DETAILS, SET_STATUS } from '../queries';

const onClose = vi.fn();
const onChanged = vi.fn();

afterEach(() => {
  onClose.mockReset();
  onChanged.mockReset();
});

const makeComment = (over: Record<string, unknown> = {}) => ({
  __typename: 'PodIdeaComment',
  id: 'c1',
  author_id: 'u2',
  text: 'Count me in for Catan!',
  created_at: '2026-03-05T18:30:00.000Z',
  author: { __typename: 'PodIdeaAuthor', user_id: 'u2', full_name: 'Kabir Shah', email: 'kabir@duncit.com' },
  ...over,
});

const makeIdea = (over: Record<string, unknown> = {}) => ({
  __typename: 'PodIdea',
  id: 'idea-1',
  author_id: 'u1',
  title: 'Sunday board games',
  description: 'Catan and Codenames at the cafe',
  likes_count: 12,
  shares_count: 3,
  comments_count: 1,
  status: 'PENDING',
  created_at: '2026-03-04T10:15:00.000Z',
  author: {
    __typename: 'PodIdeaAuthor',
    user_id: 'u1',
    full_name: 'asha rao',
    email: 'asha@duncit.com',
    profile_photo: 'https://ik.imagekit.io/duncit/asha.jpg',
  },
  comments: [makeComment()],
  ...over,
});

const detailsMock = (podIdea: unknown, delay?: number): MockedResponse => ({
  request: { query: POD_IDEA_DETAILS, variables: { id: 'idea-1' } },
  delay,
  result: { data: { podIdea } },
});

/** A fade-out long enough that the closing confirm is still on screen for a second click. */
const slowExitTheme = createTheme({ transitions: { duration: { leavingScreen: 60_000 } } });

const renderDialog = (mocks: MockedResponse[], wrap: (ui: ReactElement) => ReactElement = (ui) => ui) =>
  renderWithProviders(wrap(<DetailsDialog id="idea-1" onClose={onClose} onChanged={onChanged} />), { mocks });

const deleteIconButton = () => {
  const button = screen.getByTestId('DeleteIcon').closest('button');
  expect(button).not.toBeNull();
  return button as HTMLButtonElement;
};

describe('DetailsDialog / loading and empty', () => {
  it('shows a spinner under the generic title while the idea loads', async () => {
    renderDialog([detailsMock(makeIdea(), 30)]);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByText('Pod idea')).toBeInTheDocument();
    expect(await screen.findByText('Sunday board games')).toBeInTheDocument();
    expect(screen.queryByText('Pod idea')).not.toBeInTheDocument();
  });

  it('says the idea was not found and offers no status actions when it resolves empty', async () => {
    renderDialog([detailsMock(null)]);
    expect(await screen.findByText('Idea not found.')).toBeInTheDocument();
    expect(screen.getByText('Pod idea')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });
});

describe('DetailsDialog / idea content', () => {
  it('renders the author, description, engagement counts, status chip and comments', async () => {
    renderDialog([detailsMock(makeIdea())]);
    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByText('Sunday board games')).toBeInTheDocument();
    expect(within(dialog).getByText('PENDING')).toBeInTheDocument();
    expect(within(dialog).getByText('asha rao')).toBeInTheDocument();
    expect(within(dialog).getByText(/^asha@duncit\.com · /)).toBeInTheDocument();
    // The avatar is decorative (alt=""), so it has no img role — the author's name sits beside it.
    expect(dialog.querySelector('img')).toHaveAttribute('src', 'https://ik.imagekit.io/duncit/asha.jpg');
    expect(within(dialog).getByText('Catan and Codenames at the cafe')).toBeInTheDocument();
    expect(within(dialog).getByText('12 likes')).toBeInTheDocument();
    expect(within(dialog).getByText('1 comments')).toBeInTheDocument();
    expect(within(dialog).getByText('3 shares')).toBeInTheDocument();
    expect(within(dialog).getByText('Count me in for Catan!')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Reject' })).toBeInTheDocument();
  });

  it('uppercases the author initial when there is no photo to show', async () => {
    renderDialog([detailsMock(makeIdea({ author: { ...makeIdea().author, profile_photo: null }, comments: [] }))]);
    expect(await screen.findByText('A')).toBeInTheDocument();
    expect(document.body.querySelector('img')).toBeNull();
  });

  it('falls back to "Member", a "U" initial and no email when the idea has no author', async () => {
    renderDialog([detailsMock(makeIdea({ author: null, comments: [] }))]);
    expect(await screen.findByText('Member')).toBeInTheDocument();
    expect(screen.getByText('U')).toBeInTheDocument();
    expect(screen.getByText(/^· /)).toBeInTheDocument();
    expect(screen.queryByText(/@duncit\.com/)).not.toBeInTheDocument();
  });

  it('falls back the same way when the author has no name, email or photo', async () => {
    const author = { __typename: 'PodIdeaAuthor', user_id: 'u1', full_name: null, email: null, profile_photo: null };
    renderDialog([detailsMock(makeIdea({ author, comments: [] }))]);
    expect(await screen.findByText('Member')).toBeInTheDocument();
    expect(screen.getByText('U')).toBeInTheDocument();
    expect(screen.getByText(/^· /)).toBeInTheDocument();
    expect(screen.queryByText(/@duncit\.com/)).not.toBeInTheDocument();
  });
});

describe('DetailsDialog / status actions', () => {
  it('approving sets the status, refetches the idea and tells the page it changed', async () => {
    const setStatus: MockedResponse = {
      request: { query: SET_STATUS, variables: { id: 'idea-1', status: 'APPROVED' } },
      result: { data: { setPodIdeaStatus: { __typename: 'PodIdea', id: 'idea-1', status: 'APPROVED' } } },
    };
    renderDialog([detailsMock(makeIdea()), setStatus, detailsMock(makeIdea({ status: 'APPROVED' }))]);

    fireEvent.click(await screen.findByRole('button', { name: 'Approve' }));

    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
    expect(screen.getByText('APPROVED')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reset to Pending' })).toBeInTheDocument();
  });

  it('closes through the Close action', async () => {
    renderDialog([detailsMock(makeIdea())]);
    fireEvent.click(await screen.findByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('DetailsDialog / deleting a comment', () => {
  it('asks before deleting, and Cancel or Escape backs out keeping the comment', async () => {
    renderDialog([detailsMock(makeIdea())]);
    await screen.findByText('Count me in for Catan!');

    fireEvent.click(deleteIconButton());
    const confirm = await screen.findByRole('dialog', { name: 'Delete this comment?' });
    expect(within(confirm).getByText(/permanently removes the comment/)).toBeInTheDocument();
    fireEvent.click(within(confirm).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Delete this comment?' })).not.toBeInTheDocument());

    fireEvent.click(deleteIconButton());
    const again = await screen.findByRole('dialog', { name: 'Delete this comment?' });
    fireEvent.keyDown(again, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Delete this comment?' })).not.toBeInTheDocument());

    expect(screen.getByText('Count me in for Catan!')).toBeInTheDocument();
    expect(onChanged).not.toHaveBeenCalled();
  });

  it('holds the confirm open while deleting, then removes the comment and reports the change', async () => {
    const deleteComment: MockedResponse = {
      request: { query: DELETE_COMMENT, variables: { id: 'idea-1', commentId: 'c1' } },
      delay: 80,
      result: { data: { deletePodIdeaComment: { __typename: 'PodIdea', id: 'idea-1', comments_count: 0 } } },
    };
    renderDialog([
      detailsMock(makeIdea()),
      deleteComment,
      detailsMock(makeIdea({ comments_count: 0, comments: [] })),
    ]);
    await screen.findByText('Count me in for Catan!');

    fireEvent.click(deleteIconButton());
    const confirm = await screen.findByRole('dialog', { name: 'Delete this comment?' });
    fireEvent.click(within(confirm).getByRole('button', { name: 'Delete' }));

    expect(await within(confirm).findByText('Deleting…')).toBeInTheDocument();
    expect(within(confirm).getByRole('button', { name: 'Cancel' })).toBeDisabled();
    fireEvent.keyDown(confirm, { key: 'Escape' });
    expect(screen.getByRole('dialog', { name: 'Delete this comment?' })).toBeInTheDocument();

    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('No comments yet.')).toBeInTheDocument();
    expect(screen.getByText('0 comments')).toBeInTheDocument();
  });

  it('ignores a second Delete click while the closed confirm is still fading out', async () => {
    const deleteResult = vi.fn(() => ({
      data: { deletePodIdeaComment: { __typename: 'PodIdea', id: 'idea-1', comments_count: 0 } },
    }));
    const deleteComment: MockedResponse = {
      request: { query: DELETE_COMMENT, variables: () => true },
      maxUsageCount: 2,
      result: deleteResult,
    };
    const setStatus: MockedResponse = {
      request: { query: SET_STATUS, variables: { id: 'idea-1', status: 'APPROVED' } },
      result: { data: { setPodIdeaStatus: { __typename: 'PodIdea', id: 'idea-1', status: 'APPROVED' } } },
    };
    const withoutComments = { comments_count: 0, comments: [] };
    renderDialog(
      [
        detailsMock(makeIdea()),
        deleteComment,
        detailsMock(makeIdea(withoutComments)),
        setStatus,
        detailsMock(makeIdea({ ...withoutComments, status: 'APPROVED' })),
      ],
      (ui) => <ThemeProvider theme={slowExitTheme}>{ui}</ThemeProvider>,
    );
    await screen.findByText('Count me in for Catan!');

    fireEvent.click(deleteIconButton());
    const confirm = await screen.findByRole('dialog', { name: 'Delete this comment?' });
    const deleteButton = within(confirm).getByRole('button', { name: 'Delete' });
    fireEvent.click(deleteButton);
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(deleteButton).toBeEnabled());

    fireEvent.click(deleteButton);
    // A delete that started would have flipped the label to "Deleting…" on the spot. The
    // handler is async, so DuncitButton may still flash its own press spinner — let it settle.
    expect(deleteButton).toHaveTextContent('Delete');
    await waitFor(() => expect(deleteButton).toBeEnabled());

    // The mock link answers requests in the order they were sent, so once this
    // later approval has landed, a delete sent by the click above would have too.
    fireEvent.click(screen.getByRole('button', { name: 'Approve', hidden: true }));
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(2));

    expect(screen.getByText('No comments yet.')).toBeInTheDocument();
    expect(deleteResult).toHaveBeenCalledTimes(1);
  });
});
