import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { RentalProofSheet } from '@/components/venue-rentals-desk/detail/RentalProofSheet';
import { renderWithProviders } from '@/utils/test-utils';

// The photo picker/upload has its own spec; the stand-in "uploads" one photo per press
// and shows the field's error, so the form's photo rules can be driven from here.
jest.mock('@/components/create-pod/MediaUploadField/MediaUploadField', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native');
  let uploads = 0;
  const nextUrl = () => {
    uploads += 1;
    return `http://x/p${uploads}.jpg`;
  };
  return {
    MediaUploadField: ({
      value,
      onChange,
      error,
    }: {
      value: string;
      onChange: (text: string) => void;
      error?: string;
    }) => (
      <Text testID="stub-media-upload" onPress={() => onChange(`${value}\n${nextUrl()}`)}>
        {error ?? ''}
      </Text>
    ),
  };
});

const open = (onSave = jest.fn().mockResolvedValue(undefined), onClose = jest.fn()) => {
  renderWithProviders(<RentalProofSheet name="Racket" onClose={onClose} onSave={onSave} />);
  return { onSave, onClose };
};

describe('RentalProofSheet', () => {
  it('asks for a note or a photo before saving anything — a blank note counts as none', async () => {
    const { onSave } = open();
    expect(screen.getByText('Add proof for Racket')).toBeOnTheScreen();
    fireEvent.changeText(screen.getByTestId('field-note'), '    ');
    fireEvent.press(screen.getByTestId('rental-proof-save'));
    expect(await screen.findByText('Add a note or at least one photo')).toBeOnTheScreen();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('saves a note alone, trimmed, with no photos, and closes', async () => {
    const { onSave, onClose } = open();
    fireEvent.changeText(screen.getByTestId('field-note'), '  Strings snapped on return  ');
    fireEvent.press(screen.getByTestId('rental-proof-save'));
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({ note: 'Strings snapped on return', image_urls: [] }),
    );
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('refuses a note over the server’s 1000 characters', async () => {
    const { onSave } = open();
    fireEvent.changeText(screen.getByTestId('field-note'), 'a'.repeat(1001));
    fireEvent.press(screen.getByTestId('rental-proof-save'));
    expect(await screen.findByText(/Keep the note under 1,?000 characters/)).toBeOnTheScreen();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('refuses a seventh photo', async () => {
    const { onSave } = open();
    for (let i = 0; i < 7; i += 1) fireEvent.press(screen.getByTestId('stub-media-upload'));
    fireEvent.press(screen.getByTestId('rental-proof-save'));
    await waitFor(() =>
      expect(screen.getByTestId('stub-media-upload')).toHaveTextContent('Add at most 6 photos'),
    );
    expect(onSave).not.toHaveBeenCalled();
  });

  it('keeps the sheet open with the server’s refusal', async () => {
    const { onClose } = open(jest.fn().mockRejectedValue(new Error('Not your venue')));
    fireEvent.press(screen.getByTestId('stub-media-upload'));
    fireEvent.press(screen.getByTestId('rental-proof-save'));
    await waitFor(() =>
      expect(screen.getByTestId('rental-proof-error')).toHaveTextContent('Not your venue'),
    );
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByTestId('rental-proof-sheet')).toBeOnTheScreen();
  });

  it('Cancel closes without saving', () => {
    const { onSave, onClose } = open();
    fireEvent.press(screen.getByTestId('rental-proof-cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });
});
