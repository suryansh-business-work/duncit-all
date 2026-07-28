import { describe, expect, it } from 'vitest';
import { argumentsAt, fieldsAt, operationOf, variablesOf } from '../../../__tests__/gql-contract';
import {
  FINAL,
  MY_VENUE,
  MY_VENUES,
  REGISTRATION_CONFIG,
  STEP1,
  STEP2,
  STEP3,
  UPDATE_APPROVED_VENUE,
  UPDATE_VENUE_HOLIDAYS,
} from '../queries';

describe('MY_VENUE', () => {
  it('keeps venue_id optional so /new can run without one', () => {
    expect(operationOf(MY_VENUE)).toEqual({ name: 'MyVenue', type: 'query' });
    expect(variablesOf(MY_VENUE)).toEqual({ venue_id: 'ID' });
    expect(argumentsAt(MY_VENUE, 'myVenue')).toEqual({ venue_id: '$venue_id' });
  });

  it('loads the account, the venue and the location catalogue in one round trip', () => {
    expect(fieldsAt(MY_VENUE)).toEqual(['me', 'myVenue', 'locations']);
    expect(fieldsAt(MY_VENUE, 'me')).toEqual([
      'user_id',
      'full_name',
      'first_name',
      'last_name',
      'email',
    ]);
  });

  it('asks the server for active locations only, so the picker cannot offer a dead one', () => {
    expect(argumentsAt(MY_VENUE, 'locations').filter).toMatch(/is_active:\s*true/);
  });

  it('returns the zone tuples the address step needs to resolve a pincode', () => {
    expect(fieldsAt(MY_VENUE, 'locations', 'location_zones')).toEqual([
      'zone_name',
      'zone_code',
      'pincode',
    ]);
    expect(fieldsAt(MY_VENUE, 'locations')).toEqual(
      expect.arrayContaining(['country_code', 'state_code', 'city', 'location_pincode']),
    );
  });

  it('returns status and step_completed, which decide resume vs view vs edit-approved', () => {
    const venue = fieldsAt(MY_VENUE, 'myVenue');
    expect(venue).toContain('status');
    expect(venue).toContain('step_completed');
    expect(venue).toContain('reviewer_notes');
  });

  it('selects every field the three wizard steps prefill', () => {
    const venue = fieldsAt(MY_VENUE, 'myVenue');
    expect(venue).toEqual(
      expect.arrayContaining([
        'venue_name',
        'venue_type',
        'capacity',
        'description',
        'amenities',
        'facilities',
        'security',
        'location_id',
        'country',
        'state',
        'city',
        'locality',
        'postal_code',
        'address_line1',
        'address_line2',
        'cover_image_url',
        'gallery',
        'gstin',
        'pan',
        'owner_name',
        'owner_email',
        'owner_phone',
        'owner_dob',
        'owner_address',
      ]),
    );
  });

  it('expands the repeatable capacity, category and document groups', () => {
    expect(fieldsAt(MY_VENUE, 'myVenue', 'capacity_items')).toEqual(['label', 'capacity']);
    expect(fieldsAt(MY_VENUE, 'myVenue', 'documents')).toEqual(['type', 'url']);
    expect(fieldsAt(MY_VENUE, 'myVenue', 'venue_category')).toEqual([
      'super_category_id',
      'category_id',
      'sub_category_id',
      'super_category_name',
      'category_name',
      'sub_category_name',
    ]);
  });

  it('pulls only holidays out of settings — the rest belongs to the availability page', () => {
    expect(fieldsAt(MY_VENUE, 'myVenue', 'settings')).toEqual(['holidays']);
  });
});

describe('MY_VENUES', () => {
  it('is a parameterless list used by the dashboard, slots and availability pages', () => {
    expect(operationOf(MY_VENUES)).toEqual({ name: 'MyVenues', type: 'query' });
    expect(variablesOf(MY_VENUES)).toEqual({});
    expect(fieldsAt(MY_VENUES)).toEqual(['myVenues']);
  });

  it('carries the full settings fragment, not just holidays', () => {
    expect(fieldsAt(MY_VENUES, 'myVenues', 'settings')).toEqual([
      'operating_hours',
      'weekly_off_days',
      'holidays',
      'rules',
      'auto_extend',
    ]);
  });

  it('expands operating hours and every booking rule the availability page reads', () => {
    expect(fieldsAt(MY_VENUES, 'myVenues', 'settings', 'operating_hours')).toEqual(['open', 'close']);
    expect(fieldsAt(MY_VENUES, 'myVenues', 'settings', 'rules')).toEqual([
      'buffer_minutes',
      'min_notice_minutes',
      'max_advance_days',
      'max_bookings_per_slot',
      'allow_instant_booking',
      'allow_waitlist',
      'booking_approval_required',
      'allow_multiple_bookings',
    ]);
  });

  it('expands auto-extend so the recurring scheduler knows its horizon', () => {
    expect(fieldsAt(MY_VENUES, 'myVenues', 'settings', 'auto_extend')).toEqual([
      'enabled',
      'template_id',
      'horizon_days',
      'until',
    ]);
  });

  it('returns the card fields the venue list renders, without the registration payload', () => {
    const venue = fieldsAt(MY_VENUES, 'myVenues');
    expect(venue).toEqual(
      expect.arrayContaining(['id', 'status', 'venue_name', 'venue_type', 'cover_image_url', 'city']),
    );
    expect(venue).not.toContain('documents');
    expect(venue).not.toContain('gstin');
  });
});

