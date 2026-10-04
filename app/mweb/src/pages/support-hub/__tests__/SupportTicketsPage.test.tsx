import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { MockedProvider } from '@apollo/client/testing/react';
import SupportTicketsPage from '../SupportTicketsPage';
import { USER_INFO } from '../../../user-info/queries';
import { CREATE_TICKET, MY_TICKETS } from '../../support-tickets/queries';
import { DuncitLocalizationProvider } from '@duncit/app-settings';

const mockNavigate = vi.fn();
vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

// The signed-in account comes from the one USER_INFO read (useUserInfo), which
// only asks while a session token is present.
const headerMock = {
  request: { query: USER_INFO },
  result: {
    data: {
      me: {
        user_id: 'u1',
        username: 'jane',
        first_name: 'Jane',
        last_name: 'Doe',
        full_name: 'Jane Doe',
        email: 'jane@example.com',
        phone_number: '',
        phone_extension: '+91',
        whatsapp_number: null,
        whatsapp_extension: null,
        whatsapp_verified_at: null,
        profile_photo: null,
        bio: null,
        gender: null,
        is_pet_owner: null,
        dob: '',
        roles: [],
        locale: null,
        timezone: null,
        country: '',
        city: null,
        state: null,
        zone: null,
        assigned_city: null,
        assigned_zones: [],
        selected_location_id: null,
        is_email_verified: true,
        is_phone_verified: false,
        onboarding_survey_completed: true,
        profile_visibility: null,
        created_at: null,
        updated_at: null,
        address: {
          line1: null,
          line2: null,
          landmark: null,
          city: null,
          state: null,
          pincode: null,
          country: null,
        },
        saved_pod_ids: [],
        following_club_ids: [],
        following_user_ids: [],
      },
      myCoinBalance: {
        balance: 0,
        lifetime_earned: 0,
        earn_pct: 0,
        shop_earn_pct: 0,
        pod_feedback_coins: 0,
      },
      publicPolicies: [],
    },
  },
};

const emptyTicketsMock = {
  request: { query: MY_TICKETS },
  result: { data: { myTickets: [] } },
};

const ticketsMock = {
  request: { query: MY_TICKETS },
  result: {
    data: {
      myTickets: [
        {
          id: 'abc123def456',
          subject: 'Payment failed',
          category: 'PAYMENT',
          status: 'OPEN',
          last_message_at: new Date().toISOString(),
          message_count: 2,
        },
      ],
    },
  },
};

function renderPage(initialEntries: string[], mocks: any[]) {
  return render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      <DuncitLocalizationProvider>
        <MemoryRouter initialEntries={initialEntries}>
          <SupportTicketsPage />
        </MemoryRouter>
      </DuncitLocalizationProvider>
    </MockedProvider>,
  );
}

describe('SupportTicketsPage', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    localStorage.setItem('token', 'test-session');
  });
  afterEach(() => localStorage.removeItem('token'));

  it('renders the shell, help cards and prefills name/email from me', async () => {
    renderPage(['/support/tickets'], [headerMock, emptyTicketsMock]);

    expect(screen.getByText('Create Support Tickets')).toBeInTheDocument();
    expect(screen.getByText('Help squad is ready')).toBeInTheDocument();
    expect(screen.getByText('Maybe answered already?')).toBeInTheDocument();

    // Name/email are pushed in by SupportForm's effect once `me` resolves.
    await waitFor(() =>
      expect(screen.getByDisplayValue('Jane Doe')).toBeInTheDocument(),
    );
    expect(screen.getByDisplayValue('jane@example.com')).toBeInTheDocument();
  });

  it('navigates to /faqs when the "already answered" card is clicked', async () => {
    renderPage(['/support/tickets'], [headerMock, emptyTicketsMock]);
    fireEvent.click(screen.getByText('Maybe answered already?'));
    expect(mockNavigate).toHaveBeenCalledWith('/faqs');
  });

  it('shows the attached pod chip from URL params', async () => {
    renderPage(
      ['/support/tickets?podId=POD1&podTitle=Chess%20Night&category=BUG&subject=Broken&message=Something'],
      [headerMock, emptyTicketsMock],
    );
    await waitFor(() =>
      expect(screen.getByText('About pod: Chess Night')).toBeInTheDocument(),
    );
  });

  it('creates a ticket and navigates to its detail page on success', async () => {
    const createMock = {
      request: {
        query: CREATE_TICKET,
        variables: {
          input: {
            subject: 'My subject',
            category: 'GENERAL',
            body_text: 'This is a long enough message',
            attachments: [],
          },
        },
      },
      result: { data: { createTicket: { id: 'newid99', ticket_no: 'TKT-99' } } },
    };

    renderPage(['/support/tickets'], [headerMock, emptyTicketsMock, createMock, emptyTicketsMock]);

    await waitFor(() =>
      expect(screen.getByDisplayValue('Jane Doe')).toBeInTheDocument(),
    );

    fireEvent.change(screen.getByLabelText(/^Subject/), {
      target: { value: 'My subject' },
    });
    fireEvent.change(screen.getByLabelText(/Tell us what's going on/), {
      target: { value: 'This is a long enough message' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send to support' }));

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('/tickets/newid99'),
    );
  });

  it('shows an error when the mutation returns no id', async () => {
    const createNoIdMock = {
      request: {
        query: CREATE_TICKET,
        variables: {
          input: {
            subject: 'My subject',
            category: 'GENERAL',
            body_text: 'This is a long enough message',
            attachments: [],
          },
        },
      },
      result: { data: { createTicket: null } },
    };

    renderPage(['/support/tickets'], [headerMock, emptyTicketsMock, createNoIdMock]);

    await waitFor(() =>
      expect(screen.getByDisplayValue('Jane Doe')).toBeInTheDocument(),
    );

    fireEvent.change(screen.getByLabelText(/^Subject/), {
      target: { value: 'My subject' },
    });
    fireEvent.change(screen.getByLabelText(/Tell us what's going on/), {
      target: { value: 'This is a long enough message' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send to support' }));

    await waitFor(() =>
      expect(
        screen.getByText('Could not create the ticket. Please try again.'),
      ).toBeInTheDocument(),
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('surfaces a network error from the mutation', async () => {
    const createErrMock = {
      request: {
        query: CREATE_TICKET,
        variables: {
          input: {
            subject: 'My subject',
            category: 'GENERAL',
            body_text: 'This is a long enough message',
            attachments: [],
          },
        },
      },
      error: new Error('Boom failure'),
    };

    renderPage(['/support/tickets'], [headerMock, emptyTicketsMock, createErrMock]);

    await waitFor(() =>
      expect(screen.getByDisplayValue('Jane Doe')).toBeInTheDocument(),
    );

    fireEvent.change(screen.getByLabelText(/^Subject/), {
      target: { value: 'My subject' },
    });
    fireEvent.change(screen.getByLabelText(/Tell us what's going on/), {
      target: { value: 'This is a long enough message' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send to support' }));

    await waitFor(() =>
      expect(screen.getByText('Boom failure')).toBeInTheDocument(),
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('renders the ticket list and navigates on a ticket click', async () => {
    renderPage(['/support/tickets'], [headerMock, ticketsMock]);

    expect(await screen.findByText('Payment failed')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Payment failed'));
    expect(mockNavigate).toHaveBeenCalledWith('/tickets/abc123def456');
  });
});
