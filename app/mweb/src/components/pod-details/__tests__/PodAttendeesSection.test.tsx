import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import PodAttendeesSection, { buildAttendeePeople } from '../PodAttendeesSection';

const attendees = [
  { user_id: 'h1', full_name: 'Alice Host', profile_photo: 'https://img/a.jpg' },
  { user_id: 'g1', full_name: 'Bob Guest', profile_photo: null },
  { user_id: 'g2', full_name: null, profile_photo: null },
];

function setup(props: Partial<Parameters<typeof PodAttendeesSection>[0]> = {}) {
  return render(
    <MemoryRouter>
      <PodAttendeesSection
        attendees={attendees}
        attendeeIds={['g1', 'h1', 'g2']}
        hostIds={['h1']}
        totalSpots={10}
        {...props}
      />
    </MemoryRouter>,
  );
}

describe('buildAttendeePeople', () => {
  it('orders hosts first and flags them, resolving names/photos', () => {
    const people = buildAttendeePeople(attendees, ['g1', 'h1', 'g2'], ['h1']);
    expect(people.map((p) => p.user_id)).toEqual(['h1', 'g1', 'g2']);
    expect(people[0].is_host).toBe(true);
    expect(people[1].is_host).toBe(false);
    expect(people[0].full_name).toBe('Alice Host');
    expect(people[0].profile_photo).toBe('https://img/a.jpg');
  });

  it('handles missing attendee data and null attendeeIds', () => {
    const people = buildAttendeePeople([], ['x'], []);
    expect(people[0].full_name).toBeNull();
    expect(people[0].profile_photo).toBeNull();
    // null attendeeIds path
    expect(buildAttendeePeople([], null as unknown as string[], [])).toEqual([]);
  });
});

describe('PodAttendeesSection', () => {
  it('renders count / totalSpots with the "going" noun', () => {
    setup();
    expect(screen.getByText('3 / 10 going')).toBeInTheDocument();
    expect(screen.getByText('View all')).toBeInTheDocument();
  });

  it('uses "attended" and omits total when expired and totalSpots is 0', () => {
    setup({ totalSpots: 0, expired: true });
    expect(screen.getByText('3 attended')).toBeInTheDocument();
  });

  it('shows the empty prompt when there are no attendees', () => {
    setup({ attendeeIds: [], hostIds: [], attendees: [] });
    expect(screen.getByText('0 / 10 going')).toBeInTheDocument();
    expect(screen.getByText('Be the first to join!')).toBeInTheDocument();
    expect(screen.queryByText('View all')).not.toBeInTheDocument();
  });

  it('opens the attendees dialog and navigates to a profile on click', async () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'View all attendees' }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Attendees (3)')).toBeInTheDocument();
    // Host chip + first-letter fallback avatar for the null-name guest
    expect(within(dialog).getByText('Host')).toBeInTheDocument();
    expect(within(dialog).getByText('Alice Host')).toBeInTheDocument();

    // tap-through to a profile closes the dialog
    fireEvent.click(within(dialog).getByText('Alice Host'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('closes the dialog via the close button', async () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'View all attendees' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close attendees' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
