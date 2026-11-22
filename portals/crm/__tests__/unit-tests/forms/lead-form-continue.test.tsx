import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { HostLeadForm } from '@/forms/host-lead';
import { VenueLeadForm } from '@/forms/venue-lead';
import { EcommLeadForm } from '@/forms/ecomm-lead';
import { hostLeadInitialValues } from '@/forms/host-lead/host-lead.types';
import { venueLeadInitialValues } from '@/forms/venue-lead/venue-lead.types';
import { ecommLeadInitialValues } from '@/forms/ecomm-lead/ecomm-lead.types';
import type { CrmOptionGroup } from '@/api/crm.types';
import { renderWithApollo } from '../helpers/renderWithApollo';

const config: CrmOptionGroup = {
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
  services_offered_options: ['Catering'],
  venue_services_offered_options: ['Catering'],
  host_services_offered_options: ['Event Hosting'],
  creator_platforms: ['Instagram'],
  collaboration_types: ['Barter'],
  community_types: ['Running Club'],
  community_platforms: ['WhatsApp'],
};

const primary = { name: 'Asha', role: 'Owner', mobile_number: '9876543210', whatsapp_number: '', email: 'asha@example.com' };
const SUPER = '64a000000000000000000001';

const validHost = { ...hostLeadInitialValues, super_category_id: SUPER, host_name: 'Ravi Sharma', host_type: 'Individual', contacts: [primary] };
const validVenue = {
  ...venueLeadInitialValues,
  super_category_id: SUPER,
  venue_name: 'Sunrise Banquet',
  venue_types: ['Banquet Hall'],
  city: 'Pune',
  full_address: '123 MG Road, Camp',
  contacts: [primary],
};
const validEcomm = { ...ecommLeadInitialValues, super_category_id: SUPER, seller_name: 'Kavya Iyer', contacts: [primary] };

const mount = (ui: ReactElement) => renderWithApollo(<LocalizationProvider dateAdapter={AdapterDateFns}>{ui}</LocalizationProvider>);

describe('Lead forms: Update & Continue', () => {
  it('is not offered when the page does not support saving in place', () => {
    mount(<HostLeadForm config={config} initialValues={validHost} onSubmit={vi.fn()} />);

    expect(screen.queryByRole('button', { name: 'Update & Continue' })).toBeNull();
  });

  it('saves through the continue handler only, and keeps the edited values on screen', async () => {
    const onSubmit = vi.fn();
    const onSubmitAndContinue = vi.fn(() => Promise.resolve());
    mount(<HostLeadForm config={config} initialValues={validHost} onSubmit={onSubmit} onSubmitAndContinue={onSubmitAndContinue} />);

    const name = screen.getByRole('textbox', { name: /Host Name/ });
    fireEvent.change(name, { target: { value: 'Ravi S. Sharma' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update & Continue' }));

    await waitFor(() => expect(onSubmitAndContinue).toHaveBeenCalledWith(expect.objectContaining({ host_name: 'Ravi S. Sharma' })));
    expect(onSubmit).not.toHaveBeenCalled();
    // The form is re-based on what was saved, not reset to the values it opened with.
    await waitFor(() => expect(name).toHaveValue('Ravi S. Sharma'));
    expect(screen.queryByTestId('lead-form-status')).toBeNull();
  });

  it('shows why a continue-save failed and keeps the unsaved edits', async () => {
    const onSubmitAndContinue = vi.fn(() => Promise.reject(new Error('Host lead is locked')));
    mount(<HostLeadForm config={config} initialValues={validHost} onSubmit={vi.fn()} onSubmitAndContinue={onSubmitAndContinue} />);

    fireEvent.change(screen.getByRole('textbox', { name: /Host Name/ }), { target: { value: 'Ravi Kumar' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update & Continue' }));

    expect(await screen.findByTestId('lead-form-status')).toHaveTextContent('Host lead is locked');
    expect(screen.getByRole('textbox', { name: /Host Name/ })).toHaveValue('Ravi Kumar');
  });

  it('runs validation first: an invalid lead is not sent and both save buttons lock', async () => {
    const onSubmitAndContinue = vi.fn();
    mount(<HostLeadForm config={config} onSubmit={vi.fn()} onSubmitAndContinue={onSubmitAndContinue} />);

    fireEvent.click(screen.getByRole('button', { name: 'Update & Continue' }));

    expect(await screen.findByText(/fields have validation errors/)).toBeInTheDocument();
    expect(onSubmitAndContinue).not.toHaveBeenCalled();
    expect(screen.getByTestId('lead-form-submit-continue')).toBeDisabled();
    expect(screen.getByTestId('lead-form-submit')).toBeDisabled();
  });

  it('is wired on the venue form with the label the page passes', async () => {
    const onSubmitAndContinue = vi.fn();
    mount(
      <VenueLeadForm
        config={config}
        initialValues={validVenue}
        onSubmit={vi.fn()}
        onSubmitAndContinue={onSubmitAndContinue}
        continueLabel="Create & Continue"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Create & Continue' }));

    await waitFor(() => expect(onSubmitAndContinue).toHaveBeenCalledWith(expect.objectContaining({ venue_name: 'Sunrise Banquet', city: 'Pune' })));
  });

  it('is wired on the ecomm form', async () => {
    const onSubmit = vi.fn();
    const onSubmitAndContinue = vi.fn();
    mount(<EcommLeadForm config={config} initialValues={validEcomm} onSubmit={onSubmit} onSubmitAndContinue={onSubmitAndContinue} />);

    fireEvent.click(screen.getByRole('button', { name: 'Update & Continue' }));

    await waitFor(() => expect(onSubmitAndContinue).toHaveBeenCalledWith(expect.objectContaining({ seller_name: 'Kavya Iyer' })));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
