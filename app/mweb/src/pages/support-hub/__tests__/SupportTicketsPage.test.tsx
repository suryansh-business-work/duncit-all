import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MockedProvider } from '@apollo/client/testing';
import SupportTicketsPage from '../SupportTicketsPage';
import { HEADER_DATA } from '../../../components/app-header/queries';
import { CREATE_TICKET, MY_TICKETS } from '../../support-tickets/queries';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

const headerMock = {
  request: { query: HEADER_DATA },
  result: {
    data: {
      branding: {
        app_name: 'Duncit',
        logo_url: '',
        mweb_logo_url: '',
        primary_color: '#ff4f73',
        home_all_vibe_icon_url: '',
        home_header_tagline: '',
      },
      me: {
        user_id: 'u1',
        full_name: 'Jane Doe',
        first_name: 'Jane',
        last_name: 'Doe',
        email: 'jane@example.com',
        is_email_verified: true,
        profile_photo: null,
        bio: null,
        dob: null,
        city: null,
        state: null,
        country: null,
        phone_number: null,
        whatsapp_number: null,
        selected_location_id: null,
        roles: [],
        following_user_ids: [],
      },
      superCategories: [],
      locations: [],
      activePodLocationIds: [],
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
    <MockedProvider mocks={mocks} addTypename={false}>
      <MemoryRouter initialEntries={initialEntries}>
        <SupportTicketsPage />
      </MemoryRouter>
    </MockedProvider>,
  );
}

describe('SupportTicketsPage', () => {
  beforeEach(() => mockNavigate.mockReset());

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
      result: { data: { createTicket: { id: 'newid99' } } },
    };

    renderPage(['/support/tickets'], [headerMock, emptyTicketsMock, createMock, emptyTicketsMock]);

    await waitFor(() =>
      expect(screen.getByDisplayValue('Jane Doe')).toBeInTheDocument(),
    );

    fireEvent.change(screen.getByLabelText('Subject'), {
      target: { value: 'My subject' },
    });
    fireEvent.change(screen.getByLabelText("Tell us what's going on"), {
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

    fireEvent.change(screen.getByLabelText('Subject'), {
      target: { value: 'My subject' },
    });
    fireEvent.change(screen.getByLabelText("Tell us what's going on"), {
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

    fireEvent.change(screen.getByLabelText('Subject'), {
      target: { value: 'My subject' },
    });
    fireEvent.change(screen.getByLabelText("Tell us what's going on"), {
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
