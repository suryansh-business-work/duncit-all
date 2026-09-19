import { describe, expect, it } from 'vitest';
import {
  HOST_VARIABLES,
  VENUE_VARIABLES,
  hostVariableValues,
  leadVariablesFor,
  venueVariableValues,
} from '@/config/leadVariables';
import { hostLead, venueLead } from '../fixtures/leads';

describe('leadVariablesFor', () => {
  it('offers the catalogue matching the lead kind', () => {
    expect(leadVariablesFor('HOST_LEAD')).toBe(HOST_VARIABLES);
    expect(leadVariablesFor('VENUE_LEAD')).toBe(VENUE_VARIABLES);
  });
});

describe('venueVariableValues', () => {
  it('reads every slug from the lead and its primary contact', () => {
    expect(venueVariableValues(venueLead())).toEqual({
      venue_name: 'Grand Hall',
      super_category: 'Events',
      space_type: 'Indoor',
      city: 'Pune',
      area: 'Baner',
      full_address: '12 Baner Road, Pune',
      contact_name: 'Meera Shah',
      contact_email: 'meera@grandhall.in',
      contact_mobile: '9812345678',
      website: 'https://grandhall.in',
      lead_status: 'New',
      priority: 'High',
    });
  });

  it('blanks the slugs a lead leaves empty', () => {
    const values = venueVariableValues(venueLead({ super_category: null, space_type: null, area: null, website: null, contacts: [] }));

    expect(values).toMatchObject({ super_category: '', space_type: '', area: '', website: '', contact_name: '', contact_email: '', contact_mobile: '' });
  });
});

describe('hostVariableValues', () => {
  it('reads every slug from the lead and its primary contact', () => {
    expect(hostVariableValues(hostLead())).toEqual({
      host_name: 'Pune Runners',
      organization_name: 'Pune Runners Club',
      host_type: 'Community',
      super_category: 'Events',
      city: 'Pune',
      area: 'Aundh',
      contact_name: 'Arjun Rao',
      contact_email: 'arjun@puneRunners.in',
      contact_mobile: '9822000000',
      website: '',
      lead_status: 'New',
      priority: 'High',
    });
  });

  it('blanks the slugs a lead leaves empty', () => {
    const values = hostVariableValues(hostLead({ organization_name: null, host_type: null, city: null, area: null, contacts: [] }));

    expect(values).toMatchObject({ organization_name: '', host_type: '', city: '', area: '', contact_name: '' });
  });
});
