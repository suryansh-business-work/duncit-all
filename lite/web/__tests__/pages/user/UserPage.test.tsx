import { screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { describe, expect, it } from 'vitest';
import type { LiteEventCard, LiteMe } from '../../../../shared/graphql/documents';
import { LITE_USER_EVENTS, LITE_USER_PROFILE } from '../../../graphql/events';
import { UserPage } from '../../../pages/user';
import { eventCardFixture, meFixture, renderWithProviders, typed } from '../../test-utils';

const profileMock = (user: LiteMe | null, handle = 'asha'): MockedResponse => ({ request: { query: LITE_USER_PROFILE, variables: { handle } }, result: { data: { liteUserProfile: user } } });
const eventsMock = (events: LiteEventCard[], past: boolean): MockedResponse => ({ request: { query: LITE_USER_EVENTS, variables: { handle: 'asha', past } }, result: { data: { liteUserEvents: events } } });

const social = (over: Partial<LiteMe['social']>) => typed('LiteSocialLinks', { instagram: '', x: '', youtube: '', tiktok: '', linkedin: '', website: '', ...over });

const asha = meFixture({
  email: '',
  bio: 'Runs on Sundays.\n\nReads on Mondays.',
  events_hosted: 4,
  events_attended: 12,
  social: social({ instagram: 'asha.rao', website: 'https://asha.example' }),
});

const openProfile = (mocks: MockedResponse[]) => renderWithProviders(<UserPage />, { route: '/u/asha', path: '/u/:handle', mocks });

describe('UserPage', () => {
  it('introduces the person: name, handle, when they joined, what they hosted and went to, and their bio', async () => {
    openProfile([profileMock(asha), eventsMock([], false)]);
    const header = await screen.findByTestId('user-header');
    expect(within(header).getByRole('heading', { level: 1, name: 'Asha Rao' })).toBeInTheDocument();
    expect(within(header).getByText('@asha · Joined 01 Jan 2026')).toBeInTheDocument();
    expect(within(header).getByTestId('user-hosted')).toHaveTextContent('4 Hosted');
    expect(within(header).getByTestId('user-attended')).toHaveTextContent('12 Attended');
    expect(within(header).getByText('Runs on Sundays.')).toBeInTheDocument();
    expect(within(header).getByText('Reads on Mondays.')).toBeInTheDocument();
    await waitFor(() => expect(document.title).toBe('Asha Rao | Duncit Lite'));
  });

  it('links each social profile in a new tab, named for the person and the network', async () => {
    openProfile([profileMock(asha), eventsMock([], false)]);
    const links = await screen.findByRole('list', { name: 'Social links' });
    const instagram = within(links).getByRole('link', { name: 'Asha Rao on Instagram' });
    expect(instagram).toHaveAttribute('href', 'https://instagram.com/asha.rao');
    expect(instagram).toHaveAttribute('target', '_blank');
    expect(instagram).toHaveAttribute('rel', 'noopener noreferrer me');
    expect(within(links).getByRole('link', { name: 'Asha Rao on Website' })).toHaveAttribute('href', 'https://asha.example');
    expect(within(links).getAllByRole('link')).toHaveLength(2);
  });

  it('shows no links row, bio or joined date for a bare profile', async () => {
    openProfile([profileMock(meFixture({ email: '', created_at: '' })), eventsMock([], false)]);
    const header = await screen.findByTestId('user-header');
    expect(within(header).getByText('@asha')).toBeInTheDocument();
    expect(within(header).queryByText(/Joined/)).not.toBeInTheDocument();
    expect(screen.queryByTestId('user-social')).not.toBeInTheDocument();
  });

  it('lists the events they host, Upcoming first, then Past', async () => {
    const { user } = openProfile([profileMock(asha), eventsMock([eventCardFixture()], false), eventsMock([], true)]);
    expect(await screen.findByText('Garden Party')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Events' })).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Past' }));
    expect(await screen.findByText('No past events')).toBeInTheDocument();
  });

  it('is a Not found page for a handle nobody has', async () => {
    renderWithProviders(<UserPage />, { route: '/u/nobody', path: '/u/:handle', mocks: [profileMock(null, 'nobody')] });
    expect(await screen.findByTestId('not-found-discover')).toHaveAttribute('href', '/discover');
    expect(screen.queryByTestId('user-page')).not.toBeInTheDocument();
  });

  it('shows the API’s message when the profile cannot be read', async () => {
    const refused: MockedResponse = { request: { query: LITE_USER_PROFILE, variables: { handle: 'asha' } }, result: { errors: [{ message: 'Profiles are resting' }] } };
    openProfile([refused]);
    expect(await screen.findByTestId('query-guard-error')).toHaveTextContent('Profiles are resting');
  });
});
