import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { RADAR_MAX_ITEMS } from '@duncit/utils';

import ContactsRadar from '../ContactsRadar';
import type { ContactRow } from '../queries';

const contact = (id: string, over: Partial<ContactRow['profile']> = {}, nearby = false): ContactRow => ({
  contact_label: `Saved ${id}`,
  is_nearby: nearby,
  profile: {
    user_id: id,
    username: `user_${id}`,
    full_name: `Person ${id}`,
    first_name: null,
    profile_photo: null,
    is_following: false,
    ...over,
  },
});

function renderRadar(contacts: ContactRow[], me = { name: 'meera', photo: null as string | null }) {
  const onOpen = vi.fn();
  render(<ContactsRadar contacts={contacts} me={me} onOpen={onOpen} />);
  return { onOpen };
}

describe('ContactsRadar', () => {
  it('is a labelled group with the viewer in the middle', () => {
    renderRadar([]);
    const radar = screen.getByRole('group', { name: 'Radar of your contacts on Duncit' });
    expect(within(radar).getByText('You')).toBeInTheDocument();
    // The viewer's initial, upper-cased, stands in for a missing photo.
    expect(within(radar).getByText('M')).toBeInTheDocument();
    expect(within(radar).queryAllByRole('button')).toHaveLength(0);
  });

  it('shows the viewer’s photo when there is one', () => {
    renderRadar([], { name: 'meera', photo: 'https://img.example/me.jpg' });
    const img = screen.getByTestId('contacts-radar').querySelector('img');
    expect(img).toHaveAttribute('src', 'https://img.example/me.jpg');
  });

  it('plots each contact as a face that names who it opens', () => {
    renderRadar([contact('u1'), contact('u2', { full_name: null, first_name: 'Kabir' })]);

    expect(screen.getByRole('button', { name: 'Open Person u1 profile' })).toHaveTextContent('P');
    // No full name → the first name.
    expect(screen.getByRole('button', { name: 'Open Kabir profile' })).toHaveTextContent('K');
  });

  it('falls back to the phone-book label when the profile has no name', () => {
    renderRadar([contact('u3', { full_name: '', first_name: '' })]);
    expect(screen.getByTestId('contacts-radar-u3')).toHaveAccessibleName('Open Saved u3 profile');
  });

  it('says a contact is nearby in its name, not only by colour', () => {
    renderRadar([contact('near', {}, true), contact('far')]);
    expect(screen.getByTestId('contacts-radar-near')).toHaveAccessibleName('Open Person near profile, Nearby');
    expect(screen.getByTestId('contacts-radar-far')).toHaveAccessibleName('Open Person far profile');
  });

  it('opens the profile on click, Enter and Space, and ignores other keys', () => {
    const { onOpen } = renderRadar([contact('u1')]);
    const face = screen.getByTestId('contacts-radar-u1');

    fireEvent.click(face);
    fireEvent.keyDown(face, { key: 'Enter' });
    fireEvent.keyDown(face, { key: ' ' });
    expect(onOpen).toHaveBeenCalledTimes(3);
    expect(onOpen).toHaveBeenNthCalledWith(1, 'u1');
    expect(onOpen).toHaveBeenNthCalledWith(3, 'u1');

    fireEvent.keyDown(face, { key: 'a' });
    expect(onOpen).toHaveBeenCalledTimes(3);
    expect(face).toHaveAttribute('tabindex', '0');
  });

  it('plots no more than the radar holds; the rest are left to the list', () => {
    const many = Array.from({ length: RADAR_MAX_ITEMS + 3 }, (_, i) => contact(`c${i}`));
    renderRadar(many);
    expect(screen.getAllByRole('button')).toHaveLength(RADAR_MAX_ITEMS);
    expect(screen.queryByTestId(`contacts-radar-c${RADAR_MAX_ITEMS}`)).not.toBeInTheDocument();
  });

  it('keeps nearby contacts on the radar ahead of the others when it is full', () => {
    const others = Array.from({ length: RADAR_MAX_ITEMS }, (_, i) => contact(`c${i}`));
    renderRadar([...others, contact('near', {}, true)]);
    expect(screen.getByTestId('contacts-radar-near')).toBeInTheDocument();
    expect(screen.queryByTestId(`contacts-radar-c${RADAR_MAX_ITEMS - 1}`)).not.toBeInTheDocument();
  });
});
