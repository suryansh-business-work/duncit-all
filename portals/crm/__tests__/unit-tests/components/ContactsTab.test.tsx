import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import ContactsTab from '@/components/contacts-tab';
import type { CrmContact } from '@/api/crm.types';

const contacts: CrmContact[] = [
  { name: 'Asha', role: 'Owner', mobile_number: '+919876543210', whatsapp_number: '', email: 'asha@x.com' },
];

const wrap = (ui: JSX.Element) => render(<MockedProvider mocks={[]} addTypename={false}>{ui}</MockedProvider>);

describe('ContactsTab', () => {
  it('lists contacts and opens the compose window when a contact is called', () => {
    wrap(<ContactsTab entity="VENUE_LEAD" leadId="v1" leadName="Hall" contacts={contacts} />);
    expect(screen.getByText('Asha')).toBeTruthy();
    expect(screen.queryByTestId('compose-window')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /call contact/i }));
    expect(screen.getByTestId('compose-window')).toBeTruthy();
    expect(screen.getByText(/Call · Asha/i)).toBeTruthy();
  });

  it('shows an empty state with no contacts', () => {
    wrap(<ContactsTab entity="HOST_LEAD" leadId="h1" leadName="Bob" contacts={[]} />);
    expect(screen.getByText(/No contacts on file/i)).toBeTruthy();
  });
});
