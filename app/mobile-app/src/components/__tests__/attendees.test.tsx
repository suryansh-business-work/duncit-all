import { fireEvent, screen } from '@testing-library/react-native';

import {
  AttendeesDialog,
  type AttendeePerson,
  type SpotFillRow,
} from '@/components/details/AttendeesDialog';
import {
  AttendeesSection,
  buildAttendeePeople,
  buildHostPeople,
  buildSpotFillRows,
} from '@/components/details/AttendeesSection';
import type { PodSpotFill } from '@/hooks/useDetails';
import { renderWithProviders } from '@/utils/test-utils';

const person = (id: string, over: Partial<AttendeePerson> = {}): AttendeePerson => ({
  user_id: id,
  full_name: `Person ${id}`,
  profile_photo: null,
  is_host: false,
  ...over,
});

const spotFill = (over: Partial<PodSpotFill> = {}): PodSpotFill => ({
  backout_no: 'DUN-BKO-000001',
  backed_out_user_id: 'out1',
  backed_out_user_name: 'Asha Rao',
  backed_out_profile_photo: 'https://x/asha.jpg',
  replacement_user_id: 'new1',
  replacement_user_name: 'Bela Jain',
  filled_at: '2026-07-01T00:00:00.000Z',
  ...over,
});

const fillRow = (over: Partial<SpotFillRow> = {}): SpotFillRow => ({
  key: 'DUN-BKO-000001',
  old_user_id: 'out1',
  old_name: 'Asha Rao',
  old_photo: null,
  filled_by_label: 'Spot filled by Bela Jain',
  ...over,
});

const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
  options?.vars?.name === undefined ? key : `${key}:${options.vars.name}`;

describe('buildAttendeePeople', () => {
  it('orders hosts first and fills missing profiles with nulls', () => {
    const people = buildAttendeePeople(
      [
        { user_id: 'u1', full_name: 'Asha', profile_photo: 'https://x/p.jpg' },
        { user_id: 'h1', full_name: 'Host', profile_photo: null },
      ],
      ['u1', 'unknown', 'h1'],
      ['h1'],
    );
    expect(people.map((p) => p.user_id)).toEqual(['h1', 'u1', 'unknown']);
    expect(people[0]?.is_host).toBe(true);
    expect(people[2]).toEqual({
      user_id: 'unknown',
      full_name: null,
      profile_photo: null,
      is_host: false,
    });
    expect(buildAttendeePeople([], undefined as never, [])).toEqual([]);
  });
});

describe('buildHostPeople', () => {
  it('resolves host ids to profiles in order, filling missing ones with nulls', () => {
    const hosts = buildHostPeople(
      [{ user_id: 'h1', full_name: 'Asha', profile_photo: 'https://x/p.jpg' }],
      ['h1', 'h2'],
    );
    expect(hosts).toEqual([
      { user_id: 'h1', full_name: 'Asha', profile_photo: 'https://x/p.jpg' },
      { user_id: 'h2', full_name: null, profile_photo: null },
    ]);
    expect(buildHostPeople([], undefined as never)).toEqual([]);
  });
});

describe('buildSpotFillRows', () => {
  it('resolves names, photos and the filled-by label, with copy fallbacks', () => {
    const rows = buildSpotFillRows([spotFill()], t);
    expect(rows).toEqual([
      {
        key: 'DUN-BKO-000001',
        old_user_id: 'out1',
        old_name: 'Asha Rao',
        old_photo: 'https://x/asha.jpg',
        filled_by_label: 'mweb.podDetails.spotFilledBy:Bela Jain',
      },
    ]);
    // Legacy fills without names/photos fall back to the localized copy.
    const legacy = buildSpotFillRows(
      [
        spotFill({
          backed_out_user_name: null,
          backed_out_profile_photo: null,
          replacement_user_id: null,
          replacement_user_name: null,
        }),
      ],
      t,
    );
    expect(legacy[0]).toMatchObject({
      old_name: 'mweb.podDetails.formerAttendee',
      old_photo: null,
      filled_by_label: 'mweb.podDetails.spotFilledBy:mweb.podDetails.newAttendee',
    });
    expect(buildSpotFillRows(undefined as never, t)).toEqual([]);
  });
});

