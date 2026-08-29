import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import ClubAdminsCard from '../ClubAdminsCard';
import type { ClubActor } from '../types';

describe('ClubAdminsCard', () => {
  it('shows the empty state and a zero count when there are no admins', () => {
    render(<ClubAdminsCard admins={[]} />);
    expect(screen.getByText('No club admins assigned yet.')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('lists every admin with their name and avatar initial fallback', () => {
    const admins: ClubActor[] = [
      { id: 'a1', name: 'Asha Rao', avatar_url: 'https://cdn.test/asha.jpg' },
      { id: 'a2', name: 'bala', avatar_url: null },
    ];
    render(<ClubAdminsCard admins={admins} />);
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Asha Rao')).toBeInTheDocument();
    expect(screen.getByText('bala')).toBeInTheDocument();
    expect(screen.queryByText('No club admins assigned yet.')).not.toBeInTheDocument();

    // Avatar with a url renders an <img>; the one without falls back to the
    // upper-cased first letter of the name.
    const images = document.querySelectorAll('img');
    expect(images).toHaveLength(1);
    expect(images[0]).toHaveAttribute('src', 'https://cdn.test/asha.jpg');
    expect(screen.getByText('B')).toBeInTheDocument();
  });

  it("falls back to '?' when an admin has no name at all", () => {
    const admins: ClubActor[] = [{ id: 'a3', name: '', avatar_url: null }];
    render(<ClubAdminsCard admins={admins} />);
    expect(screen.getByText('?')).toBeInTheDocument();
  });
});
