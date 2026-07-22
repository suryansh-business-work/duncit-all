import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import ClubTotalMembersSection from '../ClubTotalMembersSection';

describe('ClubTotalMembersSection', () => {
  it('renders the labels and the provided count', () => {
    render(<ClubTotalMembersSection count={42} />);

    expect(screen.getByTestId('club-total-members')).toBeInTheDocument();
    expect(screen.getByText('Total Members')).toBeInTheDocument();
    expect(screen.getByText('People following this club')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders a zero count', () => {
    render(<ClubTotalMembersSection count={0} />);

    expect(screen.getByText('0')).toBeInTheDocument();
  });
});
