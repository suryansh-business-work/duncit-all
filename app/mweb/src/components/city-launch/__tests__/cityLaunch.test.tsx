import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';

import CityLaunchActionTile from '../CityLaunchActionTile';
import CityLaunchAdded from '../CityLaunchAdded';
import CityLaunchCount from '../CityLaunchCount';
import CityLaunchHero from '../CityLaunchHero';
import CityLaunchLocationDialog from '../CityLaunchLocationDialog';
import CityLaunchNotify from '../CityLaunchNotify';
import CityLaunchRoleSection from '../CityLaunchRoleSection';
import CityLaunchView from '../CityLaunchView';
import LaunchBackdrop from '../LaunchBackdrop';
import LaunchSection from '../LaunchSection';
import { LaunchBadge, LaunchFooterLine, LaunchGlass, LaunchHeadline, LaunchTagline } from '../LaunchGlass';
import { useLaunchViewportHeight } from '../useLaunchViewportHeight';
import { LOCATION_LAUNCH_STATUS, WHATSAPP_REQUIRED } from '../queries';
import { fallbackT } from '../../../i18n/fallback';
import { LAUNCH_ROLE_SECTIONS, EMPTY_LAUNCH_MEDIA } from '@duncit/utils';
import { logs } from '@duncit/logs';

const h = vi.hoisted(() => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  copy: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
  logError: vi.fn(),
  meta: vi.fn(),
}));

vi.mock('@apollo/client/react', async (orig) => ({ ...(await orig<object>()), useQuery: h.useQuery, useMutation: h.useMutation }));
vi.mock('../../notify', () => ({ notifySuccess: h.success, notifyError: h.error }));
vi.mock('@duncit/utils', async (orig) => ({ ...(await orig<object>()), copyToClipboard: h.copy }));
vi.mock('../../../app/pageMeta', () => ({ useEntityPageMeta: h.meta }));
vi.mock('../../PageHeader', () => ({
  default: (p: { title: string; onBack: () => void }) => (
    <button data-testid="page-header" onClick={p.onBack}>
      {p.title}
    </button>
  ),
}));

const Where = () => {
  const location = useLocation();
  return <div data-testid="where">{location.pathname + location.search}</div>;
};
const inRouter = (ui: React.ReactNode, start = '/city-launch/agra') =>
  render(
    <MemoryRouter initialEntries={[start]}>
      <Routes>
        <Route path="/city-launch/:id" element={ui} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>
  );

const status = (over: object = {}) => ({
  subscriber_count: 1234,
  launch_target: 5000,
  is_subscribed: false,
  location: { id: 'loc1', location_id: 'agra', location_name: 'Agra', city: 'Agra', location_image: '', whatsapp_group_url: 'https://chat.whatsapp.com/xyz' },
  launch_media: { ...EMPTY_LAUNCH_MEDIA },
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  vi.spyOn(logs.mWeb, 'debug').mockImplementation(h.debug);
  vi.spyOn(logs.mWeb, 'warn').mockImplementation(h.warn);
  vi.spyOn(logs.mWeb, 'error').mockImplementation(h.logError);
});

afterEach(() => vi.restoreAllMocks());

