import { describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { GraphQLError } from 'graphql';
import type { ReactNode } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import type { MockedResponse } from '@apollo/client/testing';
import { renderWithApollo } from '../helpers/renderWithApollo';
import { CRM_LEAD_DUPLICATES, type CrmLeadDuplicateMatch } from '@/api/leadDuplicates.gql';
import LeadDuplicateCheck from '@/components/lead-duplicates/LeadDuplicateCheck';
import { duplicateCheckKey } from '@/hooks/useLeadDuplicates';

/**
 * The lead forms' live duplicate warning. What matters to the operator: it
 * names the value, the kind of lead and the lead that already has it, links
 * there, never flags the lead being edited, and waits for typing to pause.
 */

interface Values {
  contacts: { mobile_number: string; email: string }[];
  website: string;
}

function FormHarness({ defaults, children }: Readonly<{ defaults: Values; children: ReactNode }>) {
  const methods = useForm<Values>({ defaultValues: defaults });
  return (
    <FormProvider {...methods}>
      <input aria-label="mobile" {...methods.register('contacts.0.mobile_number')} />
      {children}
    </FormProvider>
  );
}

const match = (over: Partial<CrmLeadDuplicateMatch> = {}): CrmLeadDuplicateMatch => ({
  field: 'PHONE',
  value: '9876543210',
  entity_type: 'HOST_LEAD',
  lead_id: 'h1',
  lead_name: 'Asha Events',
  city: 'Pune',
  ...over,
});

const duplicatesMock = (
  input: Record<string, unknown>,
  answer: { matches?: CrmLeadDuplicateMatch[]; error?: string },
): MockedResponse => ({
  request: { query: CRM_LEAD_DUPLICATES, variables: { input } },
  result: answer.error
    ? { errors: [new GraphQLError(answer.error)] }
    : { data: { crmLeadDuplicates: (answer.matches ?? []).map((m) => ({ __typename: 'CrmLeadDuplicateMatch', ...m })) } },
});

const blank: Values = { contacts: [{ mobile_number: '', email: '' }], website: '' };

describe('LeadDuplicateCheck', () => {
  it('names each value another lead already has, that lead and its city, and links to it', async () => {
    const defaults: Values = { contacts: [{ mobile_number: '9876543210', email: 'asha@example.com' }], website: 'asha.in' };
    const mocks = [
      duplicatesMock(
        { entity_type: 'VENUE_LEAD', lead_id: null, contacts: defaults.contacts, website: 'asha.in' },
        { matches: [match(), match({ field: 'WEBSITE', value: 'asha.in', entity_type: 'CREATOR_LEAD', lead_id: 'c9', lead_name: '', city: '' })] },
      ),
    ];

    renderWithApollo(
      <FormHarness defaults={defaults}>
        <LeadDuplicateCheck entityType="VENUE_LEAD" />
      </FormHarness>,
      mocks,
    );

    const warning = await screen.findByTestId('lead-duplicate-warning');
    expect(warning).toHaveTextContent('Already in the CRM');
    expect(warning).toHaveTextContent('Saving is blocked until these are changed.');
    expect(warning).toHaveTextContent('Phone number 9876543210 is already on Host lead "Asha Events"');
    expect(warning).toHaveTextContent('Pune');
    // A lead with no name still reads as a lead, never as an empty pair of quotes.
    expect(warning).toHaveTextContent('Website asha.in is already on Creator lead "Unnamed lead"');
    expect(screen.getByRole('link', { name: 'Open Asha Events in a new tab' })).toHaveAttribute('href', '/host-leads/h1/view');
    expect(screen.getByRole('link', { name: 'Open Unnamed lead in a new tab' })).toHaveAttribute('href', '/creator-leads/c9/view');
  });

  it('sends the edited lead’s id so it never matches itself, and explains that kept values are allowed', async () => {
    const defaults: Values = { contacts: [{ mobile_number: '9876543210', email: '' }], website: '' };
    const mocks = [
      duplicatesMock(
        { entity_type: 'HOST_LEAD', lead_id: 'h7', contacts: [{ mobile_number: '9876543210', email: '' }], website: '' },
        { matches: [match({ entity_type: 'VENUE_LEAD', lead_id: 'v2', lead_name: 'Smash Arena' })] },
      ),
    ];

    renderWithApollo(
      <FormHarness defaults={defaults}>
        <LeadDuplicateCheck entityType="HOST_LEAD" leadId="h7" />
      </FormHarness>,
      mocks,
    );

    const warning = await screen.findByTestId('lead-duplicate-warning');
    expect(warning).toHaveTextContent('You can keep values this lead already had, but new ones must be unique.');
    expect(warning).toHaveTextContent('is already on Venue lead "Smash Arena"');
  });

  it('asks nothing while the phone is too short, then checks once typing pauses', async () => {
    const typed = { entity_type: 'ECOMM_LEAD', lead_id: null, contacts: [{ mobile_number: '9876543210', email: '' }], website: '' };
    renderWithApollo(
      <FormHarness defaults={blank}>
        <LeadDuplicateCheck entityType="ECOMM_LEAD" />
      </FormHarness>,
      [duplicatesMock(typed, { matches: [match()] })],
    );

    fireEvent.change(screen.getByLabelText('mobile'), { target: { value: '98765' } });
    fireEvent.change(screen.getByLabelText('mobile'), { target: { value: '9876543210' } });

    expect(await screen.findByTestId('lead-duplicate-warning', {}, { timeout: 3000 })).toHaveTextContent(
      'Phone number 9876543210 is already on Host lead "Asha Events"',
    );
    // An unmocked request (for "98765") would have surfaced as the failure notice.
    expect(screen.queryByTestId('lead-duplicate-failed')).not.toBeInTheDocument();
  });

  it('shows nothing when no other lead has the values', async () => {
    const defaults: Values = { contacts: [{ mobile_number: '9800000000', email: '' }], website: '' };
    renderWithApollo(
      <FormHarness defaults={defaults}>
        <LeadDuplicateCheck entityType="VENUE_LEAD" />
      </FormHarness>,
      [duplicatesMock({ entity_type: 'VENUE_LEAD', lead_id: null, contacts: defaults.contacts, website: '' }, { matches: [] })],
    );

    await waitFor(() => expect(screen.queryByText('Checking for duplicates…')).not.toBeInTheDocument());
    expect(screen.queryByTestId('lead-duplicate-warning')).not.toBeInTheDocument();
    expect(screen.queryByTestId('lead-duplicate-failed')).not.toBeInTheDocument();
  });

  it('says the check could not run, rather than implying there is no duplicate', async () => {
    const defaults: Values = { contacts: [{ mobile_number: '', email: 'asha@example.com' }], website: '' };
    renderWithApollo(
      <FormHarness defaults={defaults}>
        <LeadDuplicateCheck entityType="VENUE_LEAD" />
      </FormHarness>,
      [
        duplicatesMock(
          { entity_type: 'VENUE_LEAD', lead_id: null, contacts: [{ mobile_number: '', email: 'asha@example.com' }], website: '' },
          { error: 'Server unavailable' },
        ),
      ],
    );

    const notice = await screen.findByTestId('lead-duplicate-failed');
    expect(notice).toHaveTextContent('Could not check for duplicates right now. The check runs again when you save.');
    // Informational, not an error the operator must act on now.
    expect(notice).toHaveAttribute('role', 'status');
    expect(screen.queryByTestId('lead-duplicate-warning')).not.toBeInTheDocument();
  });
});

describe('duplicateCheckKey', () => {
  it('keeps only phones long enough to identify a lead and real email addresses', () => {
    const key = duplicateCheckKey(
      [
        { mobile_number: ' +91 98765 43210 ', email: 'not-an-email' },
        { mobile_number: '12345', email: ' a@b.co ' },
        { mobile_number: '', email: '' },
        null,
      ],
      ' https://cafe.in/ ',
    );
    expect(JSON.parse(key)).toEqual({
      contacts: [
        { mobile_number: '+91 98765 43210', email: '' },
        { mobile_number: '', email: 'a@b.co' },
      ],
      website: 'https://cafe.in/',
    });
  });

  it('is empty when nothing typed could match another lead', () => {
    expect(duplicateCheckKey([{ mobile_number: '123', email: 'x' }], '   ')).toBe('');
    expect(duplicateCheckKey(undefined, undefined)).toBe('');
  });

  it('checks a website on its own', () => {
    expect(JSON.parse(duplicateCheckKey([], 'cafe.in'))).toEqual({ contacts: [], website: 'cafe.in' });
  });
});
