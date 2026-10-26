import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';

import FaqSearch from '../FaqSearch';
import SupportHubPage from '../SupportHubPage';
import AllTicketsPage from '../AllTicketsPage';
import CreateTicketDialog from '../CreateTicketDialog';
import GrievancePage from '../GrievancePage';
import FaqsPage from '../../FaqsPage';
import { fallbackT } from '../../../i18n/fallback';

const h = vi.hoisted(() => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  me: { current: undefined as unknown },
  debounced: vi.fn((v: string) => v),
}));

vi.mock('@apollo/client/react', async (orig) => ({
  ...(await orig<object>()),
  useQuery: h.useQuery,
  useMutation: h.useMutation,
}));
vi.mock('../../../hooks/useDebouncedValue', () => ({ useDebouncedValue: h.debounced }));
vi.mock('../../../user-info/useUserInfo', () => ({ useUserInfo: () => ({ me: h.me.current }) }));
vi.mock('../../../forms/support-form/AttachmentsField', () => ({
  default: (p: { attachments: string[]; setAttachments: (n: string[]) => void }) => (
    <button data-testid="attach" onClick={() => p.setAttachments(['u1'])}>
      {p.attachments.length}
    </button>
  ),
}));
vi.mock('../../../forms/grievance', () => ({
  default: (p: { loading: boolean; tickets: unknown[]; ticketsLoading: boolean; prefill: unknown; onSubmit: (v: unknown) => Promise<void> }) => (
    <button
      data-testid="grievance-form"
      data-tickets={p.tickets.length}
      data-prefill={JSON.stringify(p.prefill ?? null)}
      data-loading={String(p.ticketsLoading)}
      onClick={() => p.onSubmit({ subject: 's' })}
    />
  ),
  GrievanceEscalationNotice: () => <div data-testid="notice" />,
}));

const Where = () => <div data-testid="where">{useLocation().pathname}</div>;
const inRouter = (ui: React.ReactNode) =>
  render(
    <MemoryRouter initialEntries={['/start']}>
      <Routes>
        <Route path="/start" element={ui} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => {
  vi.clearAllMocks();
  h.me.current = undefined;
  h.debounced.mockImplementation((v: string) => v);
});

describe('FaqSearch', () => {
  const search = (query: string, result: object) => {
    h.useQuery.mockReturnValue(result);
    const props = { query, onQueryChange: vi.fn(), onOpen: vi.fn() };
    render(<FaqSearch {...props} />);
    return props;
  };

  it('skips the query and shows no results panel for a blank search', () => {
    search('', { data: undefined, loading: false });
    expect(h.useQuery.mock.calls[0][1]).toMatchObject({ skip: true, variables: { search: '' } });
    expect(screen.queryByTestId('support-search-empty')).not.toBeInTheDocument();
    expect(screen.queryByTestId('support-search-clear')).not.toBeInTheDocument();
  });

  it('searches with the trimmed text and reports typing and clearing', () => {
    const props = search(' refund ', { data: { faqs: [] }, loading: false });
    expect(h.useQuery.mock.calls[0][1]).toMatchObject({ skip: false, variables: { search: 'refund' } });
    fireEvent.change(screen.getByTestId('support-search'), { target: { value: 'refunds' } });
    expect(props.onQueryChange).toHaveBeenCalledWith('refunds');
    fireEvent.click(screen.getByTestId('support-search-clear'));
    expect(props.onQueryChange).toHaveBeenCalledWith('');
  });

  it('shows a skeleton while loading', () => {
    search('x', { data: undefined, loading: true });
    expect(screen.getByTestId('support-search-loading')).toBeInTheDocument();
  });

  it('says nothing matched, naming the search', () => {
    search('zzz', { data: { faqs: [] }, loading: false });
    expect(screen.getByTestId('support-search-empty')).toHaveTextContent('zzz');
  });

  it('treats a missing answer like no results', () => {
    search('zzz', { data: undefined, loading: false });
    expect(screen.getByTestId('support-search-empty')).toBeInTheDocument();
  });

  it('lists matching questions and opens the tapped one', () => {
    const faqs = [
      { id: 'f1', question: 'Where is my refund?', answer: 'a' },
      { id: 'f2', question: 'How do I cancel?', answer: 'b' },
    ];
    const props = search('x', { data: { faqs }, loading: false });
    fireEvent.click(screen.getByTestId('support-search-f2'));
    expect(props.onOpen).toHaveBeenCalledWith(faqs[1]);
    expect(screen.getByTestId('support-search-f1')).toHaveTextContent('Where is my refund?');
  });
});

