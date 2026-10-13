import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { GraphQLError } from 'graphql';
import type { MockedResponse } from '@apollo/client/testing';
import { renderWithApollo } from '../helpers/renderWithApollo';
import { CALL_HOST_LEAD, CALL_VENUE_LEAD, EMAIL_ECOMM_LEAD, EMAIL_VENUE_LEAD } from '@/api/crm.gql';

// Providers and the body composer have their own suites; here they are doubles
// that report the way the real ones do, so the dialog's own logic is what runs.
vi.mock('@/components/CommsProviderSelect', () => ({
  default: ({ type, value, onChange }: { type: string; value: string; onChange: (id: string) => void }) => (
    <div>
      <p data-testid="provider-type">{type}</p>
      <p data-testid="provider-value">{value || 'none'}</p>
      <button type="button" onClick={() => onChange('prov-9')}>
        pick provider
      </button>
    </div>
  ),
}));
vi.mock('@/components/compose/EmailComposeFields', () => ({
  default: ({
    leadEmail,
    defaultSubject,
    variableValues,
    onChange,
  }: {
    leadEmail: string;
    defaultSubject: string;
    variableValues: Record<string, string>;
    onChange: (payload: unknown) => void;
  }) => (
    <div>
      <p data-testid="fields-email">{leadEmail}</p>
      <p data-testid="fields-subject">{defaultSubject}</p>
      <p data-testid="fields-vars">{JSON.stringify(variableValues)}</p>
      <button
        type="button"
        onClick={() =>
          onChange({
            subject: 'Custom subject',
            body: '<p>Hi</p>',
            valid: true,
            attachments: [{ url: 'https://f.test/a.pdf', name: 'a.pdf', extra: 'dropped' }],
          })
        }
      >
        write valid
      </button>
      <button type="button" onClick={() => onChange({ subject: '', body: '<p>Hi</p>', valid: true, attachments: [] })}>
        write no subject
      </button>
    </div>
  ),
}));

import ContactComposeDialog from '@/components/ContactComposeDialog';

const lead = { id: 'lead-1', display_name: 'Grand Hall', primary_email: 'meera@grandhall.in', primary_mobile: '9812345678' };

const outcome = (key: string, over: Record<string, unknown> = {}) => ({
  data: {
    [key]: {
      __typename: 'CrmCommsResult',
      ok: true,
      message: 'Queued',
      provider: 'SMTP',
      provider_id: 'prov-9',
      external_id: 'x1',
      recording_url: null,
      ...over,
    },
  },
});

interface RenderOpts {
  mode?: 'email' | 'call';
  entity?: 'VENUE_LEAD' | 'HOST_LEAD' | 'ECOMM_LEAD';
  leadOverride?: typeof lead | null;
  mocks?: MockedResponse[];
}

function renderDialog({ mode = 'email', entity = 'VENUE_LEAD', leadOverride = lead, mocks = [] }: RenderOpts = {}) {
  const onClose = vi.fn();
  const onResult = vi.fn();
  renderWithApollo(
    <ContactComposeDialog
      open
      mode={mode}
      entity={entity}
      lead={leadOverride}
      variableValues={{ city: 'Pune' }}
      onClose={onClose}
      onResult={onResult}
    />,
    mocks,
  );
  return { onClose, onResult };
}

const send = () => screen.getByRole('button', { name: /send email|start call/i });

