import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, configure, fireEvent, screen, waitFor } from '@testing-library/react';
import HostSettingsPage from '../HostSettingsPage';
import { renderWithProviders } from '../../../__tests__/render';
import {
  STAY_PENDING,
  scriptedLink,
  type ScriptedAnswer,
  type SentOperation,
} from '../../../__tests__/groupC-link';

configure({ asyncUtilTimeout: 5000 });
afterEach(cleanup);
beforeEach(() => {
  globalThis.localStorage.clear();
});

const LABEL = 'Maximum Venue Requests / Month';

const host = (over: Record<string, unknown> = {}) => ({
  myHost: {
    __typename: 'Host',
    id: 'host-1',
    max_venue_requests_per_month: 10,
    venue_requests_limit_override: null,
    ...over,
  },
});

const saved = (limit: number) => ({
  setMyVenueRequestLimit: { __typename: 'Host', id: 'host-1', max_venue_requests_per_month: limit },
});

const mount = (answers: Record<string, ScriptedAnswer>, sent: SentOperation[] = []) =>
  renderWithProviders(<HostSettingsPage />, { link: scriptedLink(answers, sent), route: '/host/settings' });

const field = () => screen.getByLabelText(LABEL) as HTMLInputElement;

describe('HostSettingsPage', () => {
  it('shows a spinner while the host loads', () => {
    mount({ PartnersMyHostSettings: STAY_PENDING });

    expect(screen.getByRole('progressbar')).toBeTruthy();
    expect(screen.queryByTestId('host-settings-page')).toBeNull();
  });

  it("shows the host's own monthly cap and Duncit's override", async () => {
    mount({ PartnersMyHostSettings: host({ max_venue_requests_per_month: 15, venue_requests_limit_override: 40 }) });

    expect(await screen.findByRole('heading', { name: 'Host Settings' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: LABEL })).toBeTruthy();
    expect(field().value).toBe('15');
    expect(screen.getByText('Set by Duncit: 40 per month.')).toBeTruthy();
  });

  it('saves a new cap and confirms it', async () => {
    const sent: SentOperation[] = [];
    mount({ PartnersMyHostSettings: host(), PartnersSetMyVenueRequestLimit: saved(30) }, sent);

    await screen.findByRole('heading', { name: LABEL });
    fireEvent.change(field(), { target: { value: '30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Saved.')).toBeTruthy();
    expect(sent.find((op) => op.name === 'PartnersSetMyVenueRequestLimit')?.variables).toEqual({ limit: 30 });
  });

  it("shows the server's refusal and no confirmation", async () => {
    mount({
      PartnersMyHostSettings: host(),
      PartnersSetMyVenueRequestLimit: new Error('Only an active host can set this'),
    });

    await screen.findByRole('heading', { name: LABEL });
    fireEvent.change(field(), { target: { value: '30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Only an active host can set this')).toBeTruthy();
    expect(screen.queryByText('Saved.')).toBeNull();
  });

  it('never saves an invalid cap', async () => {
    const sent: SentOperation[] = [];
    mount({ PartnersMyHostSettings: host(), PartnersSetMyVenueRequestLimit: saved(0) }, sent);

    await screen.findByRole('heading', { name: LABEL });
    fireEvent.change(field(), { target: { value: '500' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Enter a whole number from 0 to 100.')).toBeTruthy();
    expect(sent.map((op) => op.name)).not.toContain('PartnersSetMyVenueRequestLimit');
  });

  it('says so when the partner has no host profile', async () => {
    mount({ PartnersMyHostSettings: { myHost: null } });

    expect(await screen.findByText('Your host profile is not available yet.')).toBeTruthy();
    expect(screen.queryByLabelText(LABEL)).toBeNull();
  });

  it('shows a load failure with a retry that asks again', async () => {
    const sent: SentOperation[] = [];
    mount({ PartnersMyHostSettings: new Error('Session expired') }, sent);

    expect(await screen.findByText('Session expired')).toBeTruthy();
    expect(screen.queryByText('Your host profile is not available yet.')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(sent.filter((op) => op.name === 'PartnersMyHostSettings').length).toBe(2));
  });
});