describe('SupportHubPage', () => {
  const groups = [
    {
      super_category: { id: 's1', name: 'Payments', slug: 'payments', icon: null },
      faqs: [{ id: 'f1', question: 'Where is my refund?', answer: 'In 5 days.' }],
    },
  ];

  const mockQueries = (hub: object, search: object = { data: undefined, loading: false }) =>
    h.useQuery.mockImplementation((doc: { definitions: { name?: { value: string } }[] }) => {
      const name = doc.definitions[0]?.name?.value;
      return name === 'PublicFaqGroups' ? hub : search;
    });

  it('shows skeletons while the FAQ groups load', () => {
    mockQueries({ data: undefined, loading: true });
    inRouter(<SupportHubPage />);
    expect(screen.getByTestId('support-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('frequently-asked')).not.toBeInTheDocument();
  });

  it('shows frequently-asked, topics, the chat entry and the other support ways but not live chat', () => {
    mockQueries({ data: { publicFaqGroups: groups }, loading: false });
    inRouter(<SupportHubPage />);
    expect(screen.getByTestId('frequently-asked')).toBeInTheDocument();
    expect(screen.getByTestId('support-topics')).toBeInTheDocument();
    expect(screen.getByTestId('support-start-chat')).toBeInTheDocument();
    expect(screen.getByTestId('support-more-sos')).toBeInTheDocument();
    expect(screen.queryByTestId('support-more-live')).not.toBeInTheDocument();
  });

  it('shows the load error', () => {
    mockQueries({ data: undefined, loading: false, error: { message: 'Hub failed' } });
    inRouter(<SupportHubPage />);
    expect(screen.getByTestId('support-error')).toHaveTextContent('Hub failed');
  });

  it('opens an FAQ answer from the frequently-asked cards and closes it', async () => {
    mockQueries({ data: { publicFaqGroups: groups }, loading: false });
    inRouter(<SupportHubPage />);
    fireEvent.click(screen.getByLabelText('Where is my refund?'));
    expect(await screen.findByTestId('support-faq-modal-title')).toHaveTextContent('Where is my refund?');
    fireEvent.click(screen.getByTestId('support-faq-modal-close'));
    await waitFor(() => expect(screen.queryByTestId('support-faq-modal-title')).not.toBeInTheDocument());
  });

  it('replaces the browse sections with search results while searching', () => {
    mockQueries({ data: { publicFaqGroups: groups }, loading: false }, { data: { faqs: [] }, loading: false });
    inRouter(<SupportHubPage />);
    fireEvent.change(screen.getByTestId('support-search'), { target: { value: 'refund' } });
    expect(screen.queryByTestId('frequently-asked')).not.toBeInTheDocument();
    expect(screen.queryByTestId('support-topics')).not.toBeInTheDocument();
    expect(screen.getByTestId('support-search-empty')).toBeInTheDocument();
  });

  it('does not show a skeleton for the hub while searching', () => {
    mockQueries({ data: undefined, loading: true }, { data: { faqs: [] }, loading: false });
    inRouter(<SupportHubPage />);
    fireEvent.change(screen.getByTestId('support-search'), { target: { value: 'x' } });
    expect(screen.queryByTestId('support-loading')).not.toBeInTheDocument();
  });
});

describe('AllTicketsPage', () => {
  const ticket = (over: object) => ({
    id: 't1',
    ticket_no: 'TKT-1',
    title: 'Refund missing',
    status: 'OPEN',
    source: 'TICKET',
    created_at: new Date(Date.now() - 2 * 86_400_000).toISOString(),
    ...over,
  });

  it('shows a spinner while loading with no rows', () => {
    h.useQuery.mockReturnValue({ data: undefined, loading: true, error: undefined });
    inRouter(<AllTicketsPage />);
    expect(screen.getByTestId('all-tickets-loading')).toBeInTheDocument();
  });

  it('shows the error when loading failed', () => {
    h.useQuery.mockReturnValue({ data: undefined, loading: false, error: { message: 'Down' } });
    inRouter(<AllTicketsPage />);
    expect(screen.getByTestId('all-tickets-error')).toHaveTextContent('Down');
  });

  it('says nothing has been raised yet', () => {
    h.useQuery.mockReturnValue({ data: { myUnifiedSupportTickets: [] }, loading: false, error: undefined });
    inRouter(<AllTicketsPage />);
    expect(screen.getByTestId('all-tickets-empty')).toHaveTextContent(fallbackT('mweb.supportHub.youHaveNotRaisedAnySupport'));
  });

  it('lists every source with its label and status and routes tickets and chats only', () => {
    h.useQuery.mockReturnValue({
      data: {
        myUnifiedSupportTickets: [
          ticket({}),
          ticket({ id: 'c1', ticket_no: 'CHT-1', source: 'CHAT', title: 'Chat' }),
          ticket({ id: 's1', ticket_no: 'SOS-1', source: 'SOS', title: 'Help' }),
          ticket({ id: 'cb1', ticket_no: 'CB-1', source: 'CALLBACK', title: 'Call me' }),
        ],
      },
      loading: false,
      error: undefined,
    });
    inRouter(<AllTicketsPage />);
    expect(screen.getByTestId('all-ticket-TKT-1')).toHaveTextContent('Support Ticket');
    expect(screen.getByTestId('all-ticket-TKT-1')).toHaveTextContent('2 days ago');
    expect(screen.getByTestId('all-ticket-TKT-1')).toHaveTextContent('OPEN');
    expect(screen.getByTestId('all-ticket-SOS-1')).toHaveTextContent('SOS');
    expect(screen.getByTestId('all-ticket-CB-1')).toHaveTextContent('Callback Request');
    expect(screen.getByTestId('all-ticket-CHT-1')).toHaveTextContent('Chat with Us');
    expect(screen.getByTestId('all-ticket-SOS-1')).toBeDisabled();
    expect(screen.getByTestId('all-ticket-CB-1')).toBeDisabled();
    fireEvent.click(screen.getByTestId('all-ticket-CHT-1'));
    expect(screen.getByTestId('where')).toHaveTextContent('/live-chat');
  });

  it('opens a ticket page', () => {
    h.useQuery.mockReturnValue({ data: { myUnifiedSupportTickets: [ticket({})] }, loading: false, error: undefined });
    inRouter(<AllTicketsPage />);
    fireEvent.click(screen.getByTestId('all-ticket-TKT-1'));
    expect(screen.getByTestId('where')).toHaveTextContent('/tickets/t1');
  });

  it('keeps showing rows while a refresh loads', () => {
    h.useQuery.mockReturnValue({ data: { myUnifiedSupportTickets: [ticket({})] }, loading: true, error: undefined });
    inRouter(<AllTicketsPage />);
    expect(screen.queryByTestId('all-tickets-loading')).not.toBeInTheDocument();
    expect(screen.getByTestId('all-ticket-TKT-1')).toBeInTheDocument();
  });
});

describe('CreateTicketDialog', () => {
  const setup = (createTicket = vi.fn().mockResolvedValue({ data: { createTicket: { id: 'new1' } } }), loading = false) => {
    h.useMutation.mockReturnValue([createTicket, { loading }]);
    const props = { open: true, onClose: vi.fn(), onCreated: vi.fn() };
    render(<CreateTicketDialog {...props} />);
    return { ...props, createTicket };
  };
  const fill = () => {
    fireEvent.change(screen.getByTestId('create-ticket-subject'), { target: { value: '  Refund  ' } });
    fireEvent.change(screen.getByTestId('create-ticket-message'), { target: { value: ' Not received ' } });
  };

  it('disables Create until both subject and message have text', () => {
    setup();
    const submit = screen.getByTestId('create-ticket-submit');
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByTestId('create-ticket-subject'), { target: { value: '  ' } });
    fireEvent.change(screen.getByTestId('create-ticket-message'), { target: { value: 'x' } });
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByTestId('create-ticket-subject'), { target: { value: 'S' } });
    expect(submit).toBeEnabled();
  });

  it('creates the ticket with trimmed text, the category and attachments, then resets, closes and reports the id', async () => {
    const { createTicket, onClose, onCreated } = setup();
    fill();
    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(await screen.findByTestId('create-ticket-category-PAYMENT'));
    fireEvent.click(screen.getByTestId('attach'));
    fireEvent.click(screen.getByTestId('create-ticket-submit'));
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith('new1'));
    expect(createTicket).toHaveBeenCalledWith({
      variables: { input: { subject: 'Refund', category: 'PAYMENT', body_text: 'Not received', attachments: ['u1'] } },
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('create-ticket-subject')).toHaveValue('');
    expect(screen.getByTestId('attach')).toHaveTextContent('0');
  });

  it('reports an undefined id when the server returns none', async () => {
    const { onCreated } = setup(vi.fn().mockResolvedValue({ data: undefined }));
    fill();
    fireEvent.click(screen.getByTestId('create-ticket-submit'));
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(undefined));
  });

  it('cancels', () => {
    const { onClose, createTicket } = setup();
    fireEvent.click(screen.getByTestId('create-ticket-cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(createTicket).not.toHaveBeenCalled();
  });

  it('keeps Create disabled while a submit is in flight', () => {
    setup(undefined, true);
    fill();
    expect(screen.getByTestId('create-ticket-submit')).toBeDisabled();
  });
});

describe('GrievancePage', () => {
  const queries = (officer: unknown, tickets: unknown, loading = false) =>
    h.useQuery.mockImplementation((doc: { loc?: { source: { body: string } } }) => {
      const body = doc.loc?.source.body ?? '';
      if (body.includes('grievanceOfficer')) return { data: officer };
      return { data: tickets, loading };
    });

  it('shows the notice, the form with ticket options and the officer card', () => {
    h.useMutation.mockReturnValue([vi.fn(), { loading: false }]);
    queries({ grievanceOfficer: { name: 'Ravi' } }, { myUnifiedSupportTickets: [{ ticket_no: 'T-1', title: 'Late' }] });
    inRouter(<GrievancePage />);
    expect(screen.getByTestId('notice')).toBeInTheDocument();
    expect(screen.getByTestId('grievance-form')).toHaveAttribute('data-tickets', '1');
    expect(screen.getByTestId('grievance-officer')).toHaveTextContent('Ravi');
    expect(screen.getByTestId('grievance-form')).toHaveAttribute('data-prefill', 'null');
  });

  it('prefills from the signed-in account and tolerates missing ticket data', () => {
    h.useMutation.mockReturnValue([vi.fn(), { loading: false }]);
    h.me.current = { full_name: 'Asha Rao', email: 'a@b.co', phone: '9999999999', address: '' };
    queries(undefined, undefined, true);
    inRouter(<GrievancePage />);
    expect(screen.getByTestId('grievance-form')).toHaveAttribute('data-tickets', '0');
    expect(screen.getByTestId('grievance-form')).toHaveAttribute('data-loading', 'true');
    expect(screen.getByTestId('grievance-form').getAttribute('data-prefill')).toContain('a@b.co');
  });

  it('submits with source APP and then shows the reference, which can be dismissed to raise another', async () => {
    const submit = vi.fn().mockResolvedValue({ data: { submitGrievance: { grievance_no: 'GRV-77' } } });
    h.useMutation.mockReturnValue([submit, { loading: false }]);
    queries(undefined, { myUnifiedSupportTickets: [] });
    inRouter(<GrievancePage />);
    fireEvent.click(screen.getByTestId('grievance-form'));
    expect(await screen.findByTestId('grievance-reference')).toHaveTextContent('GRV-77');
    expect(submit).toHaveBeenCalledWith({ variables: { input: { subject: 's', source: 'APP' } } });
    expect(screen.queryByTestId('grievance-form')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('grievance-raise-another'));
    expect(screen.getByTestId('grievance-form')).toBeInTheDocument();
  });

  it('stays on the form when the server returns no grievance', async () => {
    const submit = vi.fn().mockResolvedValue({ data: undefined });
    h.useMutation.mockReturnValue([submit, { loading: false }]);
    queries(undefined, { myUnifiedSupportTickets: [] });
    inRouter(<GrievancePage />);
    fireEvent.click(screen.getByTestId('grievance-form'));
    await waitFor(() => expect(submit).toHaveBeenCalled());
    expect(screen.queryByTestId('grievance-sent')).not.toBeInTheDocument();
  });
});

describe('FaqsPage', () => {
  const groups = [
    {
      super_category: { id: 's1', name: 'Payments', slug: 'p', icon: null },
      faqs: [
        { id: 'f1', question: 'Where is my refund?', answer: 'Refunds take five days' },
        { id: 'f2', question: 'Cancel order', answer: 'Use Pod History' },
      ],
    },
    { super_category: null, faqs: [{ id: 'f3', question: 'Contact?', answer: 'Use chat' }] },
  ];
  const page = (result: object, url = '/faqs') => {
    h.useQuery.mockReturnValue(result);
    return render(
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/faqs" element={<FaqsPage />} />
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('shows skeletons while loading, and no chips without groups', () => {
    page({ data: undefined, loading: true, error: undefined });
    expect(screen.getByTestId('faqs-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('faqs-filter-all')).not.toBeInTheDocument();
    expect(screen.queryByTestId('faqs-no-match')).not.toBeInTheDocument();
  });

  it('shows a load error and the no-match note', () => {
    page({ data: undefined, loading: false, error: { message: 'FAQs down' } });
    expect(screen.getByTestId('faqs-error')).toHaveTextContent('FAQs down');
    expect(screen.getByTestId('faqs-no-match')).toBeInTheDocument();
  });

  it('groups FAQs under their category, with General for uncategorised ones', () => {
    page({ data: { publicFaqGroups: groups }, loading: false, error: undefined });
    expect(screen.getByTestId('faqs-group-s1-header')).toHaveTextContent('Payments');
    expect(screen.getByTestId('faqs-group-GENERIC-header')).toHaveTextContent('General');
    expect(screen.getByTestId('faq-f3')).toBeInTheDocument();
  });

  it('filters by category chip and starts on the cat query param', () => {
    const { unmount } = page({ data: { publicFaqGroups: groups }, loading: false, error: undefined });
    fireEvent.click(screen.getByTestId('faqs-filter-GENERIC'));
    expect(screen.getByTestId('faqs-filter-GENERIC')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByTestId('faq-f1')).not.toBeInTheDocument();
    expect(screen.getByTestId('faq-f3')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('faqs-filter-all'));
    expect(screen.getByTestId('faq-f1')).toBeInTheDocument();
    unmount();
    page({ data: { publicFaqGroups: groups }, loading: false, error: undefined }, '/faqs?cat=s1');
    expect(screen.getByTestId('faqs-filter-s1')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByTestId('faq-f3')).not.toBeInTheDocument();
  });

  it('searches questions and answers case-insensitively and drops empty groups', () => {
    page({ data: { publicFaqGroups: groups }, loading: false, error: undefined });
    fireEvent.change(screen.getByTestId('faqs-search'), { target: { value: 'FIVE DAYS' } });
    expect(screen.getByTestId('faq-f1')).toBeInTheDocument();
    expect(screen.queryByTestId('faq-f2')).not.toBeInTheDocument();
    expect(screen.queryByTestId('faqs-group-GENERIC-header')).not.toBeInTheDocument();
    fireEvent.change(screen.getByTestId('faqs-search'), { target: { value: 'nothing-matches' } });
    expect(screen.getByTestId('faqs-no-match')).toBeInTheDocument();
  });

  it('toggles helpful, and opens still-need-help on not helpful', async () => {
    page({ data: { publicFaqGroups: groups }, loading: false, error: undefined });
    fireEvent.click(screen.getByTestId('faq-f1-helpful'));
    expect(screen.getByTestId('faq-f1-helpful')).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByTestId('faq-f1-helpful'));
    expect(screen.getByTestId('faq-f1-helpful')).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(screen.getByTestId('faq-f1-not-helpful'));
    expect(await screen.findByTestId('faqs-still-need-help-title')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('faqs-still-need-help-close'));
    await waitFor(() => expect(screen.queryByTestId('faqs-still-need-help-title')).not.toBeInTheDocument());
  });
});