describe('REGISTRATION_CONFIG', () => {
  it('is parameterless and returns every option list the wizard renders', () => {
    expect(operationOf(REGISTRATION_CONFIG)).toEqual({
      name: 'VenueRegistrationConfig',
      type: 'query',
    });
    expect(variablesOf(REGISTRATION_CONFIG)).toEqual({});
    expect(fieldsAt(REGISTRATION_CONFIG, 'venueRegistrationConfig')).toEqual([
      'venue_types',
      'doc_types',
      'capacity_item_limit',
      'amenities',
      'facilities',
      'security',
    ]);
  });
});

describe('wizard step mutations', () => {
  const steps = [
    { label: 'step 1', doc: STEP1, operation: 'V1', field: 'submitVenueStep1', input: 'VenueStep1Input!' },
    { label: 'step 2', doc: STEP2, operation: 'V2', field: 'submitVenueStep2', input: 'VenueStep2Input!' },
    { label: 'step 3', doc: STEP3, operation: 'V3', field: 'submitVenueStep3', input: 'VenueStep3Input!' },
  ];

  it.each(steps)('$label posts its own input and an optional venue_id', ({ doc, operation, field, input }) => {
    expect(operationOf(doc)).toEqual({ name: operation, type: 'mutation' });
    expect(variablesOf(doc)).toEqual({ input, venue_id: 'ID' });
    expect(argumentsAt(doc, field)).toEqual({ input: '$input', venue_id: '$venue_id' });
  });

  it.each(steps)('$label returns step_completed so the wizard can advance', ({ doc, field }) => {
    expect(fieldsAt(doc, field)).toContain('step_completed');
  });

  it('only step 1 returns status — that is where the draft record is created', () => {
    expect(fieldsAt(STEP1, 'submitVenueStep1')).toEqual(['id', 'step_completed', 'status']);
    expect(fieldsAt(STEP2, 'submitVenueStep2')).toEqual(['id', 'step_completed']);
    expect(fieldsAt(STEP3, 'submitVenueStep3')).toEqual(['id', 'step_completed']);
  });

  it('the final submit returns the new status and takes no input body', () => {
    expect(operationOf(FINAL)).toEqual({ name: 'VFinal', type: 'mutation' });
    expect(variablesOf(FINAL)).toEqual({ venue_id: 'ID' });
    expect(fieldsAt(FINAL, 'submitVenueFinal')).toEqual(['id', 'status']);
  });
});

describe('UPDATE_APPROVED_VENUE', () => {
  it('requires the venue id, unlike the draft steps that may create one', () => {
    expect(operationOf(UPDATE_APPROVED_VENUE)).toEqual({
      name: 'UpdateApprovedVenue',
      type: 'mutation',
    });
    expect(variablesOf(UPDATE_APPROVED_VENUE)).toEqual({
      venue_id: 'ID!',
      input: 'UpdateApprovedVenueInput!',
    });
    expect(variablesOf(STEP1).venue_id).toBe('ID');
  });

  it('returns updated_at so the spot-edit screen can show the save landed', () => {
    expect(fieldsAt(UPDATE_APPROVED_VENUE, 'updateApprovedVenue')).toEqual([
      'id',
      'status',
      'updated_at',
    ]);
  });
});

describe('UPDATE_VENUE_HOLIDAYS', () => {
  it('goes through updateVenueSettings, keyed by venue_doc_id not venue_id', () => {
    expect(operationOf(UPDATE_VENUE_HOLIDAYS)).toEqual({
      name: 'UpdateVenueHolidays',
      type: 'mutation',
    });
    expect(variablesOf(UPDATE_VENUE_HOLIDAYS)).toEqual({
      venue_doc_id: 'ID!',
      input: 'VenueSettingsInput!',
    });
    expect(fieldsAt(UPDATE_VENUE_HOLIDAYS)).toEqual(['updateVenueSettings']);
    expect(argumentsAt(UPDATE_VENUE_HOLIDAYS, 'updateVenueSettings')).toEqual({
      venue_doc_id: '$venue_doc_id',
      input: '$input',
    });
  });

  it('reads back only holidays, so a partial settings input cannot blank the rest', () => {
    expect(fieldsAt(UPDATE_VENUE_HOLIDAYS, 'updateVenueSettings', 'settings')).toEqual(['holidays']);
  });
});
