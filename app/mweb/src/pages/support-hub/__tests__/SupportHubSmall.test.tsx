import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';

import FaqAnswerDialog from '../FaqAnswerDialog';
import FaqFeedback from '../FaqFeedback';
import StillNeedHelpDialog from '../StillNeedHelpDialog';
import StartConversation from '../StartConversation';
import LiveTicketsPage from '../LiveTicketsPage';
import SupportSectionCard from '../SupportSectionCard';
import SupportShell from '../SupportShell';
import CallbackPage from '../CallbackPage';
import SosPage from '../SosPage';
import PodScopedPage from '../PodScopedPage';
import PodPicker from '../PodPicker';
import GrievanceOfficerCard from '../GrievanceOfficerCard';
import { usePodPicker } from '../usePodPicker';
import { SUPPORT_SECTIONS } from '../sections';
import { fallbackT } from '../../../i18n/fallback';

const h = vi.hoisted(() => ({ useQuery: vi.fn() }));

vi.mock('@apollo/client/react', async (orig) => ({ ...(await orig<object>()), useQuery: h.useQuery }));
vi.mock('../CallbackContent', () => ({
  default: (p: { selected: unknown }) => <div data-testid="callback-content" data-selected={String(p.selected)} />,
}));
vi.mock('../SosContent', () => ({
  default: (p: { selected: { podDocId: string } | null }) => (
    <div data-testid="sos-content">{p.selected?.podDocId ?? 'none'}</div>
  ),
}));
vi.mock('../../../utils/dateFormat', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../utils/dateFormat')>()),
  useDateFormat: () => ({ formatDateTime: (d: string) => `at:${d}` }),
}));

const Where = () => <div data-testid="where">{useLocation().pathname}</div>;
const inRouter = (ui: React.ReactNode, start = '/start') =>
  render(
    <MemoryRouter initialEntries={[start]}>
      <Routes>
        <Route path="/start" element={ui} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => {
  vi.clearAllMocks();
});

