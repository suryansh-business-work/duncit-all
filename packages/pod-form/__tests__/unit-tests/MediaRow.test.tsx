import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MediaRow from '../../src/components/MediaRow';

const noop = () => undefined;

const btnFor = (iconTestId: string) => screen.getByTestId(iconTestId).closest('button') as HTMLButtonElement;

describe('MediaRow', () => {
  it('renders a video element for video URLs', () => {
    const { container } = render(
      <MediaRow url="https://a.com/clip.mp4" index={0} total={2} onReplace={noop} onMove={noop} onRemove={noop} />,
    );
    expect(container.querySelector('video')).not.toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('#1')).toBeInTheDocument();
  });

  it('renders an image element for non-video URLs', () => {
    const { container } = render(
      <MediaRow url="https://a.com/pic.jpg" index={1} total={2} onReplace={noop} onMove={noop} onRemove={noop} />,
    );
    expect(container.querySelector('img')).not.toBeNull();
    expect(container.querySelector('video')).toBeNull();
    expect(screen.getByText('#2')).toBeInTheDocument();
  });

  it('disables move-up on the first row and move-down on the last', () => {
    render(<MediaRow url="a.jpg" index={0} total={1} onReplace={noop} onMove={noop} onRemove={noop} />);
    expect(btnFor('ArrowUpwardIcon')).toBeDisabled();
    expect(btnFor('ArrowDownwardIcon')).toBeDisabled();
  });

  it('fires the reorder, replace and remove callbacks', async () => {
    const user = userEvent.setup();
    const onReplace = vi.fn();
    const onMove = vi.fn();
    const onRemove = vi.fn();
    render(
      <MediaRow url="a.jpg" index={1} total={3} onReplace={onReplace} onMove={onMove} onRemove={onRemove} />,
    );
    await user.click(btnFor('ImageIcon'));
    await user.click(btnFor('ArrowUpwardIcon'));
    await user.click(btnFor('ArrowDownwardIcon'));
    await user.click(btnFor('DeleteIcon'));
    expect(onReplace).toHaveBeenCalled();
    expect(onMove).toHaveBeenCalledWith(-1);
    expect(onMove).toHaveBeenCalledWith(1);
    expect(onRemove).toHaveBeenCalled();
  });
});