describe('ContactComposeDialog email', () => {
  it('opens addressed to the lead with a default subject and the template variables', () => {
    renderDialog();
    expect(screen.getByRole('dialog', { name: 'Email · Grand Hall' })).toBeInTheDocument();
    expect(screen.getByLabelText('To (email)')).toHaveValue('meera@grandhall.in');
    expect(screen.getByTestId('provider-type')).toHaveTextContent('SMTP');
    expect(screen.getByTestId('fields-email')).toHaveTextContent('meera@grandhall.in');
    expect(screen.getByTestId('fields-subject')).toHaveTextContent('Regarding Grand Hall');
    expect(screen.getByTestId('fields-vars')).toHaveTextContent('{"city":"Pune"}');
  });

  it('cannot send until the composed body is valid, then sends with the chosen provider', async () => {
    const { onClose, onResult } = renderDialog({
      mocks: [
        {
          request: {
            query: EMAIL_VENUE_LEAD,
            variables: {
              id: 'lead-1',
              provider_id: 'prov-9',
              contact_email: 'meera@grandhall.in',
              subject: 'Custom subject',
              body: '<p>Hi</p>',
              attachments: [{ url: 'https://f.test/a.pdf', name: 'a.pdf' }],
            },
          },
          result: outcome('emailVenueLeadContact', { message: 'Email queued' }),
        },
      ],
    });
    expect(send()).toBeDisabled();
    fireEvent.click(screen.getByText('write valid'));
    fireEvent.click(screen.getByText('pick provider'));
    expect(send()).toBeEnabled();
    fireEvent.click(send());
    await waitFor(() => expect(onResult).toHaveBeenCalledWith('Email queued', true));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('falls back to the default subject and a null provider', async () => {
    const { onResult } = renderDialog({
      entity: 'ECOMM_LEAD',
      mocks: [
        {
          request: {
            query: EMAIL_ECOMM_LEAD,
            variables: {
              id: 'lead-1',
              provider_id: null,
              contact_email: 'meera@grandhall.in',
              subject: 'Regarding Grand Hall',
              body: '<p>Hi</p>',
              attachments: [],
            },
          },
          result: outcome('emailEcommLeadContact', { ok: false, message: 'Rejected' }),
        },
      ],
    });
    fireEvent.click(screen.getByText('write no subject'));
    fireEvent.click(send());
    await waitFor(() => expect(onResult).toHaveBeenCalledWith('Rejected', false));
  });

  it('sends to an address the agent typed instead', async () => {
    const { onResult } = renderDialog({
      mocks: [
        {
          request: {
            query: EMAIL_VENUE_LEAD,
            variables: {
              id: 'lead-1',
              provider_id: null,
              contact_email: 'other@hall.in',
              subject: 'Custom subject',
              body: '<p>Hi</p>',
              attachments: [{ url: 'https://f.test/a.pdf', name: 'a.pdf' }],
            },
          },
          result: outcome('emailVenueLeadContact'),
        },
      ],
    });
    fireEvent.change(screen.getByLabelText('To (email)'), { target: { value: 'other@hall.in' } });
    expect(screen.getByTestId('fields-email')).toHaveTextContent('other@hall.in');
    fireEvent.click(screen.getByText('write valid'));
    fireEvent.click(send());
    await waitFor(() => expect(onResult).toHaveBeenCalledWith('Queued', true));
  });

  it('refuses to send to a blank address', () => {
    renderDialog({ leadOverride: { ...lead, primary_email: '' } });
    fireEvent.click(screen.getByText('write valid'));
    expect(send()).toBeDisabled();
    fireEvent.change(screen.getByLabelText('To (email)'), { target: { value: '   ' } });
    expect(send()).toBeDisabled();
  });

  it('shows the API error and stays open', async () => {
    const { onClose, onResult } = renderDialog({
      mocks: [
        {
          request: {
            query: EMAIL_VENUE_LEAD,
            variables: {
              id: 'lead-1',
              provider_id: null,
              contact_email: 'meera@grandhall.in',
              subject: 'Custom subject',
              body: '<p>Hi</p>',
              attachments: [{ url: 'https://f.test/a.pdf', name: 'a.pdf' }],
            },
          },
          result: { errors: [new GraphQLError('SMTP refused the message')] },
        },
      ],
    });
    fireEvent.click(screen.getByText('write valid'));
    fireEvent.click(send());
    expect(await screen.findByRole('alert')).toHaveTextContent('SMTP refused the message');
    expect(onClose).not.toHaveBeenCalled();
    expect(onResult).not.toHaveBeenCalled();
  });

  it('reports "Done" as not ok when the server returns no payload', async () => {
    const { onResult } = renderDialog({
      mocks: [
        {
          request: {
            query: EMAIL_VENUE_LEAD,
            variables: {
              id: 'lead-1',
              provider_id: null,
              contact_email: 'meera@grandhall.in',
              subject: 'Custom subject',
              body: '<p>Hi</p>',
              attachments: [{ url: 'https://f.test/a.pdf', name: 'a.pdf' }],
            },
          },
          result: { data: { emailVenueLeadContact: null } },
        },
      ],
    });
    fireEvent.click(screen.getByText('write valid'));
    fireEvent.click(send());
    await waitFor(() => expect(onResult).toHaveBeenCalledWith('Done', false));
  });

  it('closes from Cancel', () => {
    const { onClose } = renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
  });
});

describe('ContactComposeDialog call', () => {
  it('addresses the lead mobile, offers call providers and has no email fields', () => {
    renderDialog({ mode: 'call' });
    expect(screen.getByRole('dialog', { name: 'Call · Grand Hall' })).toBeInTheDocument();
    expect(screen.getByLabelText('To (number)')).toHaveValue('9812345678');
    expect(screen.getByTestId('provider-type')).toHaveTextContent('TWILIO_CALL');
    expect(screen.queryByTestId('fields-email')).not.toBeInTheDocument();
    expect(send()).toBeEnabled();
  });

  it('starts the call with the number and provider', async () => {
    const { onClose, onResult } = renderDialog({
      mode: 'call',
      mocks: [
        {
          request: {
            query: CALL_VENUE_LEAD,
            variables: { id: 'lead-1', provider_id: 'prov-9', contact_number: '9812345678' },
          },
          result: outcome('callVenueLeadContact', { message: 'Calling…' }),
        },
      ],
    });
    fireEvent.click(screen.getByText('pick provider'));
    fireEvent.click(send());
    await waitFor(() => expect(onResult).toHaveBeenCalledWith('Calling…', true));
    expect(onClose).toHaveBeenCalled();
  });

  it('uses the host-lead call mutation for a host lead', async () => {
    const { onResult } = renderDialog({
      mode: 'call',
      entity: 'HOST_LEAD',
      mocks: [
        {
          request: { query: CALL_HOST_LEAD, variables: { id: 'lead-1', provider_id: null, contact_number: '9812345678' } },
          result: outcome('callHostLeadContact', { message: 'Host call placed' }),
        },
      ],
    });
    fireEvent.click(send());
    await waitFor(() => expect(onResult).toHaveBeenCalledWith('Host call placed', true));
  });

  it('disables the button while the call is being placed', async () => {
    renderDialog({
      mode: 'call',
      mocks: [
        {
          request: { query: CALL_VENUE_LEAD, variables: { id: 'lead-1', provider_id: null, contact_number: '9812345678' } },
          result: outcome('callVenueLeadContact'),
          // Long enough that the call is still in flight when the button is read, even on a
          // loaded CI box (findByRole polls; a 50 ms answer could land between two polls).
          delay: 5000,
        },
      ],
    });
    fireEvent.click(send());
    expect(await screen.findByRole('button', { name: 'Sending…' })).toBeDisabled();
  });
});

describe('ContactComposeDialog without a lead', () => {
  it('renders a bare title and an empty target, and cannot submit', () => {
    renderDialog({ leadOverride: null });
    expect(screen.getByRole('dialog', { name: /^Email ·/ })).toBeInTheDocument();
    expect(screen.getByLabelText('To (email)')).toHaveValue('');
    expect(send()).toBeDisabled();
  });

  it('renders a bare call title without a lead', () => {
    renderDialog({ mode: 'call', leadOverride: null });
    expect(screen.getByRole('dialog', { name: /^Call ·/ })).toBeInTheDocument();
  });
});

describe('ContactComposeDialog lead removed while open', () => {
  it('does nothing when submitted after the lead went away', async () => {
    const onResult = vi.fn();
    function Harness() {
      const [current, setCurrent] = useState<typeof lead | null>(lead);
      return (
        <>
          <button type="button" onClick={() => setCurrent(null)}>
            drop lead
          </button>
          <ContactComposeDialog open mode="call" entity="VENUE_LEAD" lead={current} onClose={vi.fn()} onResult={onResult} />
        </>
      );
    }
    renderWithApollo(<Harness />);
    fireEvent.click(screen.getByText('drop lead'));
    expect(send()).toBeEnabled();
    fireEvent.click(send());
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(onResult).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
