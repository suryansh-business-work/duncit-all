import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { ChipSelectField } from '@/components/create-pod/ChipSelectField';
import { CreatePodFormView } from '@/components/create-pod/CreatePodFormView';
import {
  buildCreatePodInput,
  createPodSchema,
  parseDateTimeText,
} from '@/components/create-pod/create-pod.form';
import {
  blankCreatePodForm,
  type CreatePodFormValues,
} from '@/components/create-pod/create-pod.types';
import { renderWithProviders } from '@/utils/test-utils';

const futureText = (() => {
  const date = new Date(Date.now() + 24 * 3_600_000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
})();

const valid = (over: Partial<CreatePodFormValues> = {}): CreatePodFormValues => ({
  ...blankCreatePodForm,
  pod_title: 'Sunday community hike',
  club_id: 'club-1',
  venue_id: 'venue-1',
  pod_description: 'A relaxed group hike around the lake.',
  pod_date_time_text: futureText,
  ...over,
});

const issuesOf = (values: CreatePodFormValues) => {
  const result = createPodSchema.safeParse(values);
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
};

describe('parseDateTimeText', () => {
  it('parses valid text and rejects bad formats/impossible dates', () => {
    expect(parseDateTimeText(futureText)).toBeInstanceOf(Date);
    expect(parseDateTimeText('')).toBeNull();
    expect(parseDateTimeText('01-07-2026 18:00')).toBeNull();
    expect(parseDateTimeText('2026-13-45 99:99')).toBeNull();
  });
});

describe('createPodSchema', () => {
  it('accepts a valid physical pod', () => {
    expect(createPodSchema.safeParse(valid()).success).toBe(true);
  });

  it('requires title, club, description and a venue for physical pods', () => {
    const paths = issuesOf(
      valid({ pod_title: 'x', club_id: '', pod_description: 'short', venue_id: '' }),
    );
    expect(paths).toEqual(
      expect.arrayContaining(['pod_title', 'club_id', 'pod_description', 'venue_id']),
    );
  });

  it('requires a valid meeting link for virtual pods', () => {
    expect(issuesOf(valid({ pod_mode: 'VIRTUAL', venue_id: '', meeting_url: '' }))).toContain(
      'meeting_url',
    );
    expect(issuesOf(valid({ pod_mode: 'VIRTUAL', venue_id: '', meeting_url: 'nope' }))).toContain(
      'meeting_url',
    );
    expect(
      createPodSchema.safeParse(
        valid({ pod_mode: 'VIRTUAL', venue_id: '', meeting_url: 'https://meet.duncit.com/x' }),
      ).success,
    ).toBe(true);
  });

  it('rejects past starts, ends before start, and bad numbers', () => {
    expect(issuesOf(valid({ pod_date_time_text: '2020-01-01 10:00' }))).toContain(
      'pod_date_time_text',
    );
    expect(issuesOf(valid({ pod_end_date_time_text: '2020-01-01 10:00' }))).toContain(
      'pod_end_date_time_text',
    );
    expect(issuesOf(valid({ pod_amount_text: 'abc' }))).toContain('pod_amount_text');
    expect(issuesOf(valid({ no_of_spots_text: '-2' }))).toContain('no_of_spots_text');
  });

  it('forces free pods to amount 0', () => {
    expect(issuesOf(valid({ pod_type: 'NATIVE_FREE', pod_amount_text: '100' }))).toContain(
      'pod_amount_text',
    );
    expect(
      createPodSchema.safeParse(valid({ pod_type: 'NATIVE_PAID', pod_amount_text: '499' })).success,
    ).toBe(true);
  });
});

describe('buildCreatePodInput', () => {
  it('throws when the start text is unparsable (guarded by the schema in the UI)', () => {
    expect(() => buildCreatePodInput(valid({ pod_date_time_text: 'nope' }))).toThrow(
      /Invalid start/,
    );
  });

  it('maps a physical pod with hashtags, media and line lists', () => {
    const input = buildCreatePodInput(
      valid({
        pod_hashtag_text: '#weekend, #community fun',
        media_text: 'https://cdn/img.jpg\nhttps://cdn/clip.mp4\n',
        what_this_pod_offers_text: 'Snacks\n\nGuided trail',
        available_perks_text: 'Stickers',
      }),
    );
    expect(input.pod_hashtag).toEqual(['weekend', 'community', 'fun']);
    expect(input.pod_images_and_videos).toEqual([
      { url: 'https://cdn/img.jpg', type: 'IMAGE' },
      { url: 'https://cdn/clip.mp4', type: 'VIDEO' },
    ]);
    expect(input.venue_id).toBe('venue-1');
    expect(input.meeting_url).toBeNull();
    expect(input.pod_end_date_time).toBeNull();
    expect(input.is_active).toBe(true);
  });

  it('nulls empty optional virtual fields and keeps payment terms', () => {
    const input = buildCreatePodInput(
      valid({
        pod_mode: 'VIRTUAL',
        meeting_platform: '',
        meeting_url: 'https://meet.duncit.com/x',
        meeting_notes: '',
        payment_terms: 'Pay at the venue',
      }),
    );
    expect(input.meeting_platform).toBeNull();
    expect(input.meeting_notes).toBeNull();
    expect(input.payment_terms).toBe('Pay at the venue');
  });

  it('maps a virtual pod with meeting fields and no venue', () => {
    const input = buildCreatePodInput(
      valid({
        pod_mode: 'VIRTUAL',
        meeting_platform: 'Meet',
        meeting_url: 'https://meet.duncit.com/x',
        meeting_notes: 'Join early',
        pod_end_date_time_text: futureText,
      }),
    );
    expect(input.venue_id).toBeNull();
    expect(input.meeting_platform).toBe('Meet');
    expect(input.meeting_notes).toBe('Join early');
    expect(input.pod_end_date_time).not.toBeNull();
  });
});

describe('ChipSelectField', () => {
  it('selects options and shows error + empty hint states', () => {
    const onChange = jest.fn();
    const { rerender } = renderWithProviders(
      <ChipSelectField
        label="Club"
        options={[{ value: 'a', label: 'Alpha' }]}
        value=""
        onChange={onChange}
        error="Select a club"
        testID="chips"
      />,
    );
    fireEvent.press(screen.getByTestId('chips-a'));
    expect(onChange).toHaveBeenCalledWith('a');
    expect(screen.getByTestId('chips-error')).toBeOnTheScreen();

    rerender(
      <ChipSelectField
        label="Venue"
        options={[]}
        value=""
        onChange={onChange}
        emptyHint="None linked."
        testID="chips"
      />,
    );
    expect(screen.getByTestId('chips-empty')).toBeOnTheScreen();
    expect(screen.getByText('None linked.')).toBeOnTheScreen();

    rerender(
      <ChipSelectField label="Venue" options={[]} value="" onChange={onChange} testID="chips" />,
    );
    expect(screen.getByText('No options available.')).toBeOnTheScreen();
  });
});

describe('CreatePodFormView', () => {
  const clubs = [
    { id: 'club-1', club_name: 'Runners', meetup_venues_id: ['venue-1'] },
    { id: 'club-2', club_name: 'Readers', meetup_venues_id: [] },
  ] as never;
  const venues = [{ id: 'venue-1', venue_name: 'Hall', city: 'Pune', locality: null }] as never;

  const fillRequired = () => {
    fireEvent.changeText(screen.getByTestId('field-pod_title'), 'Sunday community hike');
    fireEvent.press(screen.getByTestId('create-pod-club-club-1'));
    fireEvent.press(screen.getByTestId('create-pod-venue-venue-1'));
    fireEvent.changeText(screen.getByTestId('field-pod_description'), 'A relaxed group hike.');
    fireEvent.changeText(screen.getByTestId('field-pod_date_time_text'), futureText);
  };

  it('submits a valid physical pod', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    renderWithProviders(<CreatePodFormView clubs={clubs} venues={venues} onSubmit={onSubmit} />);
    fillRequired();
    fireEvent.press(screen.getByTestId('create-pod-submit'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0]?.[0].club_id).toBe('club-1');
  });

  it('switches to virtual fields, resets the venue on club change and zeroes free amounts', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    renderWithProviders(<CreatePodFormView clubs={clubs} venues={venues} onSubmit={onSubmit} />);
    fillRequired();
    // Changing the club clears the picked venue.
    fireEvent.press(screen.getByTestId('create-pod-club-club-2'));
    fireEvent.press(screen.getByTestId('create-pod-mode-VIRTUAL'));
    expect(screen.getByTestId('field-meeting_url')).toBeOnTheScreen();
    fireEvent.changeText(screen.getByTestId('field-meeting_url'), 'https://meet.duncit.com/x');
    // Paid then back to free resets the amount.
    fireEvent.press(screen.getByTestId('create-pod-type-NATIVE_PAID'));
    fireEvent.changeText(screen.getByTestId('field-pod_amount_text'), '499');
    fireEvent.press(screen.getByTestId('create-pod-type-NATIVE_FREE'));
    fireEvent.press(screen.getByTestId('create-pod-submit'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0]?.[0].pod_amount_text).toBe('0');
  });

  it('shows the submit error and keeps the form usable', async () => {
    const onSubmit = jest.fn().mockRejectedValue(new Error('Server said no'));
    renderWithProviders(<CreatePodFormView clubs={clubs} venues={venues} onSubmit={onSubmit} />);
    fillRequired();
    fireEvent.press(screen.getByTestId('create-pod-submit'));
    await waitFor(() => expect(screen.getByTestId('create-pod-error')).toBeOnTheScreen());
    expect(screen.getByTestId('create-pod-error')).toHaveTextContent('Server said no');
  });

  it('falls back to a generic message for non-Error failures', async () => {
    const onSubmit = jest.fn().mockRejectedValue('nope');
    renderWithProviders(<CreatePodFormView clubs={clubs} venues={venues} onSubmit={onSubmit} />);
    fillRequired();
    fireEvent.press(screen.getByTestId('create-pod-submit'));
    await waitFor(() => expect(screen.getByTestId('create-pod-error')).toBeOnTheScreen());
    expect(screen.getByTestId('create-pod-error')).toHaveTextContent('Could not create the pod.');
  });
});
