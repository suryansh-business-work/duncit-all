/**
 * The call-recording viewer: a backdrop over the conversation, dismissed by
 * clicking away from the video it is showing.
 */
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';

import RecordingPlayer from '../src/staff-chat/RecordingPlayer';

const theme = createTheme();
const wrap = (ui: React.ReactNode) => render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

describe('RecordingPlayer', () => {
  it('shows nothing playable when there is no recording open', () => {
    const { container } = wrap(<RecordingPlayer url={null} onClose={vi.fn()} />);

    expect(container.querySelector('video')).toBeNull();
  });

  it('plays the recording, with a working download link', () => {
    const { container } = wrap(
      <RecordingPlayer url="https://cdn.duncit.com/calls/rec-1.mp4" onClose={vi.fn()} />
    );

    const video = container.querySelector('video');
    expect(video?.getAttribute('src')).toBe('https://cdn.duncit.com/calls/rec-1.mp4');
    const download = container.querySelector('a[download]');
    expect(download?.getAttribute('href')).toBe('https://cdn.duncit.com/calls/rec-1.mp4');
  });

  it('closes when the backdrop itself is clicked', () => {
    const onClose = vi.fn();
    const { container } = wrap(<RecordingPlayer url="https://cdn.duncit.com/rec.mp4" onClose={onClose} />);

    fireEvent.click(container.querySelector('.MuiBackdrop-root') as HTMLElement);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not close when the player itself is clicked, only the backdrop around it', () => {
    const onClose = vi.fn();
    const { container } = wrap(<RecordingPlayer url="https://cdn.duncit.com/rec.mp4" onClose={onClose} />);

    fireEvent.click(container.querySelector('video') as HTMLElement);

    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes through its own close button', () => {
    const onClose = vi.fn();
    const { getByLabelText } = wrap(<RecordingPlayer url="https://cdn.duncit.com/rec.mp4" onClose={onClose} />);

    fireEvent.click(getByLabelText('Close the recording'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
