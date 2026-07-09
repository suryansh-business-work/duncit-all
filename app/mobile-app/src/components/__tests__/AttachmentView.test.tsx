import { Linking } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';

import { AttachmentView } from '@/components/AttachmentView';
import { renderWithProviders } from '@/utils/test-utils';

describe('AttachmentView', () => {
  it('renders nothing when there are no attachments', () => {
    renderWithProviders(<AttachmentView urls={[]} />);
    // No image, video or document card is rendered.
    expect(screen.queryByLabelText(/^Open /)).toBeNull();
  });

  it('renders an image thumbnail, a video card and a document card, and opens a file', () => {
    const spy = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);
    renderWithProviders(
      <AttachmentView
        urls={['https://x/photo.png', 'https://x/clip.mp4', 'https://x/report.pdf']}
      />,
    );
    // Video + document render as tappable cards with their file names.
    expect(screen.getByText('clip.mp4')).toBeOnTheScreen();
    expect(screen.getByText('report.pdf')).toBeOnTheScreen();
    expect(screen.getByText('PDF')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('support-attach-https://x/report.pdf'));
    expect(spy).toHaveBeenCalledWith('https://x/report.pdf');
    fireEvent.press(screen.getByTestId('support-attach-https://x/clip.mp4'));
    expect(spy).toHaveBeenCalledWith('https://x/clip.mp4');
    spy.mockRestore();
  });
});
