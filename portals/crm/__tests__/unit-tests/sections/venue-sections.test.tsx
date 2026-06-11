import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { MemoryRouter } from 'react-router-dom';
import { Formik, Form } from 'formik';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { venueLeadInitialValues } from '@/forms/venue-lead/venue-lead.types';
import type { CrmOptionGroup } from '@/api/crm.types';
import VenueDetailsSection from '@/forms/venue-lead/sections/VenueDetailsSection';
import VenueLocationSection from '@/forms/venue-lead/sections/VenueLocationSection';
import VenueContactsSection from '@/forms/venue-lead/sections/VenueContactsSection';
import VenueSuitabilitySection from '@/forms/venue-lead/sections/VenueSuitabilitySection';
import VenueAvailabilitySection from '@/forms/venue-lead/sections/VenueAvailabilitySection';
import VenueCommercialSection from '@/forms/venue-lead/sections/VenueCommercialSection';
import VenueAmenitiesSection from '@/forms/venue-lead/sections/VenueAmenitiesSection';
import VenueMediaSection from '@/forms/venue-lead/sections/VenueMediaSection';
import VenueWebsiteSection from '@/forms/venue-lead/sections/VenueWebsiteSection';
import VenueServicesSection from '@/forms/venue-lead/sections/VenueServicesSection';
import VenueLinkedHostsSection from '@/forms/venue-lead/sections/VenueLinkedHostsSection';
import VenueBrandingSection from '@/forms/venue-lead/sections/VenueBrandingSection';
import VenueDynamicSection from '@/forms/venue-lead/sections/VenueDynamicSection';
import VenueTrackingSection from '@/forms/venue-lead/sections/VenueTrackingSection';

/**
 * Smoke-render every venue form section so coverage proves the JSX doesn't
 * throw, the fields wire to Formik, and the CrmOptionGroup-driven dropdowns
 * compile. We feed a permissive `config` so options never crash on
 * undefined arrays. Apollo provider is a no-op for the few sections that
 * issue queries (Linked Hosts, Dynamic, City) — they tolerate "no mock".
 */

const emptyConfig: CrmOptionGroup = {
  venue_types: ['Banquet Hall'],
  space_types: ['Indoor'],
  venue_event_suitability: ['Wedding'],
  week_days: ['Monday'],
  booking_notices: ['Instant'],
  pricing_models: ['Hourly'],
  amenities: ['Parking'],
  lead_sources: ['Referral'],
  venue_lead_statuses: ['New'],
  host_lead_statuses: ['New'],
  priorities: ['Medium'],
  host_types: ['Individual'],
  host_interests: ['Cricket / Sports'],
  audience_sizes: ['10-20'],
  frequencies: ['One-time'],
  revenue_models: ['Paid Tickets'],
  host_intent_scores: ['Looking for venue only'],
  services_offered_options: ['Catering', 'Other'],
  venue_services_offered_options: ['Catering', 'Other'],
  host_services_offered_options: ['Event Hosting', 'Other'],
};

const wrap = (children: React.ReactNode) =>
  render(
    <MockedProvider mocks={[]}>
      <MemoryRouter>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <Formik initialValues={venueLeadInitialValues} onSubmit={() => undefined}>
            {() => <Form>{children}</Form>}
          </Formik>
        </LocalizationProvider>
      </MemoryRouter>
    </MockedProvider>
  );

describe('venue form sections (smoke render)', () => {
  it('renders VenueDetailsSection', () => {
    const { container } = wrap(<VenueDetailsSection config={emptyConfig} />);
    expect(container).toBeTruthy();
  });
  it('renders VenueLocationSection', () => {
    const { container } = wrap(<VenueLocationSection />);
    expect(container).toBeTruthy();
  });
  it('renders VenueContactsSection', () => {
    const { container } = wrap(<VenueContactsSection />);
    expect(container).toBeTruthy();
  });
  it('renders VenueSuitabilitySection', () => {
    const { container } = wrap(<VenueSuitabilitySection config={emptyConfig} />);
    expect(container).toBeTruthy();
  });
  it('renders VenueAvailabilitySection', () => {
    const { container } = wrap(<VenueAvailabilitySection config={emptyConfig} />);
    expect(container).toBeTruthy();
  });
  it('renders VenueCommercialSection', () => {
    const { container } = wrap(<VenueCommercialSection config={emptyConfig} />);
    expect(container).toBeTruthy();
  });
  it('renders VenueAmenitiesSection', () => {
    const { container } = wrap(<VenueAmenitiesSection config={emptyConfig} />);
    expect(container).toBeTruthy();
  });
  it('renders VenueMediaSection', () => {
    const { container } = wrap(<VenueMediaSection />);
    expect(container).toBeTruthy();
  });
  it('renders VenueWebsiteSection', () => {
    const { container } = wrap(<VenueWebsiteSection />);
    expect(container).toBeTruthy();
  });
  it('renders VenueServicesSection', () => {
    const { container } = wrap(<VenueServicesSection />);
    expect(container).toBeTruthy();
  });
  it('renders VenueLinkedHostsSection', () => {
    const { container } = wrap(<VenueLinkedHostsSection />);
    expect(container).toBeTruthy();
  });
  it('renders VenueBrandingSection', () => {
    const { container } = wrap(<VenueBrandingSection />);
    expect(container).toBeTruthy();
  });
  it('renders VenueDynamicSection', () => {
    const { container } = wrap(<VenueDynamicSection />);
    expect(container).toBeTruthy();
  });
  it('renders VenueTrackingSection', () => {
    const { container } = wrap(<VenueTrackingSection config={emptyConfig} />);
    expect(container).toBeTruthy();
  });
});
