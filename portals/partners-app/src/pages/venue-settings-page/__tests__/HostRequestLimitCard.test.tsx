import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, configure, fireEvent, screen, waitFor } from '@testing-library/react';
import HostRequestLimitCard from '../HostRequestLimitCard';
import type { VenueSettingsVenue } from '../queries';
import { renderWithProviders } from '../../../__tests__/render';
import { scriptedLink, type ScriptedAnswer, type SentOperation } from '../../../__tests__/groupC-link';

configure({ asyncUtilTimeout: 5000 });
afterEach(cleanup);

const LABEL = 'Maximum Host Requests / Month';

const venue = (over: Partial<VenueSettingsVenue> = {}): VenueSettingsVenue => ({
  id: 'venue-1',
  venue_name: 'Courtside Arena',
  status: 'APPROVED',
  settings: { cancellation: { reschedule_only: false, tiers: [] }, rules: { max_host_requests_per_month: 8 } },
  host_requests_limit_override: null,
  ...over,
});

const saved = {
  updateVenueSettings: {
    __typename: 'Venue',
    id: 'venue-1',
    settings: { __typename: 'VenueSettings', rules: { __typename: 'VenueRules', max_host_requests_per_month: 20 } },
  },
};

const mount = (
  answer: ScriptedAnswer,
  { sent = [] as SentOperation[], onSaved = vi.fn(async () => undefined), card = venue() } = {},
) => {
  renderWithProviders(<HostRequestLimitCard venue={card} onSaved={onSaved} />, {
    link: scriptedLink({ UpdateVenueRequestLimit: answer }, sent),
  });
  return { onSaved };
};

const field = () => screen.getByLabelText(LABEL) as HTMLInputElement;
const saveAs = (value: string) => {
  fireEvent.change(field(), { target: { value } });
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));
};

describe('HostRequestLimitCard', () => {
  it("shows this venue's cap and Duncit's override", () => {
    mount(saved, { card: venue({ host_requests_limit_override: 50 }) });

    expect(screen.getByRole('heading', { name: LABEL })).toBeTruthy();
    expect(field().value).toBe('8');
    expect(screen.getByText('Set by Duncit: 50 per month.')).toBeTruthy();
  });

  it("saves only the rules key for this venue, then reloads the page's venues", async () => {
    const sent: SentOperation[] = [];
    const { onSaved } = mount(saved, { sent });

    saveAs('20');

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(sent.find((op) => op.name === 'UpdateVenueRequestLimit')?.variables).toEqual({
      venue_doc_id: 'venue-1',
      input: { rules: { max_host_requests_per_month: 20 } },
    });
  });

  it("shows the server's refusal and does not reload", async () => {
    const { onSaved } = mount(new Error('Venue is not approved'));

    saveAs('20');

    expect(await screen.findByText('Venue is not approved')).toBeTruthy();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('shows a failed reload after a good save rather than swallowing it', async () => {
    const onSaved = vi.fn(async () => {
      throw new Error('Could not reload venues');
    });
    mount(saved, { onSaved });

    saveAs('20');

    expect(await screen.findByText('Could not reload venues')).toBeTruthy();
  });

  it('never saves a cap above 100', async () => {
    const sent: SentOperation[] = [];
    mount(saved, { sent });

    saveAs('101');

    expect(await screen.findByText('Enter a whole number from 0 to 100.')).toBeTruthy();
    expect(sent.map((op) => op.name)).not.toContain('UpdateVenueRequestLimit');
  });
});
