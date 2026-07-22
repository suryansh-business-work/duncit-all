import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import IdeaCard from '../IdeaCard';

const baseIdea = (over: Record<string, unknown> = {}) => ({
  author_id: 'author-1',
  author: {
    profile_photo: 'https://example.com/p.jpg',
    first_name: 'Alice',
    full_name: 'Alice Wonder',
  },
  created_at: new Date().toISOString(),
  status: 'APPROVED',
  idea_no: 'IDEA-001',
  super_category_name: 'For You',
  category_name: 'Sports',
  sub_category_name: 'Badminton',
  title: 'My great idea',
  description: 'A long description of the idea',
  liked_by_me: false,
  likes_count: 3,
  comments_count: 2,
  shares_count: 1,
  ...over,
});

const renderCard = (idea: Record<string, unknown>, props: Record<string, unknown> = {}) => {
  const onOpen = vi.fn();
  const onLike = vi.fn();
  const onShare = vi.fn();
  const onDelete = vi.fn();
  render(
    <IdeaCard
      idea={idea}
      onOpen={onOpen}
      onLike={onLike}
      onShare={onShare}
      onDelete={onDelete}
      {...props}
    />,
  );
  return { onOpen, onLike, onShare, onDelete };
};

describe('IdeaCard', () => {
  it('renders idea content, author, counts and category path', () => {
    renderCard(baseIdea());
    expect(screen.getByText('My great idea')).toBeInTheDocument();
    expect(screen.getByText('A long description of the idea')).toBeInTheDocument();
    expect(screen.getByText('Alice Wonder')).toBeInTheDocument();
    expect(screen.getByText('IDEA-001')).toBeInTheDocument();
    expect(screen.getByText('For You › Sports › Badminton')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('fires open, like and share handlers', () => {
    const { onOpen, onLike, onShare } = renderCard(baseIdea());
    fireEvent.click(screen.getByText('My great idea'));
    expect(onOpen).toHaveBeenCalled();
    fireEvent.click(screen.getByText('3'));
    expect(onLike).toHaveBeenCalled();
    fireEvent.click(screen.getByText('1'));
    expect(onShare).toHaveBeenCalled();
  });

  it('shows delete only for the owner and fires onDelete', () => {
    const { onDelete } = renderCard(baseIdea(), { myId: 'author-1' });
    const delBtn = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(delBtn);
    expect(onDelete).toHaveBeenCalled();
  });

  it('hides delete when not the owner', () => {
    renderCard(baseIdea(), { myId: 'someone-else' });
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  });

  it('shows status chip when showStatus is set (rejected -> error color)', () => {
    renderCard(baseIdea({ status: 'REJECTED' }), { showStatus: true });
    expect(screen.getByText('REJECTED')).toBeInTheDocument();
  });

  it('renders pending status color path and liked state', () => {
    renderCard(baseIdea({ status: 'PENDING', liked_by_me: true }), { showStatus: true });
    expect(screen.getByText('PENDING')).toBeInTheDocument();
  });

  it('falls back to Member and initial U when author info is missing', () => {
    renderCard(
      baseIdea({
        author: null,
        idea_no: null,
        super_category_name: null,
        category_name: null,
        sub_category_name: null,
      }),
    );
    expect(screen.getByText('Member')).toBeInTheDocument();
    expect(screen.getByText('U')).toBeInTheDocument();
    expect(screen.queryByText('For You › Sports › Badminton')).not.toBeInTheDocument();
  });

  it('uses full_name initial when first_name is absent', () => {
    renderCard(baseIdea({ author: { full_name: 'Zed Master' } }));
    expect(screen.getByText('Z')).toBeInTheDocument();
  });
});
