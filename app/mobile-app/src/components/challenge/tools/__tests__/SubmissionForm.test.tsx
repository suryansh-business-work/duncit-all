import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { SubmissionForm } from '@/components/challenge/tools/SubmissionForm';
import type { EntryPick } from '@/hooks/useEntryPicker';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useTranslation', () => {
  const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
    options?.vars ? `${key}|${Object.values(options.vars).join(',')}` : key;
  return { useTranslation: () => ({ t }) };
});

const mockPicker: {
  fromLibrary: (() => Promise<EntryPick>) | null;
  fromFiles: (() => Promise<EntryPick>) | null;
} = { fromLibrary: null, fromFiles: null };
jest.mock('@/hooks/useEntryPicker', () => ({ useEntryPicker: () => mockPicker }));

const FILE = { uri: 'file:///a.jpg', name: 'a.jpg', type: 'image/jpeg' };
const TID = 'sub';
const COMPETITORS = [
  { competitor_id: 'c1', name: 'Team Red' },
  { competitor_id: 'c2', name: 'Team Blue' },
];

const setup = (props: Partial<React.ComponentProps<typeof SubmissionForm>> = {}) => {
  const onSubmit = jest.fn().mockResolvedValue(true);
  renderWithProviders(
    <SubmissionForm
      testID={TID}
      accepted={['IMAGE']}
      allowCaption
      replacing={false}
      saving={false}
      onSubmit={onSubmit}
      {...props}
    />,
  );
  return { onSubmit };
};

const press = async (testID: string) =>
  act(async () => {
    fireEvent.press(screen.getByTestId(testID));
  });

beforeEach(() => {
  mockPicker.fromLibrary = jest.fn().mockResolvedValue({ file: FILE });
  mockPicker.fromFiles = null;
});

describe('SubmissionForm — picking', () => {
  it('offers the library only when the tool takes photos or videos, audio only when it takes audio', () => {
    setup();
    expect(screen.getByTestId(`${TID}-pick-media`)).toBeOnTheScreen();
    expect(screen.queryByTestId(`${TID}-pick-audio`)).toBeNull();
  });

  it('offers the files app for audio', () => {
    mockPicker.fromLibrary = null;
    mockPicker.fromFiles = jest
      .fn()
      .mockResolvedValue({ file: { ...FILE, name: 's.mp3', type: 'audio/mpeg' } });
    setup({ accepted: ['AUDIO'] });
    expect(screen.queryByTestId(`${TID}-pick-media`)).toBeNull();
    expect(screen.getByTestId(`${TID}-pick-audio`)).toBeOnTheScreen();
  });

  it('shows the chosen file name after a pick from the library', async () => {
    setup();
    await press(`${TID}-pick-media`);
    expect(await screen.findByText('mweb.challenge.tools.fileChosen|a.jpg')).toBeOnTheScreen();
  });

  it('shows the chosen file name after a pick from the files app', async () => {
    mockPicker.fromLibrary = null;
    mockPicker.fromFiles = jest
      .fn()
      .mockResolvedValue({ file: { ...FILE, name: 's.mp3', type: 'audio/mpeg' } });
    setup({ accepted: ['AUDIO'] });
    await press(`${TID}-pick-audio`);
    expect(await screen.findByText('mweb.challenge.tools.fileChosen|s.mp3')).toBeOnTheScreen();
  });

  it('shows the refusal of a pick and keeps no file', async () => {
    mockPicker.fromLibrary = jest.fn().mockResolvedValue({ error: 'too big' });
    setup();
    await press(`${TID}-pick-media`);
    expect(await screen.findByText('too big')).toBeOnTheScreen();
    expect(screen.queryByText(/fileChosen/)).toBeNull();
  });

  it('keeps the screen as it was when the pick is cancelled', async () => {
    mockPicker.fromLibrary = jest.fn().mockResolvedValue(null);
    setup();
    await press(`${TID}-pick-media`);
    expect(screen.queryByText(/fileChosen/)).toBeNull();
    expect(screen.queryByText('mweb.challenge.tools.errors.file')).toBeNull();
  });

  it('clears an earlier refusal once a good file is picked', async () => {
    mockPicker.fromLibrary = jest
      .fn()
      .mockResolvedValueOnce({ error: 'too big' })
      .mockResolvedValueOnce({ file: FILE });
    setup();
    await press(`${TID}-pick-media`);
    expect(await screen.findByText('too big')).toBeOnTheScreen();
    await press(`${TID}-pick-media`);
    await waitFor(() => expect(screen.queryByText('too big')).toBeNull());
    expect(screen.getByText('mweb.challenge.tools.fileChosen|a.jpg')).toBeOnTheScreen();
  });
});

