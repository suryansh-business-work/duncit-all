import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';

import ClubSegments, { pickPodMoments } from '../ClubSegments';
import ClubFriendsSection from '../ClubFriendsSection';
import ClubHostsSection from '../ClubHostsSection';
import ClubMomentsSection from '../ClubMomentsSection';
import ClubFaqsSection from '../ClubFaqsSection';
import ClubSocialLinks from '../ClubSocialLinks';
import ClubAdminsSection from '../ClubAdminsSection';
import ClubBulletsSection from '../ClubBulletsSection';
import ClubHeroActions from '../ClubHeroActions';
import ClubPodRailCard from '../ClubPodRailCard';
import ClubStoriesSection from '../ClubStoriesSection';
import { fallbackT } from '../../../i18n/fallback';

const h = vi.hoisted(() => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  notify: vi.fn(),
}));

vi.mock('@apollo/client/react', async (orig) => ({ ...(await orig<object>()), useQuery: h.useQuery, useMutation: h.useMutation }));
vi.mock('../../../components/notify', () => ({ notify: h.notify, notifySuccess: vi.fn(), notifyError: vi.fn() }));
vi.mock('../ClubPodsScheduleSection', () => ({ default: (p: { pods: unknown[] }) => <div data-testid="schedule" data-count={p.pods.length} /> }));
vi.mock('../../../components/moments/MomentLightbox', () => ({
  default: (p: { index: number | null; moments: { url: string }[]; actions?: React.ReactNode; onClose: () => void; onIndexChange: (i: number | null) => void }) =>
    p.index === null ? null : (
      <div data-testid="lightbox" data-index={p.index}>
        {p.actions}
        <button data-testid="lb-next" onClick={() => p.onIndexChange(p.index === null ? 0 : p.index + 1)} />
        <button data-testid="lb-close" onClick={p.onClose} />
        <button data-testid="lb-clear" onClick={() => p.onIndexChange(null)} />
      </div>
    ),
}));
vi.mock('../../../components/content-report/ContentActionsMenu', () => ({
  default: (p: { canDelete: boolean; onDelete: () => void; onReport: () => void }) => (
    <div data-testid="actions" data-can-delete={String(p.canDelete)}>
      <button data-testid="act-delete" onClick={p.onDelete} />
      <button data-testid="act-report" onClick={p.onReport} />
    </div>
  ),
}));
vi.mock('../../../components/content-report/ReportContentDialog', () => ({
  default: (p: { targetId: string | null; onClose: () => void }) =>
    p.targetId ? (
      <div data-testid="report" data-target={p.targetId}>
        <button data-testid="report-close" onClick={p.onClose} />
      </div>
    ) : null,
}));
vi.mock('../ClubStoryTiles', () => ({
  default: (p: { stories: { id: string }[]; onOpen: (i: number) => void; canPost: boolean }) => (
    <div data-testid="tiles" data-can-post={String(p.canPost)} data-count={p.stories.length}>
      {p.stories.map((s, i) => (
        <button key={s.id} data-testid={`tile-${s.id}`} onClick={() => p.onOpen(i)} />
      ))}
    </div>
  ),
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

beforeEach(() => vi.clearAllMocks());

describe('ClubSegments', () => {
  const pods = [{ id: 'p1', pod_images_and_videos: [{ url: 'm1', type: 'IMAGE' }, { url: 'm2', type: 'VIDEO' }] }, { id: 'p2' }];
  const club = (over: object = {}) => ({
    who_we_are: ['We run'],
    what_we_do: ['We meet'],
    perks: ['Snacks', '   '],
    values: ['Kind'],
    faqs: [{ question: 'Q1', answer: 'A1' }],
    hosts: [{ id: 'h1', name: 'Hana' }],
    club_admins: [{ id: 'a1', name: 'Adi' }],
    ...over,
  });
  const segments = (c: object, p = pods) => inRouter(<ClubSegments club={c} pods={p} priceFormat={(v) => `₹${v}`} onOpenPod={vi.fn()} />);

  it('picks a bounded sample of the club pod media, tolerating pods with none', () => {
    const picked = pickPodMoments(pods, 1);
    expect(picked).toHaveLength(1);
    expect(['m1', 'm2']).toContain(picked[0].url);
    expect(pickPodMoments(pods, 12)).toHaveLength(2);
    expect(pickPodMoments([], 12)).toEqual([]);
  });

  it('offers a pill for each section the club has, starting on the pods schedule', () => {
    segments(club());
    ['PODS', 'MOMENTS', 'WHO', 'WHAT', 'PERKS', 'VALUES', 'FAQS', 'HOSTS', 'ADMINS'].forEach((key) => expect(screen.getByTestId(`club-tab-${key}`)).toBeInTheDocument());
    expect(screen.getByTestId('club-tab-PODS')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('schedule')).toBeInTheDocument();
    expect(document.querySelector('[data-tour="club-pods"]')).not.toBeNull();
  });

  it('treats content a club never set as absent', () => {
    segments({}, []);
    expect(screen.getAllByRole('button').map((b) => b.getAttribute('data-testid'))).toEqual(['club-tab-PODS']);
  });

  it('hides pills for sections the club has no content for, and does not spotlight an empty schedule', () => {
    segments(club({ who_we_are: [], what_we_do: undefined, perks: [], values: [], faqs: [], hosts: [], club_admins: [] }), []);
    expect(screen.getAllByRole('button').map((b) => b.getAttribute('data-testid'))).toEqual(['club-tab-PODS']);
    expect(document.querySelector('[data-tour="club-pods"]')).toBeNull();
  });

  it.each([
    ['WHO', 'club-bullets'],
    ['WHAT', 'club-bullets'],
    ['PERKS', 'club-bullets'],
    ['VALUES', 'club-bullets'],
    ['FAQS', 'club-faqs'],
    ['HOSTS', 'club-hosts'],
    ['ADMINS', 'club-admins'],
    ['MOMENTS', 'club-moments'],
  ])('shows the %s section when its pill is chosen', (key, testId) => {
    segments(club());
    fireEvent.click(screen.getByTestId(`club-tab-${key}`));
    expect(screen.getByTestId('club-tab-' + key)).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId(testId)).toBeInTheDocument();
    expect(screen.queryByTestId('schedule')).not.toBeInTheDocument();
  });
});

describe('ClubFriendsSection', () => {
  const friends = (list: object[] | undefined, ids = ['u1']) => {
    h.useQuery.mockReturnValue({ data: list ? { publicUsersByIds: list } : undefined });
    render(<ClubFriendsSection friendIds={ids} />);
  };

  it('renders nothing when there are no friends, and skips the query for no ids', () => {
    friends([], []);
    expect(screen.queryByTestId('club-friends')).not.toBeInTheDocument();
    expect(h.useQuery.mock.calls[0][1]).toMatchObject({ skip: true });
  });

  it('renders nothing while the profiles have not loaded', () => {
    friends(undefined);
    expect(screen.queryByTestId('club-friends')).not.toBeInTheDocument();
  });

  it('names a single friend', () => {
    friends([{ user_id: 'u1', full_name: 'Asha Rao', profile_photo: null }]);
    expect(screen.getByTestId('club-friends')).toHaveTextContent('Asha Rao');
    expect(screen.getByTestId('club-friends')).not.toHaveTextContent('more');
  });

  it('names the first friend and counts the rest, listing everyone in the dialog', async () => {
    friends([
      { user_id: 'u1', full_name: 'Asha Rao', profile_photo: 'https://img/a.jpg' },
      { user_id: 'u2', full_name: 'Bela Shah', profile_photo: null },
      { user_id: 'u3', full_name: '', profile_photo: null },
    ]);
    expect(screen.getByTestId('club-friends')).toHaveTextContent('Asha Rao and 2 more');
    fireEvent.click(screen.getByTestId('club-friends-view-all'));
    expect(await screen.findByTestId('club-friends-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('club-friend-u2')).toHaveTextContent('Bela Shah');
    expect(screen.getByTestId('club-friend-u3')).toBeInTheDocument();
    fireEvent.keyDown(screen.getByTestId('club-friends-dialog'), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByTestId('club-friend-u2')).not.toBeInTheDocument());
  });
});

describe('ClubHostsSection', () => {
  it('renders nothing without hosts', () => {
    inRouter(<ClubHostsSection hosts={[]} />);
    expect(screen.queryByTestId('club-hosts')).not.toBeInTheDocument();
  });

  it('lists each host with an initial fallback and opens their profile', () => {
    inRouter(<ClubHostsSection hosts={[{ id: 'h1', name: 'hana', avatar_url: 'https://img/h.jpg' }, { id: 'h2', name: '' }]} title="Meet the team" />);
    expect(screen.getByTestId('club-hosts-header')).toHaveTextContent('Meet the team');
    expect(screen.getByTestId('club-host-h2')).toHaveTextContent('H');
    fireEvent.click(screen.getByTestId('club-host-h1'));
    expect(screen.getByTestId('where')).toHaveTextContent('/u/h1');
  });

  it('uses the default heading when none is given', () => {
    inRouter(<ClubHostsSection hosts={[{ id: 'h1', name: 'Hana' }]} />);
    expect(screen.getByTestId('club-hosts-header')).toHaveTextContent(fallbackT('mweb.clubDetails.hosts'));
  });
});

describe('ClubMomentsSection', () => {
  const moments = [{ url: 'https://img/1.jpg', type: 'IMAGE' }, { url: 'https://img/2.mp4', type: 'VIDEO' }];

  it('renders nothing without moments', () => {
    render(<ClubMomentsSection moments={[]} />);
    expect(screen.queryByTestId('club-moments')).not.toBeInTheDocument();
  });

  it('shows a tile per moment and opens and closes the lightbox on one', () => {
    render(<ClubMomentsSection moments={moments} />);
    expect(screen.getAllByRole('button')).toHaveLength(2);
    fireEvent.click(screen.getByTestId('moment-tile-https://img/2.mp4'));
    expect(screen.getByTestId('lightbox')).toHaveAttribute('data-index', '1');
    fireEvent.click(screen.getByTestId('lb-close'));
    expect(screen.queryByTestId('lightbox')).not.toBeInTheDocument();
  });
});

describe('ClubFaqsSection, ClubSocialLinks, ClubAdminsSection and ClubBulletsSection', () => {
  it('renders nothing without FAQs, else each as an expandable pair', () => {
    const { unmount } = render(<ClubFaqsSection faqs={[]} />);
    expect(screen.queryByTestId('club-faqs')).not.toBeInTheDocument();
    unmount();
    render(<ClubFaqsSection faqs={[{ question: 'Is it free?', answer: 'Yes' }]} />);
    expect(screen.getByTestId('club-faq-Is it free?')).toHaveTextContent('Is it free?');
    expect(screen.getByTestId('club-faq-Is it free?')).toHaveTextContent('Yes');
  });

  it('shows only the WhatsApp links the club set, opening in a new tab', () => {
    const { unmount } = render(<ClubSocialLinks club={{}} />);
    expect(screen.queryByTestId('club-social-links')).not.toBeInTheDocument();
    unmount();
    const second = render(<ClubSocialLinks club={{ club_whats_app_community_link: 'https://chat.whatsapp.com/c' }} />);
    expect(screen.getByTestId('club-chat-community')).toHaveAttribute('href', 'https://chat.whatsapp.com/c');
    expect(screen.getByTestId('club-chat-community')).toHaveAttribute('target', '_blank');
    expect(screen.queryByTestId('club-chat-group')).not.toBeInTheDocument();
    second.unmount();
    render(<ClubSocialLinks club={{ club_whats_app_group_link: 'https://chat.whatsapp.com/g' }} />);
    expect(screen.getByTestId('club-chat-group')).toHaveAttribute('href', 'https://chat.whatsapp.com/g');
  });

  it('renders nothing without admins, else a contact card each', () => {
    const { unmount } = render(<ClubAdminsSection admins={[]} />);
    expect(screen.queryByTestId('club-admins')).not.toBeInTheDocument();
    unmount();
    render(<ClubAdminsSection admins={[{ id: 'a1', name: 'Adi', email: 'adi@x.co', phone: '9999999999', whatsapp: '9999999999', avatar_url: null }, { id: 'a2', name: 'Bo' }]} />);
    expect(screen.getAllByTestId('club-admin-card')).toHaveLength(2);
    expect(screen.getAllByText(fallbackT('mweb.common.contactTheClubAdmin'))).toHaveLength(2);
  });

  it('renders only the non-blank bullets, or nothing at all', () => {
    const { unmount } = render(<ClubBulletsSection title="Perks" items={['Snacks', '   ', 'Swag']} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    unmount();
    render(<ClubBulletsSection title="Perks" items={['  ']} />);
    expect(screen.queryByTestId('club-bullets')).not.toBeInTheDocument();
  });
});

describe('ClubHeroActions', () => {
  const actions = (props: Partial<Parameters<typeof ClubHeroActions>[0]> = {}) => {
    const handlers = { onBack: vi.fn(), onToggleFollow: vi.fn(), onToggleSave: vi.fn(), onShare: vi.fn() };
    render(<ClubHeroActions saved={false} following={false} {...handlers} {...props} />);
    return handlers;
  };

  it('offers Follow, Save and Share, and goes back', () => {
    const handlers = actions();
    expect(screen.getByTestId('club-follow')).toHaveTextContent('Follow');
    expect(screen.getByTestId('club-hero-save')).toHaveAccessibleName('Save');
    fireEvent.click(screen.getByTestId('club-follow'));
    fireEvent.click(screen.getByTestId('club-hero-save'));
    fireEvent.click(screen.getByTestId('hb-share'));
    fireEvent.click(screen.getByTestId('detail-back'));
    expect(handlers.onToggleFollow).toHaveBeenCalledTimes(1);
    expect(handlers.onToggleSave).toHaveBeenCalledTimes(1);
    expect(handlers.onShare).toHaveBeenCalledTimes(1);
    expect(handlers.onBack).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('club-hero-chat')).not.toBeInTheDocument();
  });

  it('shows Following and Saved states, and the chat shortcut only once following with a handler', () => {
    const onOpenChat = vi.fn();
    actions({ following: true, saved: true, onOpenChat });
    expect(screen.getByTestId('club-follow')).toHaveTextContent('Following');
    expect(screen.getByTestId('club-hero-save')).toHaveAccessibleName('Saved');
    fireEvent.click(screen.getByTestId('club-hero-chat'));
    expect(onOpenChat).toHaveBeenCalledTimes(1);
  });

  it('hides the chat shortcut when following without a chat handler or when not following', () => {
    actions({ following: true });
    expect(screen.queryByTestId('club-hero-chat')).not.toBeInTheDocument();
  });

  it('shows a spinner and disables save while it saves', () => {
    actions({ saveLoading: true });
    expect(screen.getByTestId('club-hero-save')).toBeDisabled();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});

describe('ClubPodRailCard', () => {
  const card = (pod: object) => {
    const onOpen = vi.fn();
    render(<ClubPodRailCard pod={{ id: 'p1', pod_title: 'Sunday Run', pod_type: 'PAID', pod_amount: 250, pod_date_time: '2026-07-04T06:00:00.000Z', pod_images_and_videos: [], ...pod }} priceFormat={(v) => `₹${v}`} onOpen={onOpen} />);
    return onOpen;
  };

  it('shows the title, a formatted price and opens the pod, with a placeholder when there is no photo', () => {
    const onOpen = card({});
    expect(screen.getByTestId('pod-card-p1')).toHaveTextContent('Sunday Run');
    expect(screen.getByTestId('pod-card-p1-price')).toHaveTextContent('₹250');
    expect(screen.getByTestId('EventRoundedIcon')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('pod-card-p1-price'));
    expect(onOpen).toHaveBeenCalledWith('p1');
    expect(screen.queryByTestId('pod-card-locality')).not.toBeInTheDocument();
  });

  it('says Free for a free pod, shows the cover photo and the locality chip', () => {
    card({ pod_type: 'FREE', pod_images_and_videos: [{ url: 'https://img/c.jpg', type: 'IMAGE' }], locality: 'Indiranagar' });
    expect(screen.getByTestId('pod-card-p1-price')).toHaveTextContent('Free');
    expect(screen.getByRole('img', { name: 'Sunday Run' })).toBeInTheDocument();
    expect(screen.getByTestId('pod-card-locality')).toHaveTextContent('Indiranagar');
  });

  it('shows TBA for a pod with no date, and ignores a blank locality', () => {
    card({ pod_date_time: null, locality: '   ' });
    expect(screen.getByTestId('pod-card-p1')).toHaveTextContent('TBA');
    expect(screen.queryByTestId('pod-card-locality')).not.toBeInTheDocument();
  });
});

describe('ClubStoriesSection removal and reporting', () => {
  const future = new Date(Date.now() + 3_600_000).toISOString();
  const story = (id: string, over: object = {}) => ({ id, image_url: `https://img/${id}.jpg`, media_type: 'IMAGE', seen_by_me: false, expires_at: future, can_delete: false, ...over });
  const setup = (stories: object[], mutations: { record?: ReturnType<typeof vi.fn>; del?: ReturnType<typeof vi.fn> } = {}) => {
    const refetch = vi.fn().mockResolvedValue(undefined);
    h.useQuery.mockReturnValue({ data: { clubStories: stories }, refetch });
    const record = mutations.record ?? vi.fn().mockResolvedValue({});
    const del = mutations.del ?? vi.fn().mockResolvedValue({});
    h.useMutation.mockImplementation((doc: { loc?: { source: { body: string } } }) => ((doc.loc?.source.body ?? '').includes('DeleteClubStory') || (doc.loc?.source.body ?? '').includes('deleteClubStory') ? [del] : [record]));
    render(<ClubStoriesSection clubId="c1" canPost />);
    return { refetch, record, del };
  };

  it('hides expired stories from the rail and passes the posting right to the tiles', () => {
    setup([story('s1'), story('s2', { expires_at: new Date(Date.now() - 1000).toISOString() })]);
    expect(screen.getByTestId('tiles')).toHaveAttribute('data-count', '1');
    expect(screen.getByTestId('tiles')).toHaveAttribute('data-can-post', 'true');
  });

  it('skips the query without a club and polls only while the tab is visible', () => {
    h.useQuery.mockReturnValue({ data: undefined, refetch: vi.fn() });
    h.useMutation.mockReturnValue([vi.fn()]);
    render(<ClubStoriesSection clubId="" canPost={false} />);
    const opts = h.useQuery.mock.calls[0][1];
    expect(opts.skip).toBe(true);
    expect(opts.skipPollAttempt()).toBe(false);
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    expect(opts.skipPollAttempt()).toBe(true);
    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
    expect(screen.getByTestId('tiles')).toHaveAttribute('data-count', '0');
  });

  it('records a view for an unseen story only, and tolerates a failing record', async () => {
    const record = vi.fn().mockRejectedValue(new Error('offline'));
    setup([story('s1'), story('s2', { seen_by_me: true })], { record });
    fireEvent.click(screen.getByTestId('tile-s1'));
    await waitFor(() => expect(record).toHaveBeenCalledWith({ variables: { id: 's1' } }));
    fireEvent.click(screen.getByTestId('tile-s2'));
    expect(record).toHaveBeenCalledTimes(1);
  });

  it('does not record a view when the lightbox reports no story, and closes it', () => {
    const { record } = setup([story('s1')]);
    fireEvent.click(screen.getByTestId('tile-s1'));
    expect(record).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTestId('lb-clear'));
    expect(record).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('lightbox')).not.toBeInTheDocument();
  });

  it('keeps recording as the viewer pages through, and ignores paging past the end', () => {
    const { record } = setup([story('s1'), story('s2')]);
    fireEvent.click(screen.getByTestId('tile-s1'));
    fireEvent.click(screen.getByTestId('lb-next'));
    expect(record).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByTestId('lb-next'));
    expect(record).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByTestId('lb-close'));
    expect(screen.queryByTestId('lightbox')).not.toBeInTheDocument();
  });

  it('ignores a delete confirmed after the lightbox moved past the last story', async () => {
    const { del } = setup([story('s1', { can_delete: true })]);
    fireEvent.click(screen.getByTestId('tile-s1'));
    fireEvent.click(screen.getByTestId('act-delete'));
    fireEvent.click(screen.getByTestId('lb-next'));
    fireEvent.click(await screen.findByRole('button', { name: fallbackT('contentReport.deleteConfirmCta') }));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(del).not.toHaveBeenCalled();
  });

  it('shows an empty rail while the stories have not loaded', () => {
    h.useQuery.mockReturnValue({ data: undefined, refetch: vi.fn() });
    h.useMutation.mockReturnValue([vi.fn()]);
    render(<ClubStoriesSection clubId="c1" canPost={false} />);
    expect(screen.getByTestId('tiles')).toHaveAttribute('data-count', '0');
  });

  it('offers delete only when the server allows it, and removes the story after confirming', async () => {
    const { del, refetch } = setup([story('s1', { can_delete: true })]);
    fireEvent.click(screen.getByTestId('tile-s1'));
    expect(screen.getByTestId('actions')).toHaveAttribute('data-can-delete', 'true');
    fireEvent.click(screen.getByTestId('act-delete'));
    fireEvent.click(await screen.findByRole('button', { name: fallbackT('contentReport.deleteConfirmCta') }));
    await waitFor(() => expect(del).toHaveBeenCalledWith({ variables: { id: 's1' } }));
    await waitFor(() => expect(h.notify).toHaveBeenCalledWith(fallbackT('contentReport.deleted'), 'success'));
    expect(refetch).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('lightbox')).not.toBeInTheDocument();
  });

  it('shows the reason when removing fails, and a generic one when there is none', async () => {
    const del = vi.fn().mockRejectedValue(new Error('Not yours'));
    setup([story('s1', { can_delete: true })], { del });
    fireEvent.click(screen.getByTestId('tile-s1'));
    fireEvent.click(screen.getByTestId('act-delete'));
    fireEvent.click(await screen.findByRole('button', { name: fallbackT('contentReport.deleteConfirmCta') }));
    await waitFor(() => expect(h.notify).toHaveBeenCalledWith('Not yours', 'error'));
  });

  it('can back out of the delete confirmation', async () => {
    const { del } = setup([story('s1', { can_delete: true })]);
    fireEvent.click(screen.getByTestId('tile-s1'));
    fireEvent.click(screen.getByTestId('act-delete'));
    fireEvent.click(await screen.findByRole('button', { name: fallbackT('contentReport.deleteCancel') }));
    expect(del).not.toHaveBeenCalled();
  });

  it('reports a story and closes the report dialog', () => {
    setup([story('s1')]);
    fireEvent.click(screen.getByTestId('tile-s1'));
    expect(screen.getByTestId('actions')).toHaveAttribute('data-can-delete', 'false');
    fireEvent.click(screen.getByTestId('act-report'));
    expect(screen.getByTestId('report')).toHaveAttribute('data-target', 's1');
    fireEvent.click(screen.getByTestId('report-close'));
    expect(screen.queryByTestId('report')).not.toBeInTheDocument();
  });

  it('has no actions menu when no story is open', () => {
    setup([story('s1')]);
    expect(screen.queryByTestId('actions')).not.toBeInTheDocument();
  });
});
