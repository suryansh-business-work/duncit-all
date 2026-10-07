import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { RequestPodSheet, type RequestPodSheetProps } from '@/forms/request-pod';
import { renderWithProviders } from '@/utils/test-utils';

const props = (over: Partial<RequestPodSheetProps> = {}): RequestPodSheetProps => ({
  targetName: 'Asha',
  sending: false,
  error: null,
  onClose: jest.fn(),
  onSubmit: jest.fn().mockResolvedValue(true),
  ...over,
});

describe('RequestPodSheet', () => {
  it('stays closed with no target', () => {
    renderWithProviders(<RequestPodSheet {...props({ targetName: null })} />);
    expect(screen.queryByTestId('request-pod-form')).toBeNull();
  });

  it('sends an empty note (it is optional) and clears after a successful send', async () => {
    const p = props();
    renderWithProviders(<RequestPodSheet {...p} />);
    expect(screen.getByText('Asha')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('request-pod-send'));
    await waitFor(() => expect(p.onSubmit).toHaveBeenCalledWith(''));
  });

  it('sends the trimmed note', async () => {
    const p = props();
    renderWithProviders(<RequestPodSheet {...p} />);
    fireEvent.changeText(screen.getByTestId('field-note'), '  Weekend yoga?  ');
    fireEvent.press(screen.getByTestId('request-pod-send'));
    await waitFor(() => expect(p.onSubmit).toHaveBeenCalledWith('Weekend yoga?'));
  });

  it('accepts a note of exactly 500 characters and refuses 501', async () => {
    const p = props();
    renderWithProviders(<RequestPodSheet {...p} />);
    fireEvent.changeText(screen.getByTestId('field-note'), 'a'.repeat(501));
    fireEvent.press(screen.getByTestId('request-pod-send'));
    await waitFor(() =>
      expect(screen.getByTestId('note-error')).toHaveTextContent(
        'Keep the note under 500 characters.',
      ),
    );
    expect(p.onSubmit).not.toHaveBeenCalled();

    fireEvent.changeText(screen.getByTestId('field-note'), 'a'.repeat(500));
    fireEvent.press(screen.getByTestId('request-pod-send'));
    await waitFor(() => expect(p.onSubmit).toHaveBeenCalledWith('a'.repeat(500)));
  });

  it("keeps the note when the server refuses, and shows the server's message", async () => {
    const p = props({
      error: 'You have used all your Pod Requests for this month.',
      onSubmit: jest.fn().mockResolvedValue(false),
    });
    renderWithProviders(<RequestPodSheet {...p} />);
    expect(screen.getByTestId('request-pod-error')).toHaveTextContent(
      'You have used all your Pod Requests for this month.',
    );
    fireEvent.changeText(screen.getByTestId('field-note'), 'Hello');
    fireEvent.press(screen.getByTestId('request-pod-send'));
    await waitFor(() => expect(p.onSubmit).toHaveBeenCalledWith('Hello'));
    expect(screen.getByTestId('field-note').props.value).toBe('Hello');
  });

  it('clears the note when closed', () => {
    const p = props();
    renderWithProviders(<RequestPodSheet {...p} />);
    fireEvent.changeText(screen.getByTestId('field-note'), 'Draft');
    fireEvent.press(screen.getByTestId('request-pod-sheet-close'));
    expect(p.onClose).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('field-note').props.value).toBe('');
  });

  it('locks Send while a request is going out', () => {
    renderWithProviders(<RequestPodSheet {...props({ sending: true })} />);
    expect(screen.getByTestId('request-pod-send').props['aria-disabled']).toBe(true);
  });
});
