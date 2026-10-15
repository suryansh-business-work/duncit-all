import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { RequestEventSheet, type RequestEventSheetProps } from '@/forms/request-event';
import { EVENT_REQUEST_NOTE_MAX } from '@/forms/request-event/request-event.types';
import { renderWithProviders } from '@/utils/test-utils';

const props = (over: Partial<RequestEventSheetProps> = {}): RequestEventSheetProps => ({
  open: true,
  body: 'Tell Turf One you would come to an event here.',
  sending: false,
  error: null,
  onClose: jest.fn(),
  onSubmit: jest.fn().mockResolvedValue(true),
  ...over,
});

describe('RequestEventSheet', () => {
  it('renders nothing while closed', () => {
    renderWithProviders(<RequestEventSheet {...props({ open: false })} />);
    expect(screen.queryByTestId('request-event-form')).toBeNull();
  });

  it('shows the line above the note and the localized labels', () => {
    renderWithProviders(<RequestEventSheet {...props()} />);
    expect(screen.getByText('Tell Turf One you would come to an event here.')).toBeOnTheScreen();
    expect(screen.getByTestId('request-event-sheet-title')).toHaveTextContent('Request an event');
    expect(screen.getByTestId('request-event-send')).toHaveAccessibleName('Send request');
    expect(screen.queryByTestId('request-event-error')).toBeNull();
  });

  it('sends an empty note, since the note is optional', async () => {
    const p = props();
    renderWithProviders(<RequestEventSheet {...p} />);
    fireEvent.press(screen.getByTestId('request-event-send'));
    await waitFor(() => expect(p.onSubmit).toHaveBeenCalledWith(''));
  });

  it('sends the trimmed note and clears it after a successful send', async () => {
    const p = props();
    renderWithProviders(<RequestEventSheet {...p} />);
    fireEvent.changeText(screen.getByTestId('field-note'), '  Friday nights  ');
    fireEvent.press(screen.getByTestId('request-event-send'));
    await waitFor(() => expect(p.onSubmit).toHaveBeenCalledWith('Friday nights'));
    await waitFor(() => expect(screen.getByTestId('field-note').props.value).toBe(''));
  });

  it('accepts a note at the limit and refuses one character more', async () => {
    const p = props();
    renderWithProviders(<RequestEventSheet {...p} />);
    fireEvent.changeText(screen.getByTestId('field-note'), 'a'.repeat(EVENT_REQUEST_NOTE_MAX + 1));
    fireEvent.press(screen.getByTestId('request-event-send'));
    await waitFor(() =>
      expect(screen.getByTestId('note-error')).toHaveTextContent(
        `Keep the note under ${EVENT_REQUEST_NOTE_MAX} characters.`,
      ),
    );
    expect(p.onSubmit).not.toHaveBeenCalled();

    fireEvent.changeText(screen.getByTestId('field-note'), 'a'.repeat(EVENT_REQUEST_NOTE_MAX));
    fireEvent.press(screen.getByTestId('request-event-send'));
    await waitFor(() =>
      expect(p.onSubmit).toHaveBeenCalledWith('a'.repeat(EVENT_REQUEST_NOTE_MAX)),
    );
  });

  it('counts the note after trimming, so surrounding spaces do not push it over', async () => {
    const p = props();
    renderWithProviders(<RequestEventSheet {...p} />);
    fireEvent.changeText(
      screen.getByTestId('field-note'),
      `  ${'b'.repeat(EVENT_REQUEST_NOTE_MAX)}  `,
    );
    fireEvent.press(screen.getByTestId('request-event-send'));
    await waitFor(() =>
      expect(p.onSubmit).toHaveBeenCalledWith('b'.repeat(EVENT_REQUEST_NOTE_MAX)),
    );
  });

  it('keeps the note and shows the failure when the send does not go through', async () => {
    const p = props({
      error: "We couldn't send your request. Please try again.",
      onSubmit: jest.fn().mockResolvedValue(false),
    });
    renderWithProviders(<RequestEventSheet {...p} />);
    expect(screen.getByTestId('request-event-error')).toHaveTextContent(
      "We couldn't send your request. Please try again.",
    );
    fireEvent.changeText(screen.getByTestId('field-note'), 'Hello');
    fireEvent.press(screen.getByTestId('request-event-send'));
    await waitFor(() => expect(p.onSubmit).toHaveBeenCalledWith('Hello'));
    expect(screen.getByTestId('field-note').props.value).toBe('Hello');
  });

  it('clears the draft when closed', () => {
    const p = props();
    renderWithProviders(<RequestEventSheet {...p} />);
    fireEvent.changeText(screen.getByTestId('field-note'), 'Draft');
    fireEvent.press(screen.getByTestId('request-event-sheet-close'));
    expect(p.onClose).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('field-note').props.value).toBe('');
  });

  it('closes from the backdrop while idle', () => {
    const p = props();
    renderWithProviders(<RequestEventSheet {...p} />);
    fireEvent.press(screen.getByTestId('request-event-sheet-backdrop'));
    expect(p.onClose).toHaveBeenCalledTimes(1);
  });

  it('locks Send and the backdrop while a request is going out', () => {
    const p = props({ sending: true });
    renderWithProviders(<RequestEventSheet {...p} />);
    const send = screen.getByTestId('request-event-send');
    expect(send).toHaveAccessibleName('Sending…');
    expect(send.props['aria-disabled']).toBe(true);
    fireEvent.press(send);
    fireEvent.press(screen.getByTestId('request-event-sheet-backdrop'));
    expect(p.onSubmit).not.toHaveBeenCalled();
    expect(p.onClose).not.toHaveBeenCalled();
  });
});
