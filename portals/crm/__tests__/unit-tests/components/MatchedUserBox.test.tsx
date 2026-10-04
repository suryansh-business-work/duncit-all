import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import MatchedUserBox, { MatchedUserChip } from '@/components/MatchedUserBox';
import type { CrmMatchedUser } from '@/api/crm.types';

const matched = (overrides: Partial<CrmMatchedUser> = {}): CrmMatchedUser => ({
  user_id: 'user-1',
  full_name: 'asha rao',
  email: 'asha@example.com',
  phone: '+919800000000',
  profile_photo: 'https://cdn.example.com/asha.png',
  matched_on: 'EMAIL',
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
});
