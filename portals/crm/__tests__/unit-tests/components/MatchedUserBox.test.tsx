import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import MatchedUserBox, { MatchedUserChip } from '@/components/MatchedUserBox';
import type { CrmMatchedUser } from '@/api/crm.types';
import { createDateFormatter } from '@duncit/app-settings';

const matched = (overrides: Partial<CrmMatchedUser> = {}): CrmMatchedUser => ({
  user_id: 'user-1',
  full_name: 'asha rao',
  email: 'asha@example.com',
  phone: '+919800000000',
  profile_photo: 'https://cdn.example.com/asha.png',
  matched_on: 'EMAIL',
  platforms_used: ['ANDROID'],
  last_activity_at: '2026-11-23T10:30:00.000Z',
  ...overrides,
});

describe('MatchedUserChip', () => {
  it('says the lead matched on email', () => {
    render(<MatchedUserChip matched={matched()} />);
    expect(screen.getByText('Also a Duncit user · Email match')).toBeInTheDocument();
  });

  it('says the lead matched on phone', () => {
    render(<MatchedUserChip matched={matched({ matched_on: 'PHONE' })} />);
    expect(screen.getByText('Also a Duncit user · Phone match')).toBeInTheDocument();
  });

  it('shows the platforms the account uses beside the chip, only the ones used', () => {
    render(<MatchedUserChip matched={matched({ platforms_used: ['IOS', 'WEB'] })} />);
    const icons = within(screen.getByTestId('matched-user-chip-platforms')).getAllByRole('img');
    expect(icons.map((icon) => icon.getAttribute('aria-label'))).toEqual(['iOS', 'Web']);
  });

  it('says no platform is recorded for an account never seen signed in', () => {
    render(<MatchedUserChip matched={matched({ platforms_used: null })} />);
    expect(screen.getByTestId('matched-user-chip-platforms-empty')).toHaveTextContent('None recorded yet');
  });
});

describe('MatchedUserBox', () => {
  it('shows the user name, photo, match reason and both contact handles', () => {
    render(<MatchedUserBox matched={matched()} />);
    const box = screen.getByTestId('matched-user-box');
    expect(within(box).getByText('asha rao')).toBeInTheDocument();
    expect(within(box).getByText('Also a Duncit user · Email match')).toBeInTheDocument();
    expect(within(box).getByText('asha@example.com · +919800000000')).toBeInTheDocument();
    expect(box.querySelector('img')).toHaveAttribute('src', 'https://cdn.example.com/asha.png');
  });

  it('falls back to an initial, a generic name and a dash when the user has no details', () => {
    render(
      <MatchedUserBox
        matched={matched({ full_name: null, email: null, phone: '', profile_photo: null, matched_on: 'PHONE' })}
      />,
    );
    const box = screen.getByTestId('matched-user-box');
    expect(box.querySelector('img')).toBeNull();
    expect(within(box).getByText('U')).toBeInTheDocument();
    expect(within(box).getByText('Duncit user')).toBeInTheDocument();
    expect(within(box).getByText('—')).toBeInTheDocument();
    expect(within(box).getByText('Also a Duncit user · Phone match')).toBeInTheDocument();
  });

  it('upper-cases the first letter of the name as the avatar initial and lists only the handle present', () => {
    render(<MatchedUserBox matched={matched({ profile_photo: '', email: undefined })} />);
    const box = screen.getByTestId('matched-user-box');
    expect(within(box).getByText('A')).toBeInTheDocument();
    expect(within(box).getByText('+919800000000')).toBeInTheDocument();
  });

  it('lists all three devices, the used ones marked used, and the last activity in the admin zone', () => {
    render(<MatchedUserBox matched={matched()} />);
    const devices = screen.getByTestId('matched-user-box-platforms');
    expect(within(devices).getAllByRole('img').map((icon) => icon.getAttribute('aria-label'))).toEqual([
      'Android: used',
      'iOS: not used',
      'Web: not used',
    ]);
    const expected = createDateFormatter({ timeZoneAware: true }).formatDateTime('2026-11-23T10:30:00.000Z');
    expect(screen.getByTestId('matched-user-last-activity')).toHaveTextContent(`Last activity: ${expected}`);
  });

  it('says the last activity is not recorded yet for an account never seen', () => {
    render(<MatchedUserBox matched={matched({ last_activity_at: null, platforms_used: [] })} />);
    expect(screen.getByTestId('matched-user-last-activity')).toHaveTextContent('Last activity: Not recorded yet');
  });
});
