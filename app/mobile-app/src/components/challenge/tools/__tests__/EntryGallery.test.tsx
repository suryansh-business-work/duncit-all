import { Linking } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';
import type { ChallengeEntry } from '@duncit/utils';

import { EntryGallery } from '@/components/challenge/tools/EntryGallery';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useTranslation', () => {
  const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
    options?.vars ? `${key}|${Object.values(options.vars).join(',')}` : key;
  return { useTranslation: () => ({ t }) };
});

const entry = (patch: Partial<ChallengeEntry>): ChallengeEntry => ({
  id: 'e1',
  competitor_id: 'c1',
  media_url: 'https://cdn/e1.jpg',
  media_type: 'IMAGE',
  caption: '',
  ...patch,
});

const NAMES = new Map([
  ['c1', 'Team Red'],
  ['c2', 'Team Blue'],
]);

const mount = (
  entries: ChallengeEntry[],
  {
    canRemove = () => false,
    busy = false,
    onRemove = jest.fn(),
  }: {
    canRemove?: (entry: ChallengeEntry) => boolean;
    busy?: boolean;
    onRemove?: jest.Mock;
  } = {},
) => {
  renderWithProviders(
    <EntryGallery
      entries={entries}
      names={NAMES}
      canRemove={canRemove}
      onRemove={onRemove}
      busy={busy}
    />,
  );
  return { onRemove };
};

describe('EntryGallery', () => {
  let openURL: jest.SpyInstance;
  beforeEach(() => {
    openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  });
  afterEach(() => openURL.mockRestore());

  it('says nothing was submitted yet', () => {
    mount([]);
    expect(screen.getByText('mweb.challenge.tools.noSubmissions')).toBeOnTheScreen();
  });

  it('shows a photo inline with its competitor and caption', () => {
    mount([entry({ caption: 'Sunset' })]);
    expect(screen.getByTestId('challenge-entry-e1')).toBeOnTheScreen();
    expect(screen.getByLabelText('mweb.challenge.tools.entryBy|Team Red')).toBeOnTheScreen();
    expect(screen.getByText('Team Red')).toBeOnTheScreen();
    expect(screen.getByText('Sunset')).toBeOnTheScreen();
    expect(screen.queryByTestId('challenge-entry-open-e1')).toBeNull();
  });

  it('shows no caption line for an entry without one', () => {
    mount([entry({})]);
    expect(screen.queryByText('Sunset')).toBeNull();
  });

  it('opens a video in the device player', () => {
    mount([entry({ id: 'v1', media_type: 'VIDEO', media_url: 'https://cdn/v1.mp4' })]);
    expect(screen.getByText('mweb.challenge.tools.playVideo|Team Red')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('challenge-entry-open-v1'));
    expect(openURL).toHaveBeenCalledWith('https://cdn/v1.mp4');
  });

  it('opens audio in the device player', () => {
    mount([entry({ id: 'a1', media_type: 'AUDIO', media_url: 'https://cdn/a1.mp3' })]);
    expect(screen.getByText('mweb.challenge.tools.playAudio|Team Red')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('challenge-entry-open-a1'));
    expect(openURL).toHaveBeenCalledWith('https://cdn/a1.mp3');
  });

  it('shows a blank name for a competitor who left the roster', () => {
    mount([entry({ competitor_id: 'gone' })]);
    expect(screen.getByLabelText('mweb.challenge.tools.entryBy|')).toBeOnTheScreen();
  });

  it('offers remove only for entries the viewer may remove, and reports which one', () => {
    const { onRemove } = mount(
      [entry({ id: 'mine' }), entry({ id: 'theirs', competitor_id: 'c2' })],
      { canRemove: (e) => e.id === 'mine' },
    );
    expect(screen.queryByTestId('challenge-entry-remove-theirs')).toBeNull();
    fireEvent.press(screen.getByTestId('challenge-entry-remove-mine'));
    expect(onRemove).toHaveBeenCalledWith(expect.objectContaining({ id: 'mine' }));
    expect(screen.getByLabelText('mweb.challenge.tools.removeEntry|Team Red')).toBeOnTheScreen();
  });

  it('disables remove while an action is in flight', () => {
    mount([entry({})], { canRemove: () => true, busy: true });
    expect(screen.getByTestId('challenge-entry-remove-e1')).toBeDisabled();
  });
});
