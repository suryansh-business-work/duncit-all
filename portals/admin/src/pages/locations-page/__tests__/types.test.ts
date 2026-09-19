import { describe, expect, it } from 'vitest';
import { DEFAULT_LAUNCH_TARGET } from '@duncit/utils';
import {
  blankForm,
  buildLocationInput,
  launchTargetError,
  whatsappGroupUrlError,
  type LocForm,
} from '../types';

const validForm = (over: Partial<LocForm> = {}): LocForm => ({
  ...blankForm,
  country: 'India',
  country_code: 'IN',
  state: 'Karnataka',
  state_code: 'KA',
  city: 'Bengaluru',
  location_image: 'https://cdn.test/bengaluru.jpg',
  location_pincode: '560001',
  zones: [{ zone_name: 'Koramangala', zone_code: '', pincode: '560034' }],
  ...over,
});

describe('buildLocationInput — required fields', () => {
  it('throws when the country is missing', () => {
    expect(() => buildLocationInput(validForm({ country_code: '  ' }))).toThrow('Country is required');
  });

  it('throws when the state is missing', () => {
    expect(() => buildLocationInput(validForm({ state: '  ' }))).toThrow('State is required');
  });

  it('throws when the city is missing', () => {
    expect(() => buildLocationInput(validForm({ city: '  ' }))).toThrow('City is required');
  });

  it('throws when every zone name is blank', () => {
    expect(() =>
      buildLocationInput(validForm({ zones: [{ zone_name: '  ', zone_code: '', pincode: '560034' }] }))
    ).toThrow('At least one locality / area is required');
  });

  it('throws when any named zone is missing a pincode', () => {
    expect(() =>
      buildLocationInput(
        validForm({
          zones: [
            { zone_name: 'Koramangala', zone_code: '', pincode: '560034' },
            { zone_name: 'Indiranagar', zone_code: '', pincode: '  ' },
          ],
        })
      )
    ).toThrow('PIN code is required for every locality / area');
  });

  it('throws when the location image URL is missing', () => {
    expect(() => buildLocationInput(validForm({ location_image: '  ' }))).toThrow(
      'Location image URL is required'
    );
  });
});

describe('buildLocationInput — zone cleanup', () => {
  it('drops blank zone rows and trims the surviving ones', () => {
    const input = buildLocationInput(
      validForm({
        zones: [
          { zone_name: '  ', zone_code: '', pincode: '' },
          { zone_name: '  Koramangala  ', zone_code: '', pincode: '  560034  ' },
        ],
      })
    );
    expect(input.location_zones).toEqual([{ zone_name: 'Koramangala', pincode: '560034' }]);
  });
});

describe('buildLocationInput — primary pincode fallback', () => {
  it('uses the explicit location_pincode when given', () => {
    const input = buildLocationInput(validForm({ location_pincode: '560099' }));
    expect(input.location_pincode).toBe('560099');
  });

  it('falls back to the first zone pincode when location_pincode is blank', () => {
    const input = buildLocationInput(
      validForm({
        location_pincode: '  ',
        zones: [{ zone_name: 'Koramangala', zone_code: '', pincode: '560034' }],
      })
    );
    expect(input.location_pincode).toBe('560034');
  });
});

describe('buildLocationInput — happy path shape', () => {
  it('builds the create/update mutation input', () => {
    const input = buildLocationInput(validForm());
    expect(input).toEqual({
      location_name: 'Bengaluru',
      country: 'India',
      country_code: 'IN',
      state: 'Karnataka',
      state_code: 'KA',
      city: 'Bengaluru',
      location_image: 'https://cdn.test/bengaluru.jpg',
      location_pincode: '560001',
      location_zones: [{ zone_name: 'Koramangala', pincode: '560034' }],
      is_launched: true,
      launch_target: DEFAULT_LAUNCH_TARGET,
      whatsapp_group_url: '',
    });
  });

  it('sends the launch target as a number and the group link trimmed', () => {
    const input = buildLocationInput(
      validForm({ is_launched: false, launch_target: '750', whatsapp_group_url: '  https://chat.whatsapp.com/AbC  ' }),
    );
    expect(input.is_launched).toBe(false);
    expect(input.launch_target).toBe(750);
    expect(input.whatsapp_group_url).toBe('https://chat.whatsapp.com/AbC');
  });
});

describe('launchTargetError', () => {
  it('accepts a whole number from 1 to 1,000,000', () => {
    expect(launchTargetError('1')).toBeNull();
    expect(launchTargetError('2000')).toBeNull();
    expect(launchTargetError('1000000')).toBeNull();
  });

  it('rejects a blank, fractional, zero or too-large target', () => {
    for (const value of ['', '   ', '1.5', '0', '-4', '1000001', 'abc']) {
      expect(launchTargetError(value)).toBe('admin.locations.launchTargetInvalid');
    }
  });
});

describe('whatsappGroupUrlError', () => {
  it('treats the link as optional', () => {
    expect(whatsappGroupUrlError('')).toBeNull();
    expect(whatsappGroupUrlError('   ')).toBeNull();
  });

  it('accepts a WhatsApp group invite link, surrounding spaces included', () => {
    expect(whatsappGroupUrlError(' https://chat.whatsapp.com/AbC123 ')).toBeNull();
  });

  it('rejects any other address', () => {
    expect(whatsappGroupUrlError('https://example.com/group')).toBe('admin.locations.whatsappGroupUrlInvalid');
    expect(whatsappGroupUrlError('http://chat.whatsapp.com/AbC')).toBe('admin.locations.whatsappGroupUrlInvalid');
  });
});

describe('blankForm', () => {
  it('provides an empty form with India pre-selected and one blank zone', () => {
    expect(blankForm.country).toBe('India');
    expect(blankForm.country_code).toBe('IN');
    expect(blankForm.zones).toEqual([{ zone_name: '', zone_code: '', pincode: '' }]);
  });
});
