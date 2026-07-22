import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import HomeStatusTile, { STORY_RING_GRADIENT } from '../HomeStatusTile';

describe('HomeStatusTile', () => {
  it('exports a story ring gradient constant', () => {
    expect(STORY_RING_GRADIENT).toContain('linear-gradient');
  });

  it('renders the label and fires onClick', () => {
    const onClick = vi.fn();
    render(<HomeStatusTile label="Asha" imageUrl="http://x/1.jpg" onClick={onClick} />);
    const btn = screen.getByRole('button');
    expect(screen.getByText('Asha')).toBeInTheDocument();
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders an image when imageUrl is provided', () => {
    render(<HomeStatusTile label="Asha" imageUrl="http://x/1.jpg" onClick={vi.fn()} />);
    const img = screen.getByRole('img', { name: 'Asha' });
    expect(img).toHaveAttribute('src', 'http://x/1.jpg');
  });

  it('falls back to an avatar with provided initials when no image', () => {
    render(<HomeStatusTile label="Asha" initials="AK" onClick={vi.fn()} />);
    expect(screen.getByText('AK')).toBeInTheDocument();
  });

  it('derives initials from the label when none provided', () => {
    render(<HomeStatusTile label="ravi" onClick={vi.fn()} />);
    // first char uppercased
    expect(screen.getByText('R')).toBeInTheDocument();
  });

  it('renders a video when videoUrl is provided (takes priority over image)', () => {
    const { container } = render(
      <HomeStatusTile label="Vid" imageUrl="http://x/1.jpg" videoUrl="http://x/1.mp4" onClick={vi.fn()} />,
    );
    const video = container.querySelector('video');
    expect(video).toBeTruthy();
    expect(video).toHaveAttribute('src', 'http://x/1.mp4');
    // image branch should not render since video wins
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('renders an add tile with the plus icon', () => {
    render(<HomeStatusTile label="Add" add onClick={vi.fn()} />);
    // AddIcon is an svg; it renders inside the button
    const btn = screen.getByRole('button');
    expect(btn.querySelector('svg')).toBeTruthy();
    expect(screen.getByText('Add')).toBeInTheDocument();
  });

  it('renders a seen (inactive) tile without the add affordance', () => {
    render(<HomeStatusTile label="Seen" active={false} onClick={vi.fn()} />);
    expect(screen.getByText('Seen')).toBeInTheDocument();
  });
});