describe('FaqAnswerDialog', () => {
  const faq = { id: 'f1', question: 'Where is my refund?', answer: 'Refunds take 5 days.' };

  it('shows nothing without an FAQ', () => {
    inRouter(<FaqAnswerDialog faq={null} onClose={vi.fn()} />);
    expect(screen.queryByTestId('support-faq-modal-title')).not.toBeInTheDocument();
  });

  it('shows question and answer and closes', () => {
    const onClose = vi.fn();
    inRouter(<FaqAnswerDialog faq={faq} onClose={onClose} />);
    expect(screen.getByTestId('support-faq-modal-title')).toHaveTextContent('Where is my refund?');
    expect(screen.getByText('Refunds take 5 days.')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('support-faq-modal-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes and opens the live chat from the still-need-help button', () => {
    const onClose = vi.fn();
    inRouter(<FaqAnswerDialog faq={faq} onClose={onClose} />);
    fireEvent.click(screen.getByTestId('support-faq-modal-chat'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('where')).toHaveTextContent('/live-chat');
  });
});

describe('FaqFeedback', () => {
  it('reports helpful with the faq id, and not-helpful', () => {
    const onToggleHelpful = vi.fn();
    const onNotHelpful = vi.fn();
    render(<FaqFeedback faqId="f1" helpful={false} onToggleHelpful={onToggleHelpful} onNotHelpful={onNotHelpful} />);
    expect(screen.getByTestId('faq-f1-helpful')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByTestId('faq-f1-helpful-mark')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('faq-f1-helpful'));
    expect(onToggleHelpful).toHaveBeenCalledWith('f1');
    fireEvent.click(screen.getByTestId('faq-f1-not-helpful'));
    expect(onNotHelpful).toHaveBeenCalledTimes(1);
  });

  it('shows a thumbs-up mark once marked helpful', () => {
    render(<FaqFeedback faqId="f1" helpful onToggleHelpful={vi.fn()} onNotHelpful={vi.fn()} />);
    expect(screen.getByTestId('faq-f1-helpful')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('faq-f1-helpful-mark')).toBeInTheDocument();
  });
});

describe('StillNeedHelpDialog', () => {
  it('closes, and chats via the live chat route', () => {
    const onClose = vi.fn();
    inRouter(<StillNeedHelpDialog open onClose={onClose} />);
    expect(screen.getByTestId('faqs-still-need-help-title')).toHaveTextContent(fallbackT('mweb.faqsPage.stillNeedHelp'));
    fireEvent.click(screen.getByTestId('faqs-still-need-help-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTestId('faqs-still-need-help-chat'));
    expect(onClose).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('where')).toHaveTextContent('/live-chat');
  });
});

describe('StartConversation', () => {
  it('opens the live chat on press and on Enter or Space, but not other keys', () => {
    inRouter(<StartConversation />);
    const card = screen.getByTestId('support-start-chat');
    fireEvent.keyDown(card, { key: 'a' });
    expect(screen.queryByTestId('where')).not.toBeInTheDocument();
    fireEvent.keyDown(card, { key: 'Enter' });
    expect(screen.getByTestId('where')).toHaveTextContent('/live-chat');
  });

  it('opens the live chat on click and Space', () => {
    const { unmount } = inRouter(<StartConversation />);
    fireEvent.click(screen.getByTestId('support-start-chat'));
    expect(screen.getByTestId('where')).toHaveTextContent('/live-chat');
    unmount();
    inRouter(<StartConversation />);
    fireEvent.keyDown(screen.getByTestId('support-start-chat'), { key: ' ' });
    expect(screen.getByTestId('where')).toHaveTextContent('/live-chat');
  });
});

describe('LiveTicketsPage', () => {
  it('enters the live chat', () => {
    inRouter(<LiveTicketsPage />);
    expect(screen.getByTestId('support-shell-title')).toHaveTextContent(fallbackT('mweb.common.chatWithUs'));
    fireEvent.click(screen.getByTestId('live-tickets-chat-entry'));
    expect(screen.getByTestId('where')).toHaveTextContent('/live-chat');
  });
});

describe('SupportSectionCard', () => {
  it('links to the section path with its localized title when it has a key', () => {
    const section = SUPPORT_SECTIONS.find((s) => s.key === 'callback')!;
    inRouter(<SupportSectionCard section={section} />);
    const tile = screen.getByTestId('support-more-callback');
    expect(tile).toHaveAttribute('href', '/support/callback');
    expect(tile).toHaveTextContent(fallbackT('mweb.common.callbackRequest'));
  });

  it('falls back to the literal label for a section with no key', () => {
    const section = SUPPORT_SECTIONS.find((s) => s.key === 'sos')!;
    expect(section.labelKey).toBeUndefined();
    inRouter(<SupportSectionCard section={section} />);
    expect(screen.getByTestId('support-more-sos')).toHaveTextContent('SOS');
  });
});

describe('SupportShell', () => {
  it('goes back to the given path, and to history when there is none', () => {
    const { unmount } = inRouter(<SupportShell title="T" backTo="/support">x</SupportShell>);
    fireEvent.click(screen.getByTestId('support-shell-back'));
    expect(screen.getByTestId('where')).toHaveTextContent('/support');
    unmount();

    render(
      <MemoryRouter initialEntries={['/a', '/b']} initialIndex={1}>
        <Routes>
          <Route path="/a" element={<Where />} />
          <Route path="/b" element={<SupportShell title="T">x</SupportShell>} />
        </Routes>
      </MemoryRouter>
    );
    fireEvent.click(screen.getByTestId('support-shell-back'));
    expect(screen.getByTestId('where')).toHaveTextContent('/a');
  });

  it('centres the title when a right action is present and shows it', () => {
    inRouter(
      <SupportShell title="T" action={<button data-testid="act" />}>
        body
      </SupportShell>
    );
    expect(screen.getByTestId('act')).toBeInTheDocument();
    expect(screen.getByTestId('support-shell-content')).toHaveTextContent('body');
    expect(screen.getByTestId('support-shell-title')).toHaveStyle({ textAlign: 'center' });
  });

  it('left-aligns the title without an action', () => {
    inRouter(<SupportShell title="T">body</SupportShell>);
    expect(screen.getByTestId('support-shell-title')).toHaveStyle({ textAlign: 'left' });
  });
});

describe('CallbackPage and SosPage', () => {
  it('shows the callback form with no pod selected', () => {
    inRouter(<CallbackPage />);
    expect(screen.getByTestId('support-shell-title')).toHaveTextContent(fallbackT('mweb.common.callbackRequest'));
    expect(screen.getByTestId('callback-content')).toHaveAttribute('data-selected', 'null');
  });

  it('shows SOS for the first pod picked by the pod picker', () => {
    h.useQuery.mockReturnValue({
      data: {
        myPodMemberships: [
          { id: 'm1', pod: { id: 'pd1', pod_id: 'slug', pod_title: 'Run', pod_date_time: '2099-01-01T00:00:00.000Z', pod_end_date_time: null } },
        ],
      },
      loading: false,
    });
    inRouter(<SosPage />);
    expect(screen.getByTestId('support-shell-title')).toHaveTextContent('SOS');
    expect(screen.getByTestId('sos-content')).toHaveTextContent('pd1');
  });
});

describe('PodPicker', () => {
  const options = [
    { membershipId: 'm1', podDocId: 'pd1', podSlug: 's1', title: 'Run', startsAt: '2026-01-01T00:00:00.000Z', endsAt: null },
    { membershipId: 'm2', podDocId: 'pd2', podSlug: 's2', title: 'Yoga', startsAt: '2026-02-01T00:00:00.000Z', endsAt: null },
  ];

  it('shows a loading note while loading with no options', () => {
    render(<PodPicker options={[]} selectedId="" onChange={vi.fn()} loading />);
    expect(screen.getByTestId('pod-picker-loading')).toBeInTheDocument();
  });

  it('says there are no pods once loaded empty', () => {
    render(<PodPicker options={[]} selectedId="" onChange={vi.fn()} loading={false} />);
    expect(screen.getByTestId('pod-picker-empty')).toBeInTheDocument();
  });

  it('keeps the list while a refresh is loading and reports a pick', async () => {
    const onChange = vi.fn();
    render(<PodPicker options={options} selectedId="pd1" onChange={onChange} loading />);
    expect(screen.queryByTestId('pod-picker-loading')).not.toBeInTheDocument();
    fireEvent.mouseDown(screen.getByRole('combobox'));
    expect(await screen.findByTestId('pod-option-pd2')).toHaveTextContent('at:2026-02-01T00:00:00.000Z');
    fireEvent.click(screen.getByTestId('pod-option-pd2'));
    expect(onChange).toHaveBeenCalledWith('pd2');
  });
});

describe('PodScopedPage', () => {
  it('passes null to its children and shows the empty picker when there are no pods', () => {
    h.useQuery.mockReturnValue({ data: { myPodMemberships: [] }, loading: false });
    const render1 = vi.fn(() => <span data-testid="kid" />);
    inRouter(<PodScopedPage title="T">{render1}</PodScopedPage>);
    expect(render1).toHaveBeenLastCalledWith(null);
    expect(screen.getByTestId('pod-picker-empty')).toBeInTheDocument();
  });
});

describe('usePodPicker', () => {
  const pod = (id: string, start: string, end: string | null) => ({
    id: `m-${id}`,
    pod: { id, pod_id: `slug-${id}`, pod_title: `Pod ${id}`, pod_date_time: start, pod_end_date_time: end },
  });
  const day = 86_400_000;
  const iso = (offset: number) => new Date(Date.now() + offset).toISOString();

  it('orders upcoming pods soonest first, then ended pods most recently ended first, dropping memberships with no pod', () => {
    h.useQuery.mockReturnValue({
      data: {
        myPodMemberships: [
          pod('ended-old', iso(-10 * day), iso(-9 * day)),
          pod('later', iso(2 * day), null),
          { id: 'orphan', pod: null },
          pod('ended-new', iso(-3 * day), iso(-2 * day)),
          pod('soon', iso(1 * day), null),
          pod('ended-default', iso(-5 * day), null),
        ],
      },
      loading: false,
    });
    const { result } = renderHook(() => usePodPicker());
    expect(result.current.options.map((o) => o.podDocId)).toEqual([
      'soon',
      'later',
      'ended-new',
      'ended-default',
      'ended-old',
    ]);
    expect(result.current.selectedId).toBe('soon');
    expect(result.current.selected?.title).toBe('Pod soon');
    expect(result.current.options[0].endsAt).toBeNull();
    expect(result.current.options[2].endsAt).not.toBeNull();
  });

  it('keeps the picked pod, and falls back to the first when it vanishes', async () => {
    const two = {
      myPodMemberships: [pod('a', iso(1 * day), null), pod('b', iso(2 * day), null)],
    };
    h.useQuery.mockReturnValue({ data: two, loading: false });
    const { result, rerender } = renderHook(() => usePodPicker());
    await waitFor(() => expect(result.current.selectedId).toBe('a'));
    act(() => result.current.setSelectedId('b'));
    await waitFor(() => expect(result.current.selectedId).toBe('b'));
    h.useQuery.mockReturnValue({ data: { myPodMemberships: [two.myPodMemberships[0]] }, loading: false });
    rerender();
    await waitFor(() => expect(result.current.selectedId).toBe('a'));
  });

  it('clears the selection when no pods remain, and handles no data', async () => {
    h.useQuery.mockReturnValue({ data: undefined, loading: true });
    const { result, rerender } = renderHook(() => usePodPicker());
    expect(result.current.options).toEqual([]);
    expect(result.current.selected).toBeNull();
    expect(result.current.loading).toBe(true);
    h.useQuery.mockReturnValue({ data: { myPodMemberships: [pod('a', iso(day), null)] }, loading: false });
    rerender();
    await waitFor(() => expect(result.current.selectedId).toBe('a'));
    h.useQuery.mockReturnValue({ data: { myPodMemberships: [] }, loading: false });
    rerender();
    await waitFor(() => expect(result.current.selectedId).toBe(''));
  });
});

describe('GrievanceOfficerCard', () => {
  it('says the officer is not published yet when nothing is filled in', () => {
    render(<GrievanceOfficerCard />);
    expect(screen.getByTestId('grievance-officer')).toHaveTextContent(fallbackT('grievance.officerEmpty'));
  });

  it('treats blank-only fields as not published', () => {
    render(<GrievanceOfficerCard officer={{ name: '  ', email: '', phone: '', address: '' } as never} />);
    expect(screen.getByTestId('grievance-officer')).toHaveTextContent(fallbackT('grievance.officerEmpty'));
  });

  it('lists only the details that are filled in', () => {
    render(<GrievanceOfficerCard officer={{ name: 'Ravi', email: 'g@duncit.test', phone: '', address: '' } as never} />);
    const card = screen.getByTestId('grievance-officer');
    expect(card).toHaveTextContent('Ravi');
    expect(card).toHaveTextContent('g@duncit.test');
    expect(card).toHaveTextContent(fallbackT('grievance.officerEmail'));
    expect(card).not.toHaveTextContent(fallbackT('grievance.officerPhone'));
    expect(card).not.toHaveTextContent(fallbackT('grievance.officerEmpty'));
  });
});