describe('SubmissionForm — sending', () => {
  it('sends the file and the typed caption, then clears the form when saved', async () => {
    const { onSubmit } = setup();
    await press(`${TID}-pick-media`);
    fireEvent.changeText(screen.getByLabelText('mweb.challenge.tools.caption'), '  My piece ');
    await press(`${TID}-submit`);
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toEqual({
      file: FILE,
      caption: 'My piece',
      competitor_id: '',
    });
    await waitFor(() => expect(screen.queryByText(/fileChosen/)).toBeNull());
  });

  it('keeps the form filled when the upload did not go through', async () => {
    const { onSubmit } = setup();
    onSubmit.mockResolvedValue(false);
    await press(`${TID}-pick-media`);
    await press(`${TID}-submit`);
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(screen.getByText('mweb.challenge.tools.fileChosen|a.jpg')).toBeOnTheScreen();
  });

  it('refuses to send without a file and says so', async () => {
    const { onSubmit } = setup();
    await press(`${TID}-submit`);
    expect(await screen.findByText('mweb.challenge.tools.errors.file')).toBeOnTheScreen();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('has no caption field when the tool switches captions off', () => {
    setup({ allowCaption: false });
    expect(screen.queryByLabelText('mweb.challenge.tools.caption')).toBeNull();
  });

  it('words the button for a first piece', () => {
    setup();
    expect(screen.getByText('mweb.challenge.tools.submit')).toBeOnTheScreen();
  });

  it('words the button as a replacement when the competitor already has an entry', () => {
    setup({ replacing: true });
    expect(screen.getByText('mweb.challenge.tools.submitReplace')).toBeOnTheScreen();
  });

  it('shows the uploading label and disables the buttons while saving', () => {
    setup({ saving: true });
    expect(screen.getByText('mweb.challenge.tools.uploading')).toBeOnTheScreen();
    expect(screen.getByTestId(`${TID}-submit`)).toBeDisabled();
    expect(screen.getByTestId(`${TID}-pick-media`)).toBeDisabled();
  });
});

describe('SubmissionForm — a host submitting for a competitor', () => {
  it('lists the competitors and sends the one picked', async () => {
    const { onSubmit } = setup({ competitors: COMPETITORS });
    expect(screen.getByText('Team Red')).toBeOnTheScreen();
    expect(screen.getByText('Team Blue')).toBeOnTheScreen();
    await press(`${TID}-pick-media`);
    await act(async () => {
      fireEvent.press(screen.getByText('Team Blue'));
    });
    await press(`${TID}-submit`);
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ competitor_id: 'c2', file: FILE });
  });

  it('asks the host to pick a competitor before sending', async () => {
    const { onSubmit } = setup({ competitors: COMPETITORS });
    await press(`${TID}-pick-media`);
    await press(`${TID}-submit`);
    expect(await screen.findByText('mweb.challenge.errors.pickCompetitor')).toBeOnTheScreen();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows no competitor list to a competitor submitting their own piece', () => {
    setup();
    expect(screen.queryByText('mweb.challenge.judgeCompetitor')).toBeNull();
  });
});
