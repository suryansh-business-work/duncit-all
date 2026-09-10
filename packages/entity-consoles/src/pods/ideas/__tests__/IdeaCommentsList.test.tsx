import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import IdeaCommentsList from '../IdeaCommentsList';

const onDelete = vi.fn();

const makeComment = (over: Record<string, unknown> = {}) => ({
  id: 'c1',
  author_id: 'u1',
  text: 'Great idea, count me in!',
  created_at: '2026-03-04T10:15:00.000Z',
  author: { user_id: 'u1', full_name: 'Asha Rao', email: 'asha@example.com' },
  ...over,
});

describe('IdeaCommentsList', () => {
  beforeEach(() => {
    onDelete.mockReset();
  });

  it('shows "No comments yet." when there are none', () => {
    render(<IdeaCommentsList comments={[]} onDelete={onDelete} />);
    expect(screen.getByText('No comments yet.')).toBeInTheDocument();
  });

  it('renders each comment with its author name, an uppercased avatar initial and the text', () => {
    render(<IdeaCommentsList comments={[makeComment()]} onDelete={onDelete} />);
    expect(screen.queryByText('No comments yet.')).not.toBeInTheDocument();
    expect(screen.getByText('Asha Rao')).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('Great idea, count me in!')).toBeInTheDocument();
  });

  it('falls back to "Member" and a "U" avatar when the comment has no author', () => {
    render(<IdeaCommentsList comments={[makeComment({ id: 'c2', author: null })]} onDelete={onDelete} />);
    expect(screen.getByText('Member')).toBeInTheDocument();
    expect(screen.getByText('U')).toBeInTheDocument();
  });

  it('renders one row per comment, keyed by its own id, and wires delete to that comment', () => {
    render(
      <IdeaCommentsList
        comments={[makeComment({ id: 'c1', text: 'First' }), makeComment({ id: 'c2', text: 'Second' })]}
        onDelete={onDelete}
      />,
    );
    expect(screen.getByText('First')).toBeInTheDocument();
    const deleteButtons = screen.getAllByRole('button');
    expect(deleteButtons).toHaveLength(2);
    fireEvent.click(deleteButtons[1]);
    expect(onDelete).toHaveBeenCalledWith('c2');
  });
});
