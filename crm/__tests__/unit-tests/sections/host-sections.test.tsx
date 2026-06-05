import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { MemoryRouter } from 'react-router-dom';
import { Formik, Form } from 'formik';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { hostLeadInitialValues } from '@/forms/host-lead/host-lead.types';
import type { CrmOptionGroup } from '@/api/crm.types';
import HostBasicSection from '@/forms/host-lead/sections/HostBasicSection';
import HostContactsSection from '@/forms/host-lead/sections/HostContactsSection';
import HostPreferencesSection from '@/forms/host-lead/sections/HostPreferencesSection';
import HostBudgetSection from '@/forms/host-lead/sections/HostBudgetSection';
import HostTimelineSection from '@/forms/host-lead/sections/HostTimelineSection';
import HostReachSection from '@/forms/host-lead/sections/HostReachSection';
import HostWebsiteSection from '@/forms/host-lead/sections/HostWebsiteSection';
import HostServicesSection from '@/forms/host-lead/sections/HostServicesSection';
import HostBrandingSection from '@/forms/host-lead/sections/HostBrandingSection';
import HostDynamicSection from '@/forms/host-lead/sections/HostDynamicSection';
import HostTrackingSection from '@/forms/host-lead/sections/HostTrackingSection';

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
          <Formik initialValues={hostLeadInitialValues} onSubmit={() => undefined}>
            {() => <Form>{children}</Form>}
          </Formik>
        </LocalizationProvider>
      </MemoryRouter>
    </MockedProvider>
  );

describe('host form sections (smoke render)', () => {
  it('renders HostBasicSection', () => {
    const { container } = wrap(<HostBasicSection config={emptyConfig} />);
    expect(container).toBeTruthy();
  });
  it('renders HostContactsSection', () => {
    const { container } = wrap(<HostContactsSection />);
    expect(container).toBeTruthy();
  });
  it('renders HostPreferencesSection', () => {
    const { container } = wrap(<HostPreferencesSection config={emptyConfig} />);
    expect(container).toBeTruthy();
  });
  it('renders HostBudgetSection', () => {
    const { container } = wrap(<HostBudgetSection config={emptyConfig} />);
    expect(container).toBeTruthy();
  });
  it('renders HostTimelineSection', () => {
    const { container } = wrap(<HostTimelineSection config={emptyConfig} />);
    expect(container).toBeTruthy();
  });
  it('renders HostReachSection', () => {
    const { container } = wrap(<HostReachSection />);
    expect(container).toBeTruthy();
  });
  it('renders HostWebsiteSection', () => {
    const { container } = wrap(<HostWebsiteSection />);
    expect(container).toBeTruthy();
  });
  it('renders HostServicesSection', () => {
    const { container } = wrap(<HostServicesSection />);
    expect(container).toBeTruthy();
  });
  it('renders HostBrandingSection', () => {
    const { container } = wrap(<HostBrandingSection />);
    expect(container).toBeTruthy();
  });
  it('renders HostDynamicSection', () => {
    const { container } = wrap(<HostDynamicSection />);
    expect(container).toBeTruthy();
  });
  it('renders HostTrackingSection', () => {
    const { container } = wrap(<HostTrackingSection config={emptyConfig} />);
    expect(container).toBeTruthy();
  });
});
