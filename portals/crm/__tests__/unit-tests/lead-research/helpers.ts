import { fireEvent, screen } from '@testing-library/react';

/** An approval outcome for the first fixture candidate, as approveCrmLeadCandidates returns it. */
export const approval = (outcome: string, message: string, crm_lead_id: string | null = null) => ({
  __typename: 'CrmLeadCandidateApproval',
  candidate_id: 'c1',
  name: 'The Barn Cafe',
  outcome,
  crm_lead_id,
  message,
});

/** Opens a candidate from its row's Review button and returns the drawer. */
export const openCandidate = async (name: string) => {
  fireEvent.click(await screen.findByRole('button', { name: `Review ${name}` }));
  return screen.findByTestId('candidate-drawer');
};

/** The admin Location list the discovery form's city and area pickers read. */
export const ADMIN_LOCATIONS = [
  {
    id: 'loc-mumbai',
    location_name: 'Mumbai',
    country: 'India',
    country_code: 'IN',
    state: 'Maharashtra',
    state_code: 'MH',
    city: 'Mumbai',
    location_zones: [{ zone_name: 'Bandra' }],
  },
];
