import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import RegisterVenuePage from './RegisterVenuePage';
import { MY_VENUE, REGISTRATION_CONFIG } from './register-venue-page/queries';
import { sectionConfig } from './register-venue-page/sections/__tests__/sectionHarness';
import { shapeOf } from '../__tests__/doc-shape';
import { renderWithProviders } from '../__tests__/render';
import { scriptedLink, STAY_PENDING, type ScriptedAnswer, type SentOperation } from '../__tests__/groupC-link';

/** The form and the publish card have their own suites; they print what this page hands them. */
vi.mock('./register-venue-page/register-venue', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  RegisterVenueForm: (props: {
    venue: { id: string } | null;
    mode: string;
    account: { name: string; email: string };
    config: { capacity_item_limit: number; venue_types: string[] };
    locations: unknown[];
    onPersisted: () => void;
    onSubmitted: (id: string) => void;
  }) => (
    <section data-testid="stub-form">
      <output data-testid="form-props">
        {JSON.stringify({
          venue: props.venue?.id ?? null,
          mode: props.mode,
          account: props.account,
          limit: props.config.capacity_item_limit,
          types: props.config.venue_types,
          locations: props.locations.length,
        })}
      </output>
      <button type="button" onClick={props.onPersisted}>
        persisted
      </button>
      <button type="button" onClick={() => props.onSubmitted('v9')}>
        submitted
      </button>
    </section>
  ),
}));

vi.mock('@duncit/public-page', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  PublishPageCard: (props: { kind: string; refId: string; title: string }) => (
    <div data-testid="publish-card">{`${props.kind}:${props.refId}:${props.title}`}</div>
  ),
}));

beforeEach(() => {
  globalThis.localStorage.clear();
});
afterEach(cleanup);

const venueRecord = (over: Record<string, unknown> = {}) => ({
  __typename: 'Venue',
  id: 'v1',
  status: 'DRAFT',
  venue_name: 'Cafe Mocha',
  reviewer_notes: null,
  ...over,
});

const detail = (venue: Record<string, unknown> | null, me: Record<string, unknown> = {}) =>
  shapeOf(MY_VENUE, {
    me: { full_name: 'Asha Rao', first_name: 'Asha', last_name: 'Rao', email: 'asha@duncit.com', ...me },
    myVenue: venue,
    locations: [{ id: 'loc-1' }, { id: 'loc-2' }],
  });

const mount = (
  route: string,
  data: ReturnType<typeof detail>,
  answers: Record<string, ScriptedAnswer> = {},
  sent: SentOperation[] = [],
) =>
  renderWithProviders(<RegisterVenuePage />, {
    route,
    // The same three routes App mounts this page at: /new and /current carry no venue id.
    path: route.endsWith('/new') || route.endsWith('/current') ? route : '/register-venue/:venueId',
    link: scriptedLink(
      {
        MyVenue: data,
        VenueRegistrationConfig: shapeOf(REGISTRATION_CONFIG, { venueRegistrationConfig: sectionConfig }),
        ...answers,
      },
      sent,
    ),
  });

const formProps = async () => JSON.parse((await screen.findByTestId('form-props')).textContent ?? '{}');

