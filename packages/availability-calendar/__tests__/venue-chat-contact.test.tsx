import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { VenueChatHostCard, VenueChatVenueCard } from '@duncit/utils';
import { telHref } from '../src/offers/chat/contact-links';
import VenueChatContactSheet from '../src/offers/chat/VenueChatContactSheet';

const host: VenueChatHostCard = {
  user_id: 'u-asha',
  name: 'Asha Rao',
  photo: 'https://ik.imagekit.io/duncit/u/asha.jpg',
  username: 'asha',
  bio: 'Pottery teacher',
  phone: '+91 98000-00000',
  email: 'asha@host.test',
};

const venue: VenueChatVenueCard = {
  venue_id: 'venue-1',
  venue_name: 'Skyline Banquets',
  photo: null,
  venue_type: 'Banquet hall',
  capacity: 120,
  address: '12 MG Road, Bengaluru',
  name: 'Ravi',
  phone: '(080) 4000 1000',
  email: 'events@skyline.test',
};

type SheetProps = Partial<Parameters<typeof VenueChatContactSheet>[0]>;

const renderSheet = (props: SheetProps = {}) => {
  const onClose = vi.fn();
  render(<VenueChatContactSheet open onClose={onClose} host={host} venue={venue} {...props} />);
  return { onClose };
};

const sheet = () => within(screen.getByRole('dialog', { name: 'Host and venue details' }));

describe('telHref', () => {
  it('dials the digits and a leading +, nothing else', () => {
    expect(telHref('+91 98000-00000')).toBe('tel:+919800000000');
    expect(telHref('(080) 4000 1000')).toBe('tel:08040001000');
  });
});

describe('VenueChatContactSheet', () => {
  it('shows the host with their face, handle, bio and ways to reach them, and opens their profile', () => {
    const onViewProfile = vi.fn();
    renderSheet({ onViewProfile });
    const card = within(sheet().getByTestId('venue-chat-host-card'));
    expect(card.getByText('Host')).toBeInTheDocument();
    expect(card.getByRole('heading', { name: 'Asha Rao' })).toBeInTheDocument();
    expect(card.getByText('@asha')).toBeInTheDocument();
    expect(card.getByText('Pottery teacher')).toBeInTheDocument();
    expect(sheet().getByTestId('venue-chat-host-card').querySelector('img')).toHaveAttribute('src', host.photo);
    expect(card.getByRole('link', { name: 'Phone +91 98000-00000' })).toHaveAttribute('href', 'tel:+919800000000');
    expect(card.getByRole('link', { name: 'Email asha@host.test' })).toHaveAttribute('href', 'mailto:asha@host.test');
    expect(card.queryByText('No phone or email on record')).not.toBeInTheDocument();
    fireEvent.click(card.getByRole('button', { name: 'View profile' }));
    expect(onViewProfile).toHaveBeenCalledWith(host);
  });

  it('shows the venue with its type, capacity, address and who to ask for, and opens its page', () => {
    const onViewVenue = vi.fn();
    renderSheet({ onViewVenue });
    const card = within(sheet().getByTestId('venue-chat-venue-card'));
    expect(card.getByText('Venue')).toBeInTheDocument();
    expect(card.getByRole('heading', { name: 'Skyline Banquets' })).toBeInTheDocument();
    expect(card.getByText('Banquet hall · Up to 120 guests')).toBeInTheDocument();
    expect(card.getByText('12 MG Road, Bengaluru')).toBeInTheDocument();
    expect(card.getByText('Ask for Ravi')).toBeInTheDocument();
    // No photo on record: the storefront stands in for it.
    expect(card.getByTestId('StorefrontRoundedIcon')).toBeInTheDocument();
    expect(card.getByRole('link', { name: 'Phone (080) 4000 1000' })).toHaveAttribute('href', 'tel:08040001000');
    expect(card.getByRole('link', { name: 'Email events@skyline.test' })).toHaveAttribute('href', 'mailto:events@skyline.test');
    fireEvent.click(card.getByRole('button', { name: 'View venue' }));
    expect(onViewVenue).toHaveBeenCalledWith(venue);
  });

  it('offers no page to open where the surface has none', () => {
    renderSheet();
    expect(sheet().queryByRole('button', { name: 'View profile' })).not.toBeInTheDocument();
    expect(sheet().queryByRole('button', { name: 'View venue' })).not.toBeInTheDocument();
  });

  it('lists only the details on record, and says when a side has no phone or email', () => {
    renderSheet({
      host: { ...host, photo: null, username: '', bio: '', phone: '', email: '' },
      venue: { ...venue, venue_type: '', capacity: 0, name: '', phone: '' },
    });
    const hostCard = within(sheet().getByTestId('venue-chat-host-card'));
    expect(hostCard.getByText('No phone or email on record')).toBeInTheDocument();
    expect(hostCard.queryByRole('link')).not.toBeInTheDocument();
    expect(hostCard.queryByText(/^@/)).not.toBeInTheDocument();
    expect(hostCard.getByTestId('PersonRoundedIcon')).toBeInTheDocument();

    const venueCard = within(sheet().getByTestId('venue-chat-venue-card'));
    expect(venueCard.getByText('12 MG Road, Bengaluru')).toBeInTheDocument();
    expect(venueCard.queryByText(/Up to|Ask for/)).not.toBeInTheDocument();
    expect(venueCard.queryByText('No phone or email on record')).not.toBeInTheDocument();
    expect(venueCard.getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual(['mailto:events@skyline.test']);
  });

  it('names the type alone when the venue gives no capacity', () => {
    renderSheet({ venue: { ...venue, capacity: 0 } });
    expect(within(sheet().getByTestId('venue-chat-venue-card')).getByText('Banquet hall')).toBeInTheDocument();
  });

  it('draws a card only for a side that is on record', () => {
    renderSheet({ host: null, venue: undefined });
    expect(sheet().getByRole('heading', { name: 'Host and venue details' })).toBeInTheDocument();
    expect(sheet().queryByTestId('venue-chat-host-card')).not.toBeInTheDocument();
    expect(sheet().queryByTestId('venue-chat-venue-card')).not.toBeInTheDocument();
  });

  it('closes from its close button', () => {
    const { onClose } = renderSheet();
    fireEvent.click(sheet().getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows nothing while closed', () => {
    renderSheet({ open: false });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
