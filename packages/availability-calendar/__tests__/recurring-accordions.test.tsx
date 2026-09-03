import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ApolloClient } from '@apollo/client';
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { GraphQLError } from 'graphql';
import { DEFAULT_VENUE_RULES, type VenueAutoExtendForm } from '@duncit/slots';
import BulkActionsAccordion from '../src/recurring/accordions/BulkActionsAccordion';
import FutureAvailabilityAccordion from '../src/recurring/accordions/FutureAvailabilityAccordion';
import SaveAsTemplateAccordion from '../src/recurring/accordions/SaveAsTemplateAccordion';
import VenueRulesAccordion from '../src/recurring/accordions/VenueRulesAccordion';
import { initialRecurringForm, type RecurringForm, type SpaceRow } from '../src/recurring/useRecurringDialog';
import {
  BULK_DELETE_VENUE_SLOTS,
  BULK_UPDATE_VENUE_SLOTS,
  CREATE_SLOT_TEMPLATE,
  DELETE_SLOT_TEMPLATE,
  MY_SLOT_TEMPLATES,
  UPDATE_VENUE_SETTINGS,
} from '../src/queries';

// Deterministic stand-in for the MUI X date picker (see DayDrawer.test.tsx).
vi.mock('@mui/x-date-pickers/DatePicker', () => ({
  DatePicker: ({ label, value, onChange }: { label: string; value: Date | null; onChange: (v: Date | null) => void }) => (
    <input
      aria-label={label}
      value={value ? value.toISOString() : ''}
      onChange={(e) => onChange(e.target.value ? new Date(e.target.value) : null)}
    />
  ),
}));

const VENUE_ID = 'venue-1';

// The accordions fire their mutations from an un-caught async click handler, so
// a *rejecting* mutation would escape as an unhandled rejection and abort the
// run. `errorPolicy: 'all'` lets a failing mutation resolve while still filling
// the hook's `error`, which is exactly what drives the error Alerts under test.
// The option is the documented one; only its declaration is missing on v4's
// DefaultOptions, so the cast says exactly that.
const MUTATION_ERROR_POLICY = { mutate: { errorPolicy: 'all' } } as unknown as ApolloClient.DefaultOptions;

function renderWithProviders(ui: ReactElement, mocks: MockedResponse[] = []) {
  return render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks} defaultOptions={MUTATION_ERROR_POLICY}>
      {ui}
    </MockedProvider>,
  );
}

const failingMock = (query: MockedResponse['request']['query'], message: string, data: unknown = null): MockedResponse => ({
  request: { query, variables: () => true },
  result: { data, errors: [new GraphQLError(message)] } as any,
});

/** Captures the variables a mutation was actually called with. */
const capturingMock = (query: MockedResponse['request']['query'], data: unknown, capture: (v: any) => void): MockedResponse => ({
  request: { query, variables: () => true },
  result: (variables: Record<string, any>) => {
    capture(variables);
    return { data } as any;
  },
});

/** A mutation that stays in flight for the whole test, to see the busy label. */
const slowMock = (query: MockedResponse['request']['query'], data: unknown): MockedResponse => ({
  request: { query, variables: () => true },
  delay: 60_000,
  result: { data } as any,
});

const template = (isDefault: boolean, id = 't1') => ({
  __typename: 'SlotTemplate',
  id,
  name: 'Weekday evenings',
  description: '',
  category: 'GENERAL',
  visibility: 'PRIVATE',
  is_default: isDefault,
  config: {
    __typename: 'SlotTemplateConfig',
    weekdays: [1, 2, 3, 4, 5],
    start_time: '18:00',
    end_time: '20:00',
    default_price: 499,
    per_day_price: [],
    skip_weekly_off: true,
    skip_holidays: false,
  },
});

const templatesMock = (rows: unknown[]): MockedResponse => ({
  request: { query: MY_SLOT_TEMPLATES, variables: { venue_id: VENUE_ID } },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: { data: { mySlotTemplates: rows } },
});

const savedVenue = {
  __typename: 'Venue',
  id: VENUE_ID,
  settings: {
    __typename: 'VenueSettings',
    operating_hours: { __typename: 'VenueOperatingHours', open: '09:00', close: '23:00' },
    weekly_off_days: [],
    holidays: [],
    rules: { __typename: 'VenueRules', ...DEFAULT_VENUE_RULES },
    auto_extend: { __typename: 'VenueAutoExtend', enabled: true, template_id: null, horizon_days: 45, until: '' },
  },
};