describe('RegisterVenuePage', () => {
  it('shows a spinner while the venue or the registration config loads', async () => {
    mount('/register-venue/new', detail(null), { MyVenue: STAY_PENDING });
    expect(await screen.findByRole('progressbar')).toBeTruthy();
    expect(screen.queryByTestId('stub-form')).toBeNull();
  });

  it('opens a blank registration on /new when the partner has no open draft', async () => {
    mount('/register-venue/new', detail(null, { full_name: '', first_name: 'Asha', last_name: 'Rao' }));
    expect(await formProps()).toMatchObject({
      venue: null,
      mode: 'register',
      account: { name: 'Asha Rao', email: 'asha@duncit.com' },
      limit: sectionConfig.capacity_item_limit,
      types: sectionConfig.venue_types,
      locations: 2,
    });
    expect(screen.getByText('Register your venue')).toBeTruthy();
    expect(screen.queryByTestId('publish-card')).toBeNull();
  });

  it('resumes an open draft on /new, under its own name', async () => {
    mount('/register-venue/new', detail(venueRecord()));
    expect(await formProps()).toMatchObject({ venue: 'v1', mode: 'register' });
    expect(screen.getByRole('heading', { name: 'Cafe Mocha' })).toBeTruthy();
    expect(screen.getByText('DRAFT')).toBeTruthy();
  });

  it('calls a resumed draft that has no name yet Your venue', async () => {
    mount('/register-venue/new', detail(venueRecord({ venue_name: null })));
    await formProps();
    expect(screen.getByRole('heading', { name: 'Your venue' })).toBeTruthy();
  });

  it('does not reopen an approved venue on /new — that registration is finished', async () => {
    mount('/register-venue/new', detail(venueRecord({ status: 'APPROVED' })));
    expect(await formProps()).toMatchObject({ venue: null, mode: 'register' });
    expect(screen.queryByText('APPROVED')).toBeNull();
  });

  it('opens an approved venue for the edits that stay allowed, and offers its public page', async () => {
    mount('/register-venue/v1', detail(venueRecord({ status: 'APPROVED' })));
    expect(await formProps()).toMatchObject({ venue: 'v1', mode: 'edit-approved' });
    expect(screen.getByText('APPROVED')).toBeTruthy();
    expect(screen.getByText(/Type, capacity, hours, amenities and food are set up from Venue Options/)).toBeTruthy();
    expect(screen.getByTestId('publish-card').textContent).toBe('VENUE:v1:Cafe Mocha');
  });

  it('offers the public page an approved venue with no name under an empty title', async () => {
    mount('/register-venue/v1', detail(venueRecord({ status: 'APPROVED', venue_name: null })));
    await formProps();
    expect(screen.getByTestId('publish-card').textContent).toBe('VENUE:v1:');
  });

  it('shows a venue under review read-only and says so', async () => {
    mount('/register-venue/v1', detail(venueRecord({ status: 'SUBMITTED' })));
    expect(await formProps()).toMatchObject({ mode: 'view' });
    expect(screen.getByRole('alert').textContent).toContain('Application under review');
  });

  it('shows the reviewer’s notes on a rejected venue, which can be edited and resubmitted', async () => {
    mount('/register-venue/v1', detail(venueRecord({ status: 'REJECTED', reviewer_notes: 'Photos are blurry' })));
    expect(await formProps()).toMatchObject({ mode: 'register' });
    expect(screen.getByText(/Rejected: Photos are blurry Update and resubmit\./)).toBeTruthy();
  });

  it('points a rejected venue with no notes at the notes', async () => {
    mount('/register-venue/v1', detail(venueRecord({ status: 'REJECTED', reviewer_notes: null })));
    await formProps();
    expect(screen.getByText(/Rejected: See notes\. Update and resubmit\./)).toBeTruthy();
  });

  it('always opens the venue on /current, even a finished one', async () => {
    mount('/register-venue/current', detail(venueRecord({ status: 'APPROVED' })));
    expect(await formProps()).toMatchObject({ venue: 'v1', mode: 'edit-approved' });
  });

  it('says a venue that is not the partner’s was not found and shows no form', async () => {
    mount('/register-venue/other', detail(null));
    expect(await screen.findByText('This venue registration was not found in your account.')).toBeTruthy();
    expect(screen.queryByTestId('stub-form')).toBeNull();
  });

  it('opens with an empty config when the registration config cannot be read', async () => {
    mount('/register-venue/new', detail(null), { VenueRegistrationConfig: new Error('config down') });
    expect(await formProps()).toMatchObject({ limit: 50, types: [] });
  });

  it('re-reads the venue after the form saves a section', async () => {
    const sent: SentOperation[] = [];
    mount('/register-venue/v1', detail(venueRecord()), {}, sent);
    await formProps();
    const reads = () => sent.filter((op) => op.name === 'MyVenue').length;
    const before = reads();
    fireEvent.click(screen.getByRole('button', { name: 'persisted' }));
    await waitFor(() => expect(reads()).toBeGreaterThan(before));
  });

  it('moves to the submitted venue’s own page, replacing this one in the history', async () => {
    mount('/register-venue/v1', detail(venueRecord()));
    await formProps();
    fireEvent.click(screen.getByRole('button', { name: 'submitted' }));
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/register-venue/v9'));
  });
});
