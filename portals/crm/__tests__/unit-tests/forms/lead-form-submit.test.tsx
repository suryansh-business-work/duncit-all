import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
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
  venue_types: ['Banquet Hall', 'Other'],
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

describe('HostLeadForm submit', () => {
  it('hands valid values to onSubmit', async () => {
    const onSubmit = vi.fn(() => Promise.resolve());
    mount(<HostLeadForm config={config} initialValues={validHost} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: 'Save host lead' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ host_name: 'Ravi Sharma' })));
    expect(screen.queryByText(/validation errors/)).toBeNull();
  });

  it('lists every invalid field when a blank lead is submitted', async () => {
    const onSubmit = vi.fn();
    mount(<HostLeadForm config={config} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: 'Save host lead' }));

    expect(await screen.findByText(/fields have validation errors/)).toBeInTheDocument();
    expect(screen.getByText('Host name:')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Save host lead' })).toBeDisabled();
  });

  it('shows why the save failed', async () => {
    mount(<HostLeadForm config={config} initialValues={validHost} onSubmit={() => Promise.reject(new Error('Duplicate host lead'))} />);

    fireEvent.click(screen.getByRole('button', { name: 'Save host lead' }));

    expect(await screen.findByText('Duplicate host lead')).toBeInTheDocument();
  });
});

describe('VenueLeadForm submit', () => {
  it('names the single invalid field', async () => {
    mount(<VenueLeadForm config={config} initialValues={{ ...validVenue, website: 'grandhall' }} onSubmit={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Save venue lead' }));

    expect(await screen.findByText('1 field has validation errors')).toBeInTheDocument();
    expect(screen.getByText('Enter a valid website')).toBeInTheDocument();
  });

  it('asks to describe an "Other" venue type', async () => {
    const onSubmit = vi.fn();
    mount(<VenueLeadForm config={config} initialValues={validVenue} onSubmit={onSubmit} />);

    fireEvent.mouseDown(screen.getByRole('combobox', { name: /Venue Type/ }));
    fireEvent.click(within(await screen.findByRole('listbox')).getByRole('option', { name: 'Other' }));
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' });

    expect(await screen.findByLabelText(/Other venue type — please specify/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save venue lead', hidden: true }));

    expect(await screen.findAllByText('Please specify the "Other" venue type')).not.toHaveLength(0);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('hands valid values to onSubmit and reports a failure', async () => {
    const onSubmit = vi.fn(() => Promise.reject(new Error('City not serviceable')));
    mount(<VenueLeadForm config={config} initialValues={validVenue} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: 'Save venue lead' }));

    expect(await screen.findByText('City not serviceable')).toBeInTheDocument();
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ venue_name: 'Sunrise Banquet' }));
  });
});

describe('EcommLeadForm', () => {
  it('uses its default label and blank values, and lists the errors of a blank submit', async () => {
    const onCancel = vi.fn();
    mount(<EcommLeadForm config={config} onSubmit={vi.fn()} onCancel={onCancel} />);

    expect(screen.getByText(/1\. Basic Details/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save ecomm lead' }));
    expect(await screen.findByText(/fields have validation errors/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('saves valid values and shows a failed save', async () => {
    const onSubmit = vi.fn(() => Promise.reject(new Error('Seller already exists')));
    mount(<EcommLeadForm config={config} initialValues={validEcomm} submitLabel="Create ecomm lead" onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: 'Create ecomm lead' }));

    expect(await screen.findByText('Seller already exists')).toBeInTheDocument();
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ seller_name: 'Kavya Iyer' }));
  });

  it('shows Saving… while submitting', () => {
    mount(<EcommLeadForm config={config} onSubmit={vi.fn()} submitting />);
    expect(screen.getByRole('button', { name: /Saving/ })).toBeInTheDocument();
  });
});