describe('CityLaunchActionTile', () => {
  it('shows its label and presses through its test ids', () => {
    const onClick = vi.fn();
    render(<CityLaunchActionTile testId="tile" icon={<i data-testid="ic" />} label="Share" onClick={onClick} />);
    expect(screen.getByTestId('tile')).toHaveTextContent('Share');
    fireEvent.click(screen.getByTestId('tile-button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe('CityLaunchAdded', () => {
  const added = (url = 'https://chat.whatsapp.com/xyz') => render(<CityLaunchAdded citySlug="agra" city="Agra" whatsappGroupUrl={url} />);
  afterEach(() => Object.defineProperty(navigator, 'share', { value: undefined, configurable: true }));

  it('confirms the name was added, naming the city', () => {
    added();
    expect(screen.getByTestId('city-launch-added')).toHaveTextContent(fallbackT('mweb.cityLaunch.addedTitle'));
    expect(screen.getByTestId('city-launch-added')).toHaveTextContent(fallbackT('mweb.cityLaunch.addedBody', { vars: { city: 'Agra' } }));
  });

  it('shares the city page through the native sheet', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });
    added();
    fireEvent.click(screen.getByTestId('city-launch-share-button'));
    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    const url = `${globalThis.location.origin}/city-launch/agra`;
    expect(share).toHaveBeenCalledWith({ text: fallbackT('mweb.cityLaunch.shareText', { vars: { city: 'Agra', url } }) });
  });

  it('logs a closed share sheet quietly instead of telling the reader', async () => {
    Object.defineProperty(navigator, 'share', { value: vi.fn().mockRejectedValue(new Error('AbortError')), configurable: true });
    added();
    fireEvent.click(screen.getByTestId('city-launch-share-button'));
    await waitFor(() => expect(h.debug).toHaveBeenCalledWith('CityLaunchAdded', 'share', expect.any(Object)));
    expect(h.error).not.toHaveBeenCalled();
  });

  it('copies the link where there is no share sheet, and confirms', async () => {
    h.copy.mockResolvedValue(true);
    added();
    fireEvent.click(screen.getByTestId('city-launch-share-button'));
    await waitFor(() => expect(h.success).toHaveBeenCalledWith(fallbackT('mweb.cityLaunch.linkCopied')));
    expect(h.copy).toHaveBeenCalledWith(`${globalThis.location.origin}/city-launch/agra`);
  });

  it('logs when the clipboard is unavailable', async () => {
    h.copy.mockResolvedValue(false);
    added();
    fireEvent.click(screen.getByTestId('city-launch-share-button'));
    await waitFor(() => expect(h.warn).toHaveBeenCalledWith('CityLaunchAdded', 'copyLink', expect.any(Object)));
    expect(h.success).not.toHaveBeenCalled();
  });

  it('opens the WhatsApp group in a new tab when the admin set one, and hides the tile otherwise', () => {
    const open = vi.spyOn(globalThis, 'open').mockReturnValue(null);
    const { unmount } = added();
    fireEvent.click(screen.getByTestId('city-launch-join-whatsapp-button'));
    expect(open).toHaveBeenCalledWith('https://chat.whatsapp.com/xyz', '_blank', 'noopener,noreferrer');
    unmount();
    added('');
    expect(screen.queryByTestId('city-launch-join-whatsapp')).not.toBeInTheDocument();
    open.mockRestore();
  });
});

describe('CityLaunchCount', () => {
  it('shows the count, the city, the progress towards the goal and the goal line', () => {
    render(<CityLaunchCount city="Agra" count={1250} target={5000} />);
    expect(screen.getByTestId('city-launch-count')).toHaveTextContent('1,250');
    expect(screen.getByTestId('city-launch-count-city')).toHaveTextContent('Agra');
    expect(screen.getByTestId('city-launch-progress')).toHaveAttribute('aria-valuenow', '25');
    expect(screen.getByTestId('city-launch-goal')).toHaveTextContent(fallbackT('mweb.cityLaunch.launchGoal', { vars: { target: '5,000' } }));
    expect(screen.getByTestId('city-launch-progress')).toHaveAccessibleName(fallbackT('mweb.cityLaunch.launchGoal', { vars: { target: '5,000' } }));
  });

  it('caps progress at the goal', () => {
    render(<CityLaunchCount city="Agra" count={9000} target={5000} />);
    expect(screen.getByTestId('city-launch-progress')).toHaveAttribute('aria-valuenow', '100');
  });
});

describe('CityLaunchLocationDialog', () => {
  it('answers yes and no, and treats the close button, backdrop and Escape as no', () => {
    const onAnswer = vi.fn();
    render(<CityLaunchLocationDialog open onAnswer={onAnswer} />);
    expect(screen.getByTestId('city-launch-share-location-title')).toHaveTextContent(fallbackT('mweb.cityLaunch.shareLocation.title'));
    fireEvent.click(screen.getByTestId('city-launch-share-location-yes'));
    expect(onAnswer).toHaveBeenLastCalledWith(true);
    fireEvent.click(screen.getByTestId('city-launch-share-location-no'));
    expect(onAnswer).toHaveBeenLastCalledWith(false);
    fireEvent.click(screen.getByTestId('city-launch-share-location-close'));
    expect(onAnswer).toHaveBeenLastCalledWith(false);
    fireEvent.keyDown(screen.getByTestId('city-launch-share-location'), { key: 'Escape' });
    expect(onAnswer).toHaveBeenCalledTimes(4);
  });

  it('is not shown while closed', () => {
    render(<CityLaunchLocationDialog open={false} onAnswer={vi.fn()} />);
    expect(screen.queryByTestId('city-launch-share-location-yes')).not.toBeInTheDocument();
  });
});

describe('CityLaunchNotify', () => {
  const subscribe = vi.fn();
  let updateOption: ((cache: unknown, result: { data?: unknown }) => void) | undefined;
  const notify = (signedIn = true) => {
    if (signedIn) localStorage.setItem('token', 't');
    h.useMutation.mockImplementation((_doc: unknown, options: { update: typeof updateOption }) => {
      updateOption = options.update;
      return [subscribe];
    });
    return inRouter(<CityLaunchNotify locationId="loc1" city="Agra" />);
  };
  const graphQlError = (code: string) => Object.assign(new Error('x'), { errors: [{ message: 'x', extensions: { code } }], graphQLErrors: [{ message: 'x', extensions: { code } }] });

  beforeEach(() => subscribe.mockReset().mockResolvedValue({}));

  it('sends a signed-out visitor to sign in and back to this page', () => {
    notify(false);
    fireEvent.click(screen.getByTestId('city-launch-sign-in'));
    expect(screen.getByTestId('where')).toHaveTextContent(`/login?redirect=${encodeURIComponent('/city-launch/agra')}`);
  });

  it('asks about sharing location first, then adds the name with the answer', async () => {
    notify();
    fireEvent.click(screen.getByTestId('city-launch-notify'));
    fireEvent.click(await screen.findByTestId('city-launch-share-location-yes'));
    await waitFor(() => expect(subscribe).toHaveBeenCalledWith({ variables: { locationId: 'loc1', locationShared: true } }));
    fireEvent.click(screen.getByTestId('city-launch-notify'));
    fireEvent.click(await screen.findByTestId('city-launch-share-location-no'));
    await waitFor(() => expect(subscribe).toHaveBeenLastCalledWith({ variables: { locationId: 'loc1', locationShared: false } }));
  });

  it('writes the fresh status into the cache so the page flips to added', () => {
    notify();
    const writeQuery = vi.fn();
    updateOption?.({ writeQuery }, { data: { subscribeLocationLaunch: status() } });
    expect(writeQuery).toHaveBeenCalledWith({ query: LOCATION_LAUNCH_STATUS, variables: { locationId: 'loc1' }, data: { locationLaunchStatus: status() } });
    updateOption?.({ writeQuery }, { data: undefined });
    expect(writeQuery).toHaveBeenCalledTimes(1);
  });

  it('sends an account with no WhatsApp number to add one', async () => {
    const failure = graphQlError(WHATSAPP_REQUIRED);
    subscribe.mockImplementation(async () => {
      throw failure;
    });
    notify();
    fireEvent.click(screen.getByTestId('city-launch-notify'));
    fireEvent.click(await screen.findByTestId('city-launch-share-location-yes'));
    expect(await screen.findByTestId('city-launch-need-whatsapp')).toHaveTextContent(fallbackT('mweb.cityLaunch.needWhatsapp', { vars: { city: 'Agra' } }));
    fireEvent.click(screen.getByTestId('city-launch-go-to-profile'));
    expect(screen.getByTestId('where')).toHaveTextContent('/account');
  });

  it('logs and tells the reader when subscribing fails for another reason', async () => {
    const failure = graphQlError('SOMETHING_ELSE');
    subscribe.mockImplementation(async () => {
      throw failure;
    });
    notify();
    fireEvent.click(screen.getByTestId('city-launch-notify'));
    fireEvent.click(await screen.findByTestId('city-launch-share-location-no'));
    await waitFor(() => expect(h.error).toHaveBeenCalledWith(fallbackT('mweb.cityLaunch.subscribeFailed')));
    expect(h.logError).toHaveBeenCalledWith('CityLaunchNotify', 'subscribe', expect.objectContaining({ locationId: 'loc1' }));
    expect(screen.getByTestId('city-launch-notify')).toBeInTheDocument();
  });

  it('treats a plain network failure like any other failure', async () => {
    subscribe.mockImplementation(async () => {
      throw new Error('offline');
    });
    notify();
    fireEvent.click(screen.getByTestId('city-launch-notify'));
    fireEvent.click(await screen.findByTestId('city-launch-share-location-yes'));
    await waitFor(() => expect(h.error).toHaveBeenCalled());
  });
});

describe('LaunchBackdrop, LaunchSection and the glass pieces', () => {
  const mediaQuery = (matches: boolean) => {
    const original = globalThis.matchMedia;
    globalThis.matchMedia = ((query: string) => ({ matches, media: query, addEventListener: () => undefined, removeEventListener: () => undefined, addListener: () => undefined, removeListener: () => undefined })) as never;
    return () => {
      globalThis.matchMedia = original;
    };
  };

  it('draws the backup image under a muted looping video', () => {
    render(<LaunchBackdrop videoUrl="https://ik.io/v.mp4" imageUrl="https://ik.io/i.jpg" testId="bd" />);
    expect(screen.getByTestId('bd-image')).toHaveAttribute('src', expect.stringContaining('i.jpg'));
    const video = screen.getByTestId('bd-video') as HTMLVideoElement;
    expect(video).toHaveAttribute('src', expect.stringContaining('v.mp4'));
    expect(video.muted).toBe(true);
    expect(video.loop).toBe(true);
  });

  it('drops the video for the picture alone after it fails to load', () => {
    render(<LaunchBackdrop videoUrl="https://ik.io/v.mp4" imageUrl="https://ik.io/i.jpg" testId="bd" />);
    fireEvent.error(screen.getByTestId('bd-video'));
    expect(screen.queryByTestId('bd-video')).not.toBeInTheDocument();
    expect(screen.getByTestId('bd-image')).toBeInTheDocument();
  });

  it('shows the picture alone for a reader who asked for reduced motion', () => {
    const restore = mediaQuery(true);
    render(<LaunchBackdrop videoUrl="https://ik.io/v.mp4" imageUrl="https://ik.io/i.jpg" testId="bd" />);
    expect(screen.queryByTestId('bd-video')).not.toBeInTheDocument();
    restore();
  });

  it('draws only the dark ground when there is neither video nor image', () => {
    render(<LaunchBackdrop videoUrl="" imageUrl="" testId="bd" />);
    expect(screen.queryByTestId('bd-image')).not.toBeInTheDocument();
    expect(screen.queryByTestId('bd-video')).not.toBeInTheDocument();
    expect(screen.getByTestId('bd')).toHaveAttribute('aria-hidden', 'true');
  });

  it('frames a section with its backdrop and copy', () => {
    render(
      <LaunchSection testId="sec" media={{ videoUrl: '', imageUrl: 'https://ik.io/i.jpg' }} minHeight={640}>
        <p>copy</p>
      </LaunchSection>
    );
    expect(screen.getByTestId('sec')).toHaveTextContent('copy');
    expect(screen.getByTestId('sec-backdrop-image')).toBeInTheDocument();
    expect(screen.getByTestId('sec')).toHaveStyle({ minHeight: '640px' });
  });

  it('renders the glass panel, badge, headline, tagline and footer line', () => {
    render(
      <>
        <LaunchGlass testId="glass" sx={{ mt: 1 }}>glassy</LaunchGlass>
        <LaunchGlass testId="glass2" sx={[{ mt: 1 }, { mb: 1 }]}>arr</LaunchGlass>
        <LaunchGlass testId="glass3">plain</LaunchGlass>
        <LaunchBadge icon={<i />} label="Host" testId="badge" />
        <LaunchHeadline testId="head">Agra, are you in?</LaunchHeadline>
        <LaunchHeadline>No test id</LaunchHeadline>
        <LaunchTagline>Same city.</LaunchTagline>
        <LaunchFooterLine testId="foot">See you soon</LaunchFooterLine>
      </>
    );
    expect(screen.getByTestId('glass')).toHaveTextContent('glassy');
    expect(screen.getByTestId('badge')).toHaveTextContent('Host');
    expect(screen.getByTestId('head')).toHaveTextContent('Agra, are you in?');
    expect(screen.getByText('Same city.')).toBeInTheDocument();
    expect(screen.getByTestId('foot')).toHaveTextContent('See you soon');
  });
});

describe('useLaunchViewportHeight', () => {
  afterEach(() => {
    document.getElementById('main-scroll')?.remove();
    document.documentElement.style.removeProperty('--duncit-bottom-nav-overlay-offset');
  });

  it('is the viewport height when the document itself scrolls, following resizes', () => {
    Object.defineProperty(globalThis, 'innerHeight', { value: 700, configurable: true, writable: true });
    const { result, unmount } = renderHook(() => useLaunchViewportHeight());
    expect(result.current).toBe(700);
    act(() => {
      Object.defineProperty(globalThis, 'innerHeight', { value: 500, configurable: true, writable: true });
      globalThis.dispatchEvent(new Event('resize'));
    });
    expect(result.current).toBe(500);
    unmount();
  });

  it('is the shell scroller height minus what the floating nav covers, observing its size', () => {
    const scroller = document.createElement('div');
    scroller.id = 'main-scroll';
    scroller.style.overflowY = 'auto';
    Object.defineProperty(scroller, 'clientHeight', { value: 600, configurable: true });
    document.body.appendChild(scroller);
    document.documentElement.style.setProperty('--duncit-bottom-nav-overlay-offset', '72px');
    const { result, unmount } = renderHook(() => useLaunchViewportHeight());
    expect(result.current).toBe(528);
    unmount();
  });

  it('uses the whole scroller when the nav publishes no overlay', () => {
    const scroller = document.createElement('div');
    scroller.id = 'main-scroll';
    scroller.style.overflowY = 'auto';
    Object.defineProperty(scroller, 'clientHeight', { value: 600, configurable: true });
    document.body.appendChild(scroller);
    expect(renderHook(() => useLaunchViewportHeight()).result.current).toBe(600);
  });

  it('falls back to the viewport when the shell scroller does not scroll', () => {
    const scroller = document.createElement('div');
    scroller.id = 'main-scroll';
    document.body.appendChild(scroller);
    Object.defineProperty(globalThis, 'innerHeight', { value: 480, configurable: true, writable: true });
    expect(renderHook(() => useLaunchViewportHeight()).result.current).toBe(480);
  });
});

describe('CityLaunchRoleSection', () => {
  const role = (section: string) => LAUNCH_ROLE_SECTIONS.find((r) => r.section === section)!;
  const section = (r: ReturnType<typeof role>) =>
    inRouter(<CityLaunchRoleSection role={r} media={{ ...EMPTY_LAUNCH_MEDIA }} minHeight={600} />);

  it('renders every role with its badge, headline, stats and a call to action that opens its journey', () => {
    LAUNCH_ROLE_SECTIONS.forEach((r) => {
      const { unmount } = section(r);
      expect(screen.getByTestId(`${r.testId}-badge`)).toHaveTextContent(fallbackT(r.eyebrowKey));
      expect(screen.getByTestId(`${r.testId}-title`)).toHaveTextContent(fallbackT(r.titleKey));
      expect(screen.getByTestId(`${r.testId}-stats`)).toBeInTheDocument();
      if (r.chips.length > 0) expect(screen.getByTestId(`${r.testId}-chips`)).toBeInTheDocument();
      else expect(screen.queryByTestId(`${r.testId}-chips`)).not.toBeInTheDocument();
      if (r.footerKey) expect(screen.getByTestId(`${r.testId}-footer`)).toBeInTheDocument();
      expect(screen.getByTestId(`${r.testId}-cta`)).toHaveAccessibleName(
        fallbackT('mweb.a11y.actionFor', { vars: { action: fallbackT('mweb.cityLaunch.tellMeMore'), name: fallbackT(r.titleKey) } })
      );
      unmount();
    });
  });

  it('sends each role CTA to its Earn survey', () => {
    LAUNCH_ROLE_SECTIONS.forEach((r) => {
      const { unmount } = section(r);
      fireEvent.click(screen.getByTestId(`${r.testId}-cta`));
      expect(screen.getByTestId('where').textContent).toMatch(/^\/.+/);
      expect(screen.getByTestId('where').textContent).not.toBe('/city-launch/agra');
      unmount();
    });
  });

  it('renders an optional subtitle, card title and body only for roles that carry them', () => {
    const custom = { ...role('host'), subtitleKey: 'mweb.cityLaunch.hostTagline', cardTitleKey: 'mweb.cityLaunch.hostTitle', cardBodyKey: 'mweb.cityLaunch.hostEyebrow', chips: [], footerKey: undefined };
    section(custom as never);
    expect(screen.getByRole('heading', { level: 3, name: fallbackT('mweb.cityLaunch.hostTitle') })).toBeInTheDocument();
    expect(screen.queryByTestId(`${custom.testId}-chips`)).not.toBeInTheDocument();
    expect(screen.queryByTestId(`${custom.testId}-footer`)).not.toBeInTheDocument();
  });

  it('draws stats as a strip or as discs by the role layout', () => {
    section({ ...role('host'), statsLayout: 'strip' } as never);
    expect(screen.getByTestId('city-launch-card-host-stats')).toBeInTheDocument();
  });
});

describe('CityLaunchHero', () => {
  const hero = (s: object, header?: React.ReactNode) => {
    h.useMutation.mockReturnValue([vi.fn()]);
    return inRouter(<CityLaunchHero status={s as never} city="Agra" locationId="loc1" minHeight={600} header={header} />);
  };

  it('asks a signed-out visitor to sign in, with the headline, features, count and trust lines', () => {
    hero(status());
    expect(screen.getByTestId('city-launch-headline')).toHaveTextContent(fallbackT('mweb.cityLaunch.headline', { vars: { city: 'Agra' } }));
    expect(screen.getByTestId('city-launch-features')).toBeInTheDocument();
    expect(screen.getByTestId('city-launch-count')).toHaveTextContent('1,234');
    expect(screen.getByTestId('city-launch-trust')).toBeInTheDocument();
    expect(screen.getByTestId('city-launch-footer')).toHaveTextContent(fallbackT('mweb.cityLaunch.footer', { vars: { city: 'Agra' } }));
    expect(screen.getByTestId('city-launch-sign-in')).toBeInTheDocument();
    expect(screen.queryByTestId('city-launch-added')).not.toBeInTheDocument();
  });

  it('shows the added panel once subscribed, and the back header when given one', () => {
    hero(status({ is_subscribed: true }), <span data-testid="hdr" />);
    expect(screen.getByTestId('city-launch-added')).toBeInTheDocument();
    expect(screen.getByTestId('hdr')).toBeInTheDocument();
    expect(screen.queryByTestId('city-launch-sign-in')).not.toBeInTheDocument();
  });
});

describe('CityLaunchView', () => {
  const view = (result: object, onBack?: () => void) => {
    h.useQuery.mockReturnValue(result);
    h.useMutation.mockReturnValue([vi.fn()]);
    return inRouter(<CityLaunchView locationId="agra" onBack={onBack} />);
  };

  it('shows the hero and the three role screens once the status is in, edge to edge', () => {
    view({ data: { locationLaunchStatus: status() }, loading: false, error: undefined });
    expect(screen.getByTestId('city-launch-hero')).toBeInTheDocument();
    LAUNCH_ROLE_SECTIONS.forEach((r) => expect(screen.getByTestId(r.testId)).toBeInTheDocument());
    expect(screen.queryByTestId('page-header')).not.toBeInTheDocument();
    expect(h.meta).toHaveBeenCalledWith(null);
  });

  it('draws the back header with the city name over the hero and names the tab, when given a back handler', () => {
    const onBack = vi.fn();
    view({ data: { locationLaunchStatus: status() }, loading: false, error: undefined }, onBack);
    fireEvent.click(screen.getByTestId('page-header'));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('page-header')).toHaveTextContent('Agra');
    expect(h.meta).toHaveBeenCalledWith(fallbackT('mweb.meta.cityLaunch.title', { vars: { name: 'Agra' } }));
  });

  it('shows a spinner while loading with nothing cached', () => {
    view({ data: undefined, loading: true, error: undefined });
    expect(screen.getByRole('progressbar', { name: fallbackT('mweb.a11y.loading') })).toBeInTheDocument();
  });

  it('shows the error, and says the city was not found otherwise, each under the header when there is one', () => {
    const onBack = vi.fn();
    const { unmount } = view({ data: undefined, loading: false, error: new Error('Down') }, onBack);
    expect(screen.getByTestId('city-launch-error')).toBeInTheDocument();
    expect(screen.getByTestId('page-header')).toBeInTheDocument();
    unmount();
    view({ data: { locationLaunchStatus: null }, loading: false, error: undefined });
    expect(screen.getByTestId('city-launch-not-found')).toHaveTextContent(fallbackT('mweb.cityLaunch.notFound'));
    expect(h.meta).toHaveBeenLastCalledWith(null);
  });

  it('skips the query without a location id', () => {
    h.useQuery.mockReturnValue({ data: undefined, loading: false, error: undefined });
    inRouter(<CityLaunchView locationId="" />);
    expect(h.useQuery.mock.calls[0][1]).toMatchObject({ skip: true });
  });
});