const autoExtend = (over: Partial<VenueAutoExtendForm> = {}): VenueAutoExtendForm => ({
  enabled: false,
  template_id: null,
  horizon_days: 30,
  until: '',
  ...over,
});

const HORIZON_LABEL = 'Keep published ahead (days, max 60)';
const NO_DEFAULT_WARNING = /don’t have a default template yet/i;

const expand = (name: RegExp) => fireEvent.click(screen.getByRole('button', { name }));
const setDate = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe('FutureAvailabilityAccordion', () => {
  it('locks the window fields until auto-extend is switched on', () => {
    renderWithProviders(
      <FutureAvailabilityAccordion venueId={VENUE_ID} autoExtend={autoExtend()} maxAdvanceDays={60} onSaved={vi.fn()} />,
      [templatesMock([template(true)])],
    );
    expand(/Future availability/);

    const horizon = screen.getByLabelText(HORIZON_LABEL) as HTMLInputElement;
    expect(horizon.disabled).toBe(true);
    expect(horizon.value).toBe('30');

    fireEvent.click(screen.getByRole('switch', { name: 'Auto-extend availability' }));
    expect((screen.getByLabelText(HORIZON_LABEL) as HTMLInputElement).disabled).toBe(false);
  });

  it('warns when auto-extend is switched on with no default template', async () => {
    renderWithProviders(
      <FutureAvailabilityAccordion venueId={VENUE_ID} autoExtend={autoExtend()} maxAdvanceDays={60} onSaved={vi.fn()} />,
      [templatesMock([template(false)])],
    );
    expand(/Future availability/);
    expect(screen.queryByText(NO_DEFAULT_WARNING)).toBeNull();

    fireEvent.click(screen.getByRole('switch', { name: 'Auto-extend availability' }));
    await waitFor(() => expect(screen.getByText(NO_DEFAULT_WARNING)).toBeTruthy());
  });

  it('stays quiet when the venue already has a default template', async () => {
    renderWithProviders(
      <FutureAvailabilityAccordion venueId={VENUE_ID} autoExtend={autoExtend()} maxAdvanceDays={60} onSaved={vi.fn()} />,
      [templatesMock([template(true)])],
    );
    expand(/Future availability/);
    await waitFor(() => expect(screen.getByRole('switch', { name: 'Auto-extend availability' })).toBeTruthy());

    fireEvent.click(screen.getByRole('switch', { name: 'Auto-extend availability' }));
    await waitFor(() => expect(screen.queryByText(NO_DEFAULT_WARNING)).toBeNull());
  });

  it('clamps the horizon to the venue cap on blur', () => {
    renderWithProviders(
      <FutureAvailabilityAccordion
        venueId={VENUE_ID}
        autoExtend={autoExtend({ enabled: true })}
        maxAdvanceDays={60}
        onSaved={vi.fn()}
      />,
      [templatesMock([template(true)])],
    );
    expand(/Future availability/);
    const horizon = screen.getByLabelText(HORIZON_LABEL);

    fireEvent.change(horizon, { target: { value: '999' } });
    expect((horizon as HTMLInputElement).value).toBe('999');
    fireEvent.blur(horizon);
    expect((horizon as HTMLInputElement).value).toBe('60');

    fireEvent.change(horizon, { target: { value: '0' } });
    fireEvent.blur(horizon);
    expect((horizon as HTMLInputElement).value).toBe('1');
  });

  it('saves the clamped horizon and confirms it', async () => {
    let saved: any = null;
    const onSaved = vi.fn();
    renderWithProviders(
      <FutureAvailabilityAccordion
        venueId={VENUE_ID}
        autoExtend={autoExtend({ enabled: true, until: '2030-01-31', template_id: 't1' })}
        maxAdvanceDays={45}
        onSaved={onSaved}
      />,
      [templatesMock([template(true)]), capturingMock(UPDATE_VENUE_SETTINGS, { updateVenueSettings: savedVenue }, (v) => { saved = v; })],
    );
    expand(/Future availability/);

    // 120 is over this venue's 45-day cap — the save must send the clamped value.
    fireEvent.change(screen.getByLabelText('Keep published ahead (days, max 45)'), { target: { value: '120' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save auto-extend' }));

    await waitFor(() => expect(screen.getByText('Auto-extend saved.')).toBeTruthy());
    expect(saved).toEqual({
      venue_doc_id: VENUE_ID,
      input: { auto_extend: { enabled: true, horizon_days: 45, until: '2030-01-31', template_id: 't1' } },
    });
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('picks a stop-on date, clears it, and sends an empty one', async () => {
    let saved: any = null;
    renderWithProviders(
      <FutureAvailabilityAccordion
        venueId={VENUE_ID}
        autoExtend={autoExtend({ enabled: true })}
        maxAdvanceDays={60}
        onSaved={vi.fn()}
      />,
      [templatesMock([template(true)]), capturingMock(UPDATE_VENUE_SETTINGS, { updateVenueSettings: savedVenue }, (v) => { saved = v; })],
    );
    expand(/Future availability/);
    expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull();

    setDate('Stop on (optional)', '2031-03-01T00:00:00');
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull();

    setDate('Stop on (optional)', '2031-03-02T00:00:00');
    setDate('Stop on (optional)', '');
    fireEvent.click(screen.getByRole('button', { name: 'Save auto-extend' }));
    await waitFor(() => expect(saved?.input.auto_extend.until).toBe(''));
  });

  it('reports a failed save, and shows the busy label while one is in flight', async () => {
    renderWithProviders(
      <FutureAvailabilityAccordion
        venueId={VENUE_ID}
        autoExtend={autoExtend({ enabled: true })}
        maxAdvanceDays={60}
        onSaved={vi.fn()}
      />,
      [templatesMock([template(true)]), failingMock(UPDATE_VENUE_SETTINGS, 'Venue is not approved'), slowMock(UPDATE_VENUE_SETTINGS, { updateVenueSettings: savedVenue })],
    );
    expand(/Future availability/);
    expect(screen.queryByText('Could not save auto-extend. Please try again.')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Save auto-extend' }));
    await waitFor(() => expect(screen.getByText('Could not save auto-extend. Please try again.')).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'Save auto-extend' }));
    expect(await screen.findByRole('button', { name: 'Saving…' })).toBeDisabled();
  });
});

describe('BulkActionsAccordion', () => {
  it('asks for confirmation and does nothing when it is cancelled', async () => {
    renderWithProviders(<BulkActionsAccordion venueId={VENUE_ID} onDone={vi.fn()} />);
    expand(/Bulk actions/);

    fireEvent.click(screen.getByRole('button', { name: 'Delete matching' }));
    expect(screen.getByText('Delete all matching upcoming slots? This cannot be undone.')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByText('Delete all matching upcoming slots? This cannot be undone.')).toBeNull());
    expect(screen.queryByText(/slot\(s\)\./)).toBeNull();
  });

  it('sends the picked weekdays as the delete filter and reports the count', async () => {
    let deleted: any = null;
    const onDone = vi.fn();
    renderWithProviders(<BulkActionsAccordion venueId={VENUE_ID} onDone={onDone} />, [
      capturingMock(
        BULK_DELETE_VENUE_SLOTS,
        { bulkDeleteVenueSlots: { __typename: 'BulkSlotResult', matched: 3, affected: 3, skipped: 0 } },
        (v) => { deleted = v; },
      ),
    ]);
    expand(/Bulk actions/);

    fireEvent.click(screen.getByText('Weekdays'));
    fireEvent.click(screen.getByRole('button', { name: 'Delete matching' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => expect(screen.getByText('Deleted 3 slot(s).')).toBeTruthy());
    expect(deleted).toEqual({ input: { venue_id: VENUE_ID, weekdays: [1, 2, 3, 4, 5] } });
    expect(onDone).toHaveBeenCalledTimes(1);

    // The confirm dialog is still leaving, which keeps the page aria-hidden for
    // a moment — so the dismiss button is looked up inside the alert itself.
    const alert = screen.getByText('Deleted 3 slot(s).').closest('[role="alert"]') as HTMLElement;
    fireEvent.click(within(alert).getByRole('button', { hidden: true }));
    await waitFor(() => expect(screen.queryByText('Deleted 3 slot(s).')).toBeNull());
  });

  it('sends the picked From/To dates as an ISO window', async () => {
    let deleted: any = null;
    renderWithProviders(<BulkActionsAccordion venueId={VENUE_ID} onDone={vi.fn()} />, [
      capturingMock(
        BULK_DELETE_VENUE_SLOTS,
        { bulkDeleteVenueSlots: { __typename: 'BulkSlotResult', matched: 1, affected: 1, skipped: 0 } },
        (v) => { deleted = v; },
      ),
    ]);
    expand(/Bulk actions/);

    setDate('From', '2030-12-25T00:00:00');
    setDate('To', '2030-12-31T00:00:00');
    fireEvent.click(screen.getByRole('button', { name: 'Delete matching' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => expect(screen.getByText('Deleted 1 slot(s).')).toBeTruthy());
    expect(deleted).toEqual({
      input: {
        venue_id: VENUE_ID,
        from: new Date(2030, 11, 25).toISOString(),
        to: new Date(2030, 11, 31).toISOString(),
      },
    });
  });

  it('blocks matching slots and mentions the skipped ones', async () => {
    let updated: any = null;
    renderWithProviders(<BulkActionsAccordion venueId={VENUE_ID} onDone={vi.fn()} />, [
      capturingMock(
        BULK_UPDATE_VENUE_SLOTS,
        { bulkUpdateVenueSlots: { __typename: 'BulkSlotResult', matched: 7, affected: 5, skipped: 2 } },
        (v) => { updated = v; },
      ),
    ]);
    expand(/Bulk actions/);

    fireEvent.click(screen.getByRole('button', { name: 'Disable' }));
    expect(screen.getByText('Disable (block) all matching slots?')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => expect(screen.getByText('Disabled: 5 updated, 2 skipped.')).toBeTruthy());
    expect(updated).toEqual({ input: { venue_id: VENUE_ID, block: true } });
  });

  it('unblocks matching slots and omits the skipped clause when nothing was skipped', async () => {
    let updated: any = null;
    renderWithProviders(<BulkActionsAccordion venueId={VENUE_ID} onDone={vi.fn()} />, [
      capturingMock(
        BULK_UPDATE_VENUE_SLOTS,
        { bulkUpdateVenueSlots: { __typename: 'BulkSlotResult', matched: 4, affected: 4, skipped: 0 } },
        (v) => { updated = v; },
      ),
    ]);
    expand(/Bulk actions/);

    fireEvent.click(screen.getByRole('button', { name: 'Enable' }));
    expect(screen.getByText('Enable (unblock) all matching slots?')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => expect(screen.getByText('Enabled: 4 updated.')).toBeTruthy());
    expect(updated).toEqual({ input: { venue_id: VENUE_ID, block: false } });
  });

  it('needs a price before re-pricing, and rounds the one it sends', async () => {
    let updated: any = null;
    renderWithProviders(<BulkActionsAccordion venueId={VENUE_ID} onDone={vi.fn()} />, [
      capturingMock(
        BULK_UPDATE_VENUE_SLOTS,
        { bulkUpdateVenueSlots: { __typename: 'BulkSlotResult', matched: 2, affected: 2, skipped: 0 } },
        (v) => { updated = v; },
      ),
    ]);
    expand(/Bulk actions/);

    const setPrice = screen.getByRole('button', { name: 'Set price' });
    expect((setPrice as HTMLButtonElement).disabled).toBe(true);

    // A price that is not a number is sent as zero rather than NaN.
    fireEvent.change(screen.getByLabelText('New price (₹)'), { target: { value: 'abc' } });
    fireEvent.click(screen.getByRole('button', { name: 'Set price' }));
    expect(screen.getByText('Re-price all matching upcoming slots to ₹0? Existing prices are overwritten.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByText(/to ₹0\?/)).toBeNull());

    fireEvent.change(screen.getByLabelText('New price (₹)'), { target: { value: '250.6' } });
    expect((screen.getByRole('button', { name: 'Set price' }) as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: 'Set price' }));
    expect(
      screen.getByText('Re-price all matching upcoming slots to ₹251? Existing prices are overwritten.'),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => expect(screen.getByText('Re-priced: 2 updated.')).toBeTruthy());
    expect(updated).toEqual({ input: { venue_id: VENUE_ID, set_price: 251 } });
  });

  it('shows the server message when a bulk delete fails', async () => {
    renderWithProviders(<BulkActionsAccordion venueId={VENUE_ID} onDone={vi.fn()} />, [
      failingMock(BULK_DELETE_VENUE_SLOTS, 'Slots are booked', {
        bulkDeleteVenueSlots: { __typename: 'BulkSlotResult', matched: 0, affected: 0, skipped: 0 },
      }),
    ]);
    expand(/Bulk actions/);
    expect(screen.queryByText('Slots are booked')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Delete matching' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => expect(screen.getByText('Slots are booked')).toBeTruthy());
  });

  it('counts nothing when a failed delete comes back without data', async () => {
    renderWithProviders(<BulkActionsAccordion venueId={VENUE_ID} onDone={vi.fn()} />, [
      failingMock(BULK_DELETE_VENUE_SLOTS, 'Delete refused'),
    ]);
    expand(/Bulk actions/);

    fireEvent.click(screen.getByRole('button', { name: 'Delete matching' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(screen.getByText('Deleted 0 slot(s).')).toBeTruthy());
    expect(screen.getByText('Delete refused')).toBeTruthy();
  });

  it('counts nothing when a failed update comes back without data', async () => {
    renderWithProviders(<BulkActionsAccordion venueId={VENUE_ID} onDone={vi.fn()} />, [
      failingMock(BULK_UPDATE_VENUE_SLOTS, 'Update refused'),
    ]);
    expand(/Bulk actions/);

    fireEvent.click(screen.getByRole('button', { name: 'Enable' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(screen.getByText('Enabled: 0 updated.')).toBeTruthy());
    expect(screen.getByText('Update refused')).toBeTruthy();
  });
});

describe('VenueRulesAccordion', () => {
  it('edits the numbers within their bounds, flips a toggle and saves the rules', async () => {
    let saved: any = null;
    const onSaved = vi.fn();
    renderWithProviders(
      <VenueRulesAccordion venueId={VENUE_ID} rules={DEFAULT_VENUE_RULES} onSaved={onSaved} />,
      [capturingMock(UPDATE_VENUE_SETTINGS, { updateVenueSettings: savedVenue }, (v) => { saved = v; })],
    );
    expand(/Venue rules/);

    fireEvent.change(screen.getByLabelText('Buffer between slots (min)'), { target: { value: '15' } });
    fireEvent.change(screen.getByLabelText('Maximum advance booking (days)'), { target: { value: '999' } });
    expect(screen.getByLabelText('Maximum advance booking (days)')).toHaveValue(60);
    fireEvent.change(screen.getByLabelText('Maximum advance booking (days)'), { target: { value: '30' } });
    fireEvent.change(screen.getByLabelText('Maximum bookings per slot'), { target: { value: 'abc' } });
    expect(screen.getByLabelText('Maximum bookings per slot')).toHaveValue(0);
    fireEvent.click(screen.getByRole('switch', { name: 'Allow waitlist' }));

    fireEvent.click(screen.getByRole('button', { name: 'Save rules' }));
    await waitFor(() => expect(screen.getByText('Venue rules saved.')).toBeTruthy());
    expect(saved).toEqual({
      venue_doc_id: VENUE_ID,
      input: {
        rules: {
          ...DEFAULT_VENUE_RULES,
          buffer_minutes: 15,
          max_advance_days: 30,
          max_bookings_per_slot: 0,
          allow_waitlist: true,
        },
      },
    });
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('shows the server message on a failed save, and the busy label while saving', async () => {
    renderWithProviders(
      <VenueRulesAccordion venueId={VENUE_ID} rules={DEFAULT_VENUE_RULES} onSaved={vi.fn()} />,
      [failingMock(UPDATE_VENUE_SETTINGS, 'Venue is not approved'), slowMock(UPDATE_VENUE_SETTINGS, { updateVenueSettings: savedVenue })],
    );
    expand(/Venue rules/);

    fireEvent.click(screen.getByRole('button', { name: 'Save rules' }));
    await waitFor(() => expect(screen.getByText('Venue is not approved')).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'Save rules' }));
    expect(await screen.findByRole('button', { name: 'Saving…' })).toBeDisabled();
  });
});

describe('SaveAsTemplateAccordion', () => {
  const spaces: SpaceRow[] = [
    { label: 'Hall', capacity: 50, price: '399', enabled: false },
    { label: 'Roof', capacity: 20, price: '650', enabled: true },
  ];
  const form = (over: Partial<RecurringForm> = {}): RecurringForm => ({ ...initialRecurringForm(spaces), ...over });

  it('lists the saved templates and applies one to the form', async () => {
    const patch = vi.fn();
    renderWithProviders(<SaveAsTemplateAccordion venueId={VENUE_ID} form={form()} patch={patch} />, [
      templatesMock([template(true)]),
    ]);
    expand(/Save as template/);

    await waitFor(() => expect(screen.getByText('Weekday evenings')).toBeTruthy());
    expect(screen.getByText('Default')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Use' }));
    expect(patch).toHaveBeenCalledTimes(1);
    const applied = patch.mock.calls[0][0];
    expect(applied.weekdays).toEqual([1, 2, 3, 4, 5]);
    expect(applied.timeSlots).toHaveLength(1);
    expect(applied.timeSlots[0].start.getHours()).toBe(18);
    expect(applied.spaces.map((s: SpaceRow) => s.price)).toEqual(['499', '499']);
    expect(applied.skipHolidays).toBe(false);

    fireEvent.click(screen.getByText('Weekday evenings'));
    expect(patch).toHaveBeenCalledTimes(2);
  });

  it('deletes a template and refetches the list', async () => {
    let deleted: any = null;
    renderWithProviders(<SaveAsTemplateAccordion venueId={VENUE_ID} form={form()} patch={vi.fn()} />, [
      templatesMock([template(false)]),
      capturingMock(DELETE_SLOT_TEMPLATE, { deleteSlotTemplate: true }, (v) => { deleted = v; }),
    ]);
    expand(/Save as template/);

    fireEvent.click(await screen.findByRole('button', { name: 'Delete Weekday evenings' }));
    await waitFor(() => expect(deleted).toEqual({ id: 't1' }));
    expect(screen.queryByText('Default')).toBeNull();
  });

  it('saves the current setup under a name, priced from the first enabled space', async () => {
    let created: any = null;
    renderWithProviders(<SaveAsTemplateAccordion venueId={VENUE_ID} form={form()} patch={vi.fn()} />, [
      templatesMock([]),
      capturingMock(CREATE_SLOT_TEMPLATE, { createSlotTemplate: template(false, 't2') }, (v) => { created = v; }),
    ]);
    expand(/Save as template/);

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Template name'), { target: { value: '  Evenings ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(created).not.toBeNull());
    expect(created).toEqual({
      input: {
        venue_id: VENUE_ID,
        name: 'Evenings',
        config: {
          weekdays: [0, 1, 2, 3, 4, 5, 6],
          start_time: '13:00',
          end_time: '14:00',
          default_price: 650,
          per_day_price: [],
          skip_weekly_off: true,
          skip_holidays: true,
        },
      },
    });
    await waitFor(() => expect(screen.getByLabelText('Template name')).toHaveValue(''));
  });

  it('falls back to the first space and blank times when the form is bare', async () => {
    let created: any = null;
    const bare = form({ timeSlots: [], spaces: [{ label: 'Hall', capacity: 50, price: '120', enabled: false }] });
    renderWithProviders(<SaveAsTemplateAccordion venueId={VENUE_ID} form={bare} patch={vi.fn()} />, [
      templatesMock([]),
      capturingMock(CREATE_SLOT_TEMPLATE, { createSlotTemplate: template(false, 't2') }, (v) => { created = v; }),
    ]);
    expand(/Save as template/);
    fireEvent.change(screen.getByLabelText('Template name'), { target: { value: 'Bare' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(created).not.toBeNull());
    expect(created.input.config.start_time).toBe('');
    expect(created.input.config.end_time).toBe('');
    expect(created.input.config.default_price).toBe(120);

    const empty = form({ timeSlots: [], spaces: [] });
    renderWithProviders(<SaveAsTemplateAccordion venueId={VENUE_ID} form={empty} patch={vi.fn()} />, [
      templatesMock([]),
      capturingMock(CREATE_SLOT_TEMPLATE, { createSlotTemplate: template(false, 't3') }, (v) => { created = v; }),
    ]);
    fireEvent.click(screen.getAllByRole('button', { name: /Save as template/ })[1]);
    fireEvent.change(screen.getAllByLabelText('Template name')[1], { target: { value: 'Empty' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Save' })[1]);
    await waitFor(() => expect(created?.input.name).toBe('Empty'));
    expect(created.input.config.default_price).toBe(0);
  });

  it('shows the server message on a failed save, and the busy label while saving', async () => {
    renderWithProviders(<SaveAsTemplateAccordion venueId={VENUE_ID} form={form()} patch={vi.fn()} />, [
      templatesMock([]),
      failingMock(CREATE_SLOT_TEMPLATE, 'Name already used'),
      slowMock(CREATE_SLOT_TEMPLATE, { createSlotTemplate: template(false, 't2') }),
    ]);
    expand(/Save as template/);
    fireEvent.change(screen.getByLabelText('Template name'), { target: { value: 'Evenings' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.getByText('Name already used')).toBeTruthy());

    fireEvent.change(screen.getByLabelText('Template name'), { target: { value: 'Evenings' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('button', { name: 'Saving…' })).toBeDisabled();
  });
});
