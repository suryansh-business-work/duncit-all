import { fireEvent, screen } from '@testing-library/react-native';

import { StatusVideoPreviewSheet } from '@/components/status/StatusVideoPreviewSheet';
import { renderWithProviders } from '@/utils/test-utils';

const video = (durationSeconds: number) => ({ uri: 'file://v.mp4', durationSeconds });

describe('StatusVideoPreviewSheet', () => {
  it('renders nothing while no video is pending', () => {
    renderWithProviders(
      <StatusVideoPreviewSheet video={null} onCancel={jest.fn()} onConfirm={jest.fn()} />,
    );
    expect(screen.queryByTestId('story-video-post')).toBeNull();
  });

  it('previews a short clip without trim UI and posts it as-is', () => {
    const onConfirm = jest.fn();
    renderWithProviders(
      <StatusVideoPreviewSheet video={video(12)} onCancel={jest.fn()} onConfirm={onConfirm} />,
    );
    expect(screen.getByTestId('story-video-preview')).toBeOnTheScreen();
    expect(screen.queryByTestId('story-trim-window')).toBeNull();
    expect(screen.getByText('Post story')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('story-video-post'));
    expect(onConfirm).toHaveBeenCalledWith(null);
  });

  it('requires a 15s window for a long clip and posts the picked trim', () => {
    const onConfirm = jest.fn();
    renderWithProviders(
      <StatusVideoPreviewSheet video={video(40)} onCancel={jest.fn()} onConfirm={onConfirm} />,
    );
    expect(screen.getByTestId('story-trim-window')).toHaveTextContent('0:00 – 0:15 of 0:40');
    expect(screen.getByText('Trim & Post')).toBeOnTheScreen();

    // The earlier stepper is disabled at the very start of the clip.
    fireEvent.press(screen.getByTestId('story-trim-earlier'));
    expect(screen.getByTestId('story-trim-window')).toHaveTextContent('0:00 – 0:15 of 0:40');

    fireEvent.press(screen.getByTestId('story-trim-later'));
    fireEvent.press(screen.getByTestId('story-trim-later'));
    expect(screen.getByTestId('story-trim-window')).toHaveTextContent('0:02 – 0:17 of 0:40');
    fireEvent.press(screen.getByTestId('story-trim-earlier'));
    expect(screen.getByTestId('story-trim-window')).toHaveTextContent('0:01 – 0:16 of 0:40');

    fireEvent.press(screen.getByTestId('story-video-post'));
    expect(onConfirm).toHaveBeenCalledWith({ start: 1, duration: 15 });
  });

  it('disables the later stepper once the window reaches the end of the clip', () => {
    renderWithProviders(
      <StatusVideoPreviewSheet video={video(17)} onCancel={jest.fn()} onConfirm={jest.fn()} />,
    );
    fireEvent.press(screen.getByTestId('story-trim-later'));
    fireEvent.press(screen.getByTestId('story-trim-later'));
    expect(screen.getByTestId('story-trim-window')).toHaveTextContent('0:02 – 0:17 of 0:17');
    // Clamped at the end — further presses are ignored.
    fireEvent.press(screen.getByTestId('story-trim-later'));
    expect(screen.getByTestId('story-trim-window')).toHaveTextContent('0:02 – 0:17 of 0:17');
  });

  it('cancels from the button and from the backdrop', () => {
    const onCancel = jest.fn();
    renderWithProviders(
      <StatusVideoPreviewSheet video={video(10)} onCancel={onCancel} onConfirm={jest.fn()} />,
    );
    fireEvent.press(screen.getByTestId('story-video-cancel'));
    fireEvent.press(screen.getByLabelText('Close'));
    expect(onCancel).toHaveBeenCalledTimes(2);
  });
});
