import type { ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import FutureAvailabilityAccordion from './accordions/FutureAvailabilityAccordion';
import BulkActionsAccordion from './accordions/BulkActionsAccordion';
import {
  BULK_DELETE_VENUE_SLOTS,
  BULK_UPDATE_VENUE_SLOTS,
  MY_SLOT_TEMPLATES,
  UPDATE_VENUE_SETTINGS,
} from './recurring.queries';
import type { VenueAutoExtendForm } from './settings-map';

afterEach(cleanup);

const VENUE_ID = 'venue-1';

// Both accordions fire their mutations from an un-caught async click handler, so
// a *rejecting* mutation would escape as an unhandled rejection and abort the
// run. `errorPolicy: 'all'` lets a failing mutation resolve while still filling
// the hook's `error`, which is exactly what drives the error Alerts under test.
const MUTATION_ERROR_POLICY = { mutate: { errorPolicy: 'all' as const } };

function renderWithProviders(ui: ReactElement, mocks: MockedResponse[] = []) {
  return render(
    <MockedProvider mocks={mocks} defaultOptions={MUTATION_ERROR_POLICY}>
      <LocalizationProvider dateAdapter={AdapterDateFns}>{ui}</LocalizationProvider>
    </MockedProvider>,
  );
}

const failingMock = (query: MockedResponse['request']['query'], message: string, data: unknown = null): MockedResponse => ({
  request: { query },
  variableMatcher: () => true,
  result: { data, errors: [new GraphQLError(message)] } as any,
});

/** Captures the variables a mutation was actually called with. */
const capturingMock = (query: MockedResponse['request']['query'], data: unknown, capture: (v: any) => void): MockedResponse => ({
  request: { query },
  variableMatcher: () => true,
  result: (variables: Record<string, any>) => {
    capture(variables);
    return { data } as any;
  },
});

const templatesMock = (isDefault: boolean): MockedResponse => ({
  request: { query: MY_SLOT_TEMPLATES, variables: { venue_id: VENUE_ID } },
  result: {
    data: {
      mySlotTemplates: [
        {
          __typename: 'SlotTemplate',
          id: 't1',
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
            skip_holidays: true,
          },
        },
      ],
    },
  },
});

const savedVenue = {
  __typename: 'Venue',
  id: VENUE_ID,
  settings: {
    __typename: 'VenueSettings',
    operating_hours: { __typename: 'VenueOperatingHours', open: '09:00', close: '23:00' },
    weekly_off_days: [],
    holidays: [],
    rules: {
      __typename: 'VenueRules',
      buffer_minutes: 0,
      min_notice_minutes: 0,
      max_advance_days: 60,
      max_bookings_per_slot: 1,
      allow_instant_booking: true,
      allow_waitlist: false,
      booking_approval_required: false,
      allow_multiple_bookings: false,
    },
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
const NO_DEFAULT_WARNING = /don't have a default template yet/i;

const expand = (name: RegExp) => fireEvent.click(screen.getByRole('button', { name }));

/** Fills a MUI X date field: pasting a whole value is the one deterministic way
 *  to set every section at once. */
const pasteDate = (input: HTMLElement, value: string) =>
  fireEvent.paste(input, { clipboardData: { getData: () => value } });

describe('FutureAvailabilityAccordion', () => {
  it('locks the window fields until auto-extend is switched on', () => {
    renderWithProviders(
      <FutureAvailabilityAccordion venueId={VENUE_ID} autoExtend={autoExtend()} maxAdvanceDays={60} onSaved={vi.fn()} />,
      [templatesMock(true)],
    );
    expand(/Future availability/);

    const horizon = screen.getByLabelText(HORIZON_LABEL) as HTMLInputElement;
    expect(horizon.disabled).toBe(true);
    expect(horizon.value).toBe('30');

    fireEvent.click(screen.getByRole('checkbox', { name: 'Auto-extend availability' }));
    expect((screen.getByLabelText(HORIZON_LABEL) as HTMLInputElement).disabled).toBe(false);
  });

  it('warns when auto-extend is switched on with no default template', async () => {
    renderWithProviders(
      <FutureAvailabilityAccordion venueId={VENUE_ID} autoExtend={autoExtend()} maxAdvanceDays={60} onSaved={vi.fn()} />,
      [templatesMock(false)],
    );
    expand(/Future availability/);
    expect(screen.queryByText(NO_DEFAULT_WARNING)).toBeNull();

    fireEvent.click(screen.getByRole('checkbox', { name: 'Auto-extend availability' }));
    await waitFor(() => expect(screen.getByText(NO_DEFAULT_WARNING)).toBeTruthy());
  });

  it('stays quiet when the venue already has a default template', async () => {
    renderWithProviders(
      <FutureAvailabilityAccordion venueId={VENUE_ID} autoExtend={autoExtend()} maxAdvanceDays={60} onSaved={vi.fn()} />,
      [templatesMock(true)],
    );
    expand(/Future availability/);
    await waitFor(() => expect(screen.getByRole('checkbox', { name: 'Auto-extend availability' })).toBeTruthy());

    fireEvent.click(screen.getByRole('checkbox', { name: 'Auto-extend availability' }));
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
      [templatesMock(true)],
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
      [templatesMock(true), capturingMock(UPDATE_VENUE_SETTINGS, { updateVenueSettings: savedVenue }, (v) => { saved = v; })],
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

  it('clears the stop-on date before saving', async () => {
    let saved: any = null;
    renderWithProviders(
      <FutureAvailabilityAccordion
        venueId={VENUE_ID}
        autoExtend={autoExtend({ enabled: true, until: '2030-01-31' })}
        maxAdvanceDays={60}
        onSaved={vi.fn()}
      />,
      [templatesMock(true), capturingMock(UPDATE_VENUE_SETTINGS, { updateVenueSettings: savedVenue }, (v) => { saved = v; })],
    );
    expand(/Future availability/);

    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Save auto-extend' }));
    await waitFor(() => expect(saved?.input.auto_extend.until).toBe(''));
  });

  it('reports a failed save', async () => {
    renderWithProviders(
      <FutureAvailabilityAccordion
        venueId={VENUE_ID}
        autoExtend={autoExtend({ enabled: true })}
        maxAdvanceDays={60}
        onSaved={vi.fn()}
      />,
      [templatesMock(true), failingMock(UPDATE_VENUE_SETTINGS, 'Venue is not approved')],
    );
    expand(/Future availability/);
    expect(screen.queryByText('Could not save auto-extend. Please try again.')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Save auto-extend' }));
    await waitFor(() => expect(screen.getByText('Could not save auto-extend. Please try again.')).toBeTruthy());
  });
});

describe('BulkActionsAccordion', () => {
  it('asks for confirmation and does nothing when it is cancelled', () => {
    renderWithProviders(<BulkActionsAccordion venueId={VENUE_ID} onDone={vi.fn()} />);
    expand(/Bulk actions/);

    fireEvent.click(screen.getByRole('button', { name: 'Delete matching' }));
    expect(screen.getByText('Delete all matching upcoming slots? This cannot be undone.')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByText('Delete all matching upcoming slots? This cannot be undone.')).toBeNull();
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

    pasteDate(screen.getByLabelText('From'), '12/25/2030');
    pasteDate(screen.getByLabelText('To'), '12/31/2030');
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
});
