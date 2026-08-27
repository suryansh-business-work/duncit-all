/**
 * The club card and the club-admins card, which read ONE document between them.
 *
 * The club card answers "which club is this"; the admins card answers "who do I
 * ring when this pod goes wrong" — so its whole point is the contact chips, and
 * a name with no channel beside it renders as a name and nothing else.
 */
import type { MockedResponse } from '@apollo/client/testing';
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import PodClubAdminsCard, { type PodClubAdmin } from '../src/PodClubAdminsCard';
import PodClubCard from '../src/PodClubCard';
import { POD_CLUB_DETAIL } from '../src/queries';
import { mountSection, settle } from './harness';

const CLUB_ID = 'club-1';

const admin = (over: Partial<PodClubAdmin> & { id: string }) => ({
  __typename: 'ClubAdmin',
  name: 'Priya Menon',
  avatar_url: null,
  email: null,
  phone: null,
  whatsapp: null,
  ...over,
});

const club = (admins: unknown[]) => ({
  __typename: 'Club',
  id: CLUB_ID,
  club_name: 'Sunset Club',
  club_slug: 'sunset-club',
  club_admins: admins,
});

const clubMock = (result: Record<string, unknown> | null): MockedResponse => ({
  request: { query: POD_CLUB_DETAIL, variables: { id: CLUB_ID } },
  result: { data: { club: result } },
});

const failing: MockedResponse = {
  request: { query: POD_CLUB_DETAIL, variables: { id: CLUB_ID } },
  error: new Error('club service down'),
};

describe('PodClubCard', () => {
  it('names the club and its slug, and View club opens the club page', async () => {
    mountSection(<PodClubCard clubId={CLUB_ID} />, [clubMock(club([]))]);
    await settle();

    expect(screen.getByText('Sunset Club')).toBeInTheDocument();
    expect(screen.getByText('/sunset-club')).toBeInTheDocument();

    fireEvent.click(screen.getByText('View club'));
    expect(await screen.findByText('club-page')).toBeInTheDocument();
  });

  it('says so when the server has no club for the id', async () => {
    mountSection(<PodClubCard clubId={CLUB_ID} />, [clubMock(null)]);
    await settle();

    expect(screen.getByText('No club linked to this pod.')).toBeInTheDocument();
  });

  it('does not fetch at all for a pod with no club', async () => {
    mountSection(<PodClubCard clubId={null} />);
    await settle();

    expect(screen.getByText('No club linked to this pod.')).toBeInTheDocument();
  });

  it('shows the failure rather than an empty state when the query fails', async () => {
    mountSection(<PodClubCard clubId={CLUB_ID} />, [failing]);
    await settle();

    expect(screen.getByText('club service down')).toBeInTheDocument();
  });
});

describe('PodClubAdminsCard', () => {
  const reachable = admin({
    id: 'u-1',
    email: 'priya@duncit.com',
    phone: '+91 90000 00001',
    whatsapp: '+91 90000-00002',
    avatar_url: 'https://cdn.duncit.com/u/priya.jpg',
  });

  it('renders every channel an admin can be reached on, dialable', async () => {
    mountSection(<PodClubAdminsCard clubId={CLUB_ID} />, [clubMock(club([reachable]))]);
    await settle();

    expect(screen.getByText('Priya Menon')).toBeInTheDocument();
    const links = [...document.querySelectorAll<HTMLAnchorElement>('a[href]')].map((a) => a.getAttribute('href'));
    expect(links).toEqual(['mailto:priya@duncit.com', 'tel:+919000000001', 'https://wa.me/919000000002']);
    // Only the WhatsApp chip leaves the page.
    expect(document.querySelectorAll('a[target="_blank"]')).toHaveLength(1);
    expect(screen.getByText('Email: priya@duncit.com')).toBeInTheDocument();
    expect(screen.getByText('Phone: +91 90000 00001')).toBeInTheDocument();
    expect(screen.getByText('WhatsApp: +91 90000-00002')).toBeInTheDocument();
  });

  it('renders no chip for a channel the profile never filled in', async () => {
    const unreachable = admin({ id: 'u-2', name: 'Dev K', phone: '  ' });
    mountSection(<PodClubAdminsCard clubId={CLUB_ID} />, [clubMock(club([reachable, unreachable]))]);
    await settle();

    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Dev K')).toBeInTheDocument();
    expect(document.querySelectorAll('a[href]')).toHaveLength(3);
  });

  it('falls back to a question mark for an admin with no name to initial', async () => {
    mountSection(<PodClubAdminsCard clubId={CLUB_ID} />, [clubMock(club([admin({ id: 'u-3', name: '' })]))]);
    await settle();

    expect(screen.getByText('?')).toBeInTheDocument();
  });

  it('links the name to the user page when the portal has one', async () => {
    mountSection(
      <PodClubAdminsCard clubId={CLUB_ID} userTo={(userId) => `/users/${userId}`} />,
      [clubMock(club([reachable]))],
    );
    await settle();

    fireEvent.click(screen.getByRole('button', { name: 'Priya Menon' }));
    expect(await screen.findByText('user-page')).toBeInTheDocument();
  });

  it('renders the name as plain text on a portal with no user pages', async () => {
    mountSection(<PodClubAdminsCard clubId={CLUB_ID} />, [clubMock(club([reachable]))]);
    await settle();

    expect(screen.queryByRole('button', { name: 'Priya Menon' })).not.toBeInTheDocument();
    expect(screen.getByText('Priya Menon')).toBeInTheDocument();
  });

  it('says when the club has nobody administering it', async () => {
    mountSection(<PodClubAdminsCard clubId={CLUB_ID} />, [clubMock(club([]))]);
    await settle();

    expect(screen.getByText('This club has no club admins.')).toBeInTheDocument();
  });

  it('shares the club card’s sentence when there is no club at all', async () => {
    mountSection(<PodClubAdminsCard clubId={CLUB_ID} />, [clubMock(null)]);
    await settle();

    expect(screen.getByText('No club linked to this pod.')).toBeInTheDocument();
  });

  it('skips the fetch for a pod with no club', async () => {
    mountSection(<PodClubAdminsCard clubId={null} />);
    await settle();

    expect(screen.getByText('No club linked to this pod.')).toBeInTheDocument();
  });

  it('shows the failure when the query fails', async () => {
    mountSection(<PodClubAdminsCard clubId={CLUB_ID} />, [failing]);
    await settle();

    expect(screen.getByText('club service down')).toBeInTheDocument();
  });
});
