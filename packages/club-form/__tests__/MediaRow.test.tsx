import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MediaRow from '../src/components/MediaRow';

const btn = (testId: string) => screen.getByTestId(testId).closest('button') as HTMLButtonElement;

function setup(overrides: Partial<Parameters<typeof MediaRow>[0]> = {}) {
  const props = {
    url: 'https://x/a.jpg',
    index: 1,
    total: 3,
    onReplace: vi.fn(),
    onMove: vi.fn(),
    onRemove: vi.fn(),
    ...overrides,
  };
  render(<MediaRow {...props} />);
  return props;
}

describe('MediaRow', () => {
  it('renders an image thumbnail for an image URL and the 1-based index', () => {
    setup({ url: 'https://x/a.jpg', index: 0, total: 2 });
    const img = document.querySelector('img');
    expect(img).toHaveAttribute('src', 'https://x/a.jpg');
    expect(screen.getByText('#1')).toBeInTheDocument();
  });

  it('renders a video thumbnail for a video URL (with query string)', () => {
    setup({ url: 'https://x/b.mp4?token=1', index: 1, total: 2 });
    const video = document.querySelector('video');
    expect(video).toHaveAttribute('src', 'https://x/b.mp4?token=1');
  });

  it('disables move-up on the first row and move-down on the last row', () => {
    setup({ index: 0, total: 1 });
    expect(btn('ArrowUpwardIcon')).toBeDisabled();
    expect(btn('ArrowDownwardIcon')).toBeDisabled();
  });

  it('fires replace/move/remove callbacks for a middle row', async () => {
    const user = userEvent.setup();
    const props = setup({ index: 1, total: 3 });

    await user.click(btn('ImageIcon'));
    expect(props.onReplace).toHaveBeenCalled();

    await user.click(btn('ArrowUpwardIcon'));
    expect(props.onMove).toHaveBeenCalledWith(-1);

    await user.click(btn('ArrowDownwardIcon'));
    expect(props.onMove).toHaveBeenCalledWith(1);

    await user.click(btn('DeleteIcon'));
    expect(props.onRemove).toHaveBeenCalled();
  });
});