describe('AttendeesSection', () => {
  it('shows the empty hint with no attendees and no spots', () => {
    renderWithProviders(<AttendeesSection people={[]} spots={0} onOpenProfile={jest.fn()} />);
    expect(screen.getByText('Be the first to join!')).toBeOnTheScreen();
    expect(screen.getByText('0 going')).toBeOnTheScreen();
  });

  it('shows "attended" instead of "going" for an expired pod', () => {
    renderWithProviders(
      <AttendeesSection people={[]} spots={0} expired onOpenProfile={jest.fn()} />,
    );
    expect(screen.getByText('0 attended')).toBeOnTheScreen();
  });

  it('opens the dialog from the avatar group and forwards profile taps', () => {
    const onOpenProfile = jest.fn();
    renderWithProviders(
      <AttendeesSection
        people={[
          person('h1', { is_host: true, profile_photo: 'https://x/h.jpg' }),
          person('u1', { full_name: null }),
        ]}
        spots={5}
        onOpenProfile={onOpenProfile}
      />,
    );
    expect(screen.getByText('2 / 5 going')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('attendees-avatar-group'));
    expect(screen.getByTestId('attendees-dialog')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('attendee-row-h1'));
    expect(onOpenProfile).toHaveBeenCalledWith('h1');
    // Reopen and dismiss via the dialog's close button (covers the close wiring).
    fireEvent.press(screen.getByTestId('attendees-avatar-group'));
    fireEvent.press(screen.getByTestId('attendees-dialog-close'));
    expect(screen.queryByTestId('attendees-dialog')).toBeNull();
  });

  it('caps the preview at 8 bubbles and shows the +N overflow badge', () => {
    const many = Array.from({ length: 11 }, (_, i) => person(`u${i}`));
    renderWithProviders(<AttendeesSection people={many} spots={0} onOpenProfile={jest.fn()} />);
    expect(screen.getByText('+3')).toBeOnTheScreen();
  });

  it('strikes through replaced attendees and names the filler', () => {
    const onOpenProfile = jest.fn();
    renderWithProviders(
      <AttendeesSection
        people={[person('u1')]}
        spots={5}
        spotFills={[spotFill()]}
        onOpenProfile={onOpenProfile}
      />,
    );
    // Caption line under the avatar group: struck old name + filled-by copy.
    expect(screen.getByText('Asha Rao')).toBeOnTheScreen();
    expect(screen.getByText(/Spot filled by Bela Jain/)).toBeOnTheScreen();
    // The dialog lists the same row and taps through to the old profile.
    fireEvent.press(screen.getByTestId('attendees-avatar-group'));
    fireEvent.press(screen.getByTestId('spot-fill-row-DUN-BKO-000001'));
    expect(onOpenProfile).toHaveBeenCalledWith('out1');
  });
});

describe('AttendeesDialog', () => {
  it('lists people with the host badge and closes', () => {
    const onClose = jest.fn();
    renderWithProviders(
      <AttendeesDialog
        open
        people={[
          person('h1', { is_host: true }),
          person('u2', { profile_photo: 'https://x/u.jpg' }),
        ]}
        onClose={onClose}
        onOpenProfile={jest.fn()}
      />,
    );
    expect(screen.getByText('Attendees (2)')).toBeOnTheScreen();
    expect(screen.getByText('Host')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('attendees-dialog-close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows the empty state', () => {
    renderWithProviders(
      <AttendeesDialog open people={[]} onClose={jest.fn()} onOpenProfile={jest.fn()} />,
    );
    expect(screen.getByTestId('attendees-dialog-empty')).toBeOnTheScreen();
  });

  it('renders photo-less spot-fill rows with the initial fallback and title', () => {
    renderWithProviders(
      <AttendeesDialog
        open
        people={[]}
        spotFills={[fillRow()]}
        spotFilledTitle="Spot filled"
        onClose={jest.fn()}
        onOpenProfile={jest.fn()}
      />,
    );
    expect(screen.getByText('Spot filled')).toBeOnTheScreen();
    expect(screen.getByText('A')).toBeOnTheScreen();
    expect(screen.getByText('Asha Rao')).toBeOnTheScreen();
    expect(screen.getByText('Spot filled by Bela Jain')).toBeOnTheScreen();
  });
});
