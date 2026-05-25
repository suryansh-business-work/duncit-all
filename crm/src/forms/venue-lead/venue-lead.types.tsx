import type { CrmContact } from '../../api/crm.types';
import { emptyContact } from '../fields/ContactsField';

export interface VenueLeadFormValues {
  venue_name: string;
  venue_types: string[];
  venue_description: string;
  capacity_min: string;
  capacity_max: string;
  space_type: string;
  city: string;
  area: string;
  full_address: string;
  landmark: string;
  map_link: string;
  contacts: CrmContact[];
  event_suitability: string[];
  available_days: string[];
  available_time_slots: string;
  booking_notice: string;
  pricing_models: string[];
  expected_charges: string;
  security_deposit: string;
  gst_applicable: boolean;
  invoice_available: boolean;
  amenities: string[];
  photos: string;
  videos: string;
  brochure_url: string;
  lead_source: string;
  assigned_to: string;
  lead_status: string;
  priority: string;
  next_follow_up_date: Date | null;
  remarks: string;
}

export const venueLeadInitialValues: VenueLeadFormValues = {
  venue_name: '',
  venue_types: [],
  venue_description: '',
  capacity_min: '',
  capacity_max: '',
  space_type: '',
  city: '',
  area: '',
  full_address: '',
  landmark: '',
  map_link: '',
  contacts: [{ ...emptyContact }],
  event_suitability: [],
  available_days: [],
  available_time_slots: '',
  booking_notice: '',
  pricing_models: [],
  expected_charges: '',
  security_deposit: '',
  gst_applicable: false,
  invoice_available: false,
  amenities: [],
  photos: '',
  videos: '',
  brochure_url: '',
  lead_source: '',
  assigned_to: '',
  lead_status: 'New',
  priority: 'Medium',
  next_follow_up_date: null,
  remarks: '',
};
