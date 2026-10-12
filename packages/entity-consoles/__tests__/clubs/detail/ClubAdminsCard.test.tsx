import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import ClubAdminsCard from '../../../src/clubs/detail/ClubAdminsCard';
import type { ClubActor } from '../../../src/clubs/detail/types';

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

  it('turns a name into a link only for admins that have a record to open', () => {
    const admins: ClubActor[] = [
      { id: 'a1', name: 'Asha Rao' },
      { id: 'a2', name: 'Bala' },
    ];
    render(
      <MemoryRouter>
        <ClubAdminsCard
          admins={admins}
          adminPath={(admin) => (admin.id === 'a1' ? '/clubs/c1/club-admins/rec-1' : undefined)}
        />
      </MemoryRouter>,
    );

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href', '/clubs/c1/club-admins/rec-1');
    expect(links[0]).toHaveTextContent('Asha Rao');
    expect(screen.getByText('Bala').closest('a')).toBeNull();
  });
});
