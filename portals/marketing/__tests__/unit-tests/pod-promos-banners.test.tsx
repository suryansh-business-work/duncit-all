import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { renderWithProviders } from '../testkit';
import {
  generatePodBannersMock,
  makeBannerSet,
  makeBannerSlide,
  makePodPromoCandidate,
  podPromoCandidatesMock,
  podPromoOptionsMock,
  podPromoSettingsMock,
  regeneratePodBannerSlideMock,
  schedulePodPromoMock,
  podPromoSummaryMock,
} from '../mocks';

const dialogsMock = vi.hoisted(() => ({ notify: vi.fn() }));
vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notify: dialogsMock.notify,
}));
vi.mock('@duncit/app-settings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/app-settings')>()),
  useDateFormat: () => ({ formatDateTime: (d: Date) => `fmt:${d.toISOString()}` }),
}));

import MakeBannersDialog, { type BannerPod } from '../../src/pages/pod-promos-page/banners/MakeBannersDialog';
import SlideStrip from '../../src/pages/pod-promos-page/banners/SlideStrip';
import { replaceSlide } from '../../src/pages/pod-promos-page/banners/SlideGrid';
import { themeVariable } from '../../src/pages/pod-promos-page/banners/BannerThemeSelect';
import { GENERATE_POD_BANNERS } from '../../src/pages/pod-promos-page/banner.queries';

afterEach(() => {
  vi.clearAllMocks();
});

const POD: BannerPod = { id: 'pod1', title: 'Sunset Run' };

interface RenderOptions {
  pod?: BannerPod | null;
  collaborators?: string[] | null;
  canManage?: boolean;
}

const renderDialog = (mocks: MockedResponse[], { pod = POD, collaborators = null, canManage = true }: RenderOptions = {}) => {
  const onClose = vi.fn();
  const onScheduled = vi.fn();
  renderWithProviders(
    <MakeBannersDialog open pod={pod} collaborators={collaborators} canManage={canManage} onClose={onClose} onScheduled={onScheduled} />,
    { mocks },
  );
  return { onClose, onScheduled };
};

const pickOption = async (select: RegExp, option: string) => {
  fireEvent.mouseDown(screen.getByRole('combobox', { name: select }));
  fireEvent.click(await screen.findByRole('option', { name: option }));
};

const scheduleMocks = () => [podPromoOptionsMock(), podPromoSettingsMock()];

describe('MakeBannersDialog', () => {
  it('makes the carousel for a fixed pod and shows every slide with a download and a re-render', async () => {
    renderDialog([generatePodBannersMock('pod1'), ...scheduleMocks()], { canManage: false });
    expect(screen.getByRole('dialog', { name: 'Banners for Sunset Run' })).toBeInTheDocument();
    expect(screen.queryByTestId('pod-picker')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('banner-generate'));
    const grid = await screen.findByTestId('banner-slide-grid');
    expect(within(grid).getAllByRole('img')).toHaveLength(5);
    expect(within(grid).getByRole('heading', { name: 'Meet your host' })).toBeInTheDocument();
    const download = within(grid).getByRole('link', { name: 'Download slide: Cover' });
    expect(download).toHaveAttribute('href', expect.stringContaining('cover.jpg'));
    expect(download).toHaveAttribute('download');
    expect(screen.getByText(/Sport night · Words written by AI/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Run run42 in Activity' })).toHaveAttribute('href', '/activity?workflow=POD_PROMO');
    expect(screen.getByTestId('banner-generate')).toHaveTextContent('Make them again');
    // An editor makes banners but never schedules.
    expect(screen.queryByTestId('banner-schedule-section')).not.toBeInTheDocument();
  });

  it('sends the chosen look and size, and says when the template wrote the words', async () => {
    const set = makeBannerSet({ style: 'FESTIVE_BOLD', size: 'SQUARE', ai_copy: false, slides: [makeBannerSlide('COVER')] });
    renderDialog([generatePodBannersMock('pod1', { style: 'FESTIVE_BOLD', size: 'SQUARE', set })], { canManage: false });
    await pickOption(/Banner look/, 'Festive bold');
    await pickOption(/Banner size/, 'Square (1080 × 1080)');
    fireEvent.click(screen.getByTestId('banner-generate'));
    expect(await screen.findByText(/Festive bold · Words from the built-in template/)).toBeInTheDocument();
    expect(screen.getAllByRole('img')).toHaveLength(1);
  });

  it('goes back to automatic when the look is set to automatic again', async () => {
    renderDialog([generatePodBannersMock('pod1')], { canManage: false });
    await pickOption(/Banner look/, 'Elegant serif');
    await pickOption(/Banner look/, 'Automatic, from the pod category');
    expect(screen.getByRole('combobox', { name: /Banner look/ })).toHaveTextContent('Automatic, from the pod category');
    fireEvent.click(screen.getByTestId('banner-generate'));
    expect(await screen.findByTestId('banner-slide-grid')).toBeInTheDocument();
  });

  it('sends no size once it is set back to the settings default', async () => {
    renderDialog([generatePodBannersMock('pod1')], { canManage: false });
    await pickOption(/Banner size/, 'Square (1080 × 1080)');
    await pickOption(/Banner size/, 'As in the settings');
    expect(screen.getByRole('combobox', { name: /Banner size/ })).toHaveTextContent('As in the settings');
    // The mock answers only for size: null, so the grid shows only if no size was sent.
    fireEvent.click(screen.getByTestId('banner-generate'));
    expect(await screen.findByTestId('banner-slide-grid')).toBeInTheDocument();
  });

  it('draws no slides and offers no schedule when the server answers with nothing', async () => {
    const empty: MockedResponse = {
      request: { query: GENERATE_POD_BANNERS, variables: { pod_id: 'pod1', style: null, size: null } },
      result: { data: null },
    };
    renderDialog([empty, ...scheduleMocks()]);
    const generate = screen.getByTestId('banner-generate');
    fireEvent.click(generate);
    // The answer is awaited first, so what follows is the state after it, not before.
    expect(screen.getByRole('progressbar', { name: 'Making the banner' })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('progressbar', { name: 'Making the banner' })).not.toBeInTheDocument());
    expect(generate).toBeEnabled();
    expect(generate).toHaveTextContent('Make banners');
    expect(screen.queryByTestId('banner-slide-grid')).not.toBeInTheDocument();
    expect(screen.queryByTestId('banner-schedule-section')).not.toBeInTheDocument();
  });

  it('re-renders one slide and swaps only that tile', async () => {
    const fresh = 'https://ik.imagekit.io/duncit/marketing/pod_promos/venue-v2.jpg';
    renderDialog([generatePodBannersMock('pod1'), regeneratePodBannerSlideMock('pod1', 'VENUE', { url: fresh })], { canManage: false });
    fireEvent.click(screen.getByTestId('banner-generate'));
    fireEvent.click(await screen.findByTestId('banner-slide-regenerate-VENUE'));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Made again: The venue', 'success'));
    expect(screen.getByRole('img', { name: 'The venue — banner slide for Sunset Run' })).toHaveAttribute('src', fresh);
    expect(screen.getByRole('img', { name: 'Cover — banner slide for Sunset Run' })).toHaveAttribute('src', expect.stringContaining('cover.jpg'));
  });

  it('says why one slide could not be made again, keeping the old one', async () => {
    renderDialog([generatePodBannersMock('pod1'), regeneratePodBannerSlideMock('pod1', 'BOOK', { error: 'No tracking link yet' })], { canManage: false });
    fireEvent.click(screen.getByTestId('banner-generate'));
    fireEvent.click(await screen.findByTestId('banner-slide-regenerate-BOOK'));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('No tracking link yet', 'error'));
    expect(screen.getByRole('img', { name: 'Book now — banner slide for Sunset Run' })).toHaveAttribute('src', expect.stringContaining('book.jpg'));
  });

  it('shows why the carousel could not be made', async () => {
    renderDialog([generatePodBannersMock('pod1', { error: 'The pod has no photo or category' })], { canManage: false });
    fireEvent.click(screen.getByTestId('banner-generate'));
    expect(await screen.findByText('The pod has no photo or category')).toBeInTheDocument();
    expect(screen.queryByTestId('banner-slide-grid')).not.toBeInTheDocument();
  });

  it('asks for a pod first when opened from the header, then makes banners for the one picked', async () => {
    renderDialog([podPromoCandidatesMock([makePodPromoCandidate()]), generatePodBannersMock('pod1')], { pod: null, canManage: false });
    expect(screen.getByRole('dialog', { name: 'Make banners' })).toBeInTheDocument();
    expect(screen.getByText('Pick a pod to make its banners.')).toBeInTheDocument();
    expect(screen.getByTestId('banner-generate')).toBeDisabled();
    fireEvent.click(await screen.findByTestId('pod-candidate-pod1'));
    expect(screen.getByRole('heading', { name: 'Banners for Sunset Run' })).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('banner-generate'));
    expect(await screen.findByTestId('banner-slide-grid')).toBeInTheDocument();
  });

  it('lets a manager schedule with the settings defaults, leaving collaborators to the server', async () => {
    const { onScheduled } = renderDialog([
      generatePodBannersMock('pod1'),
      ...scheduleMocks(),
      schedulePodPromoMock({ pod_id: 'pod1', at: null, account_ids: null, collaborators: null, style: null }),
      podPromoSummaryMock(),
      podPromoCandidatesMock([]),
    ]);
    fireEvent.click(screen.getByTestId('banner-generate'));
    const section = await screen.findByTestId('banner-schedule-section');
    expect(await within(section).findByText('Leave empty to post at the time the settings give (Asia/Kolkata).')).toBeInTheDocument();
    expect(within(section).getByText(/Leave empty to invite the venue and the host/)).toBeInTheDocument();
    await waitFor(() => expect(within(section).getByTestId('form-actions-row-submit')).toBeEnabled());
    fireEvent.click(within(section).getByTestId('form-actions-row-submit'));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Sunset Run is being promoted', 'success'));
    expect(onScheduled).toHaveBeenCalled();
  });

  it('schedules with the promotion collaborators and the chosen look, and says why it was refused', async () => {
    const { onScheduled } = renderDialog(
      [
        generatePodBannersMock('pod1', { style: 'SPORT_NIGHT' }),
        ...scheduleMocks(),
        schedulePodPromoMock({ pod_id: 'pod1', at: null, account_ids: null, collaborators: ['blue.cafe'], style: 'SPORT_NIGHT' }, 'Already scheduled'),
      ],
      { collaborators: ['blue.cafe'] },
    );
    await pickOption(/Banner look/, 'Sport night');
    fireEvent.click(screen.getByTestId('banner-generate'));
    const section = await screen.findByTestId('banner-schedule-section');
    expect(within(section).getByText('blue.cafe')).toBeInTheDocument();
    await waitFor(() => expect(within(section).getByTestId('form-actions-row-submit')).toBeEnabled());
    fireEvent.click(within(section).getByTestId('form-actions-row-submit'));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Already scheduled', 'error'));
    expect(onScheduled).not.toHaveBeenCalled();
  });

  it('still schedules when the settings cannot be read, naming no time zone', async () => {
    const { onScheduled } = renderDialog([
      generatePodBannersMock('pod1'),
      podPromoOptionsMock(),
      podPromoSettingsMock(null, 'Settings are down'),
      schedulePodPromoMock({ pod_id: 'pod1', at: null, account_ids: null, collaborators: null, style: null }),
    ]);
    fireEvent.click(screen.getByTestId('banner-generate'));
    const section = await screen.findByTestId('banner-schedule-section');
    const submit = within(section).getByTestId('form-actions-row-submit');
    await waitFor(() => expect(submit).toBeEnabled());
    fireEvent.click(submit);
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Sunset Run is being promoted', 'success'));
    expect(onScheduled).toHaveBeenCalledTimes(1);
    // By now the settings read has long failed: the hint stands without a zone.
    expect(within(section).getByText(/Leave empty to post at the time the settings give/)).not.toHaveTextContent('Asia/Kolkata');
  });

  it('says why the accounts to post to could not be loaded', async () => {
    renderDialog([generatePodBannersMock('pod1'), podPromoOptionsMock('Accounts are down'), podPromoSettingsMock()]);
    fireEvent.click(screen.getByTestId('banner-generate'));
    const section = await screen.findByTestId('banner-schedule-section');
    expect(await within(section).findByRole('alert')).toHaveTextContent('Accounts are down');
  });

  it('closes from its close button', () => {
    const { onClose } = renderDialog([]);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalled();
  });
});

describe('SlideStrip', () => {
  it('lists the slides as linked thumbnails, or says there is no banner', () => {
    const { rerender } = renderWithProviders(<SlideStrip slides={[makeBannerSlide('COVER'), makeBannerSlide('DETAILS')]} podTitle="Sunset Run" />);
    const strip = screen.getByRole('list', { name: 'Banner slides' });
    expect(within(strip).getAllByRole('listitem')).toHaveLength(2);
    expect(within(strip).getByText('What is included')).toBeInTheDocument();
    rerender(<SlideStrip slides={[]} podTitle="Sunset Run" />);
    expect(screen.getByText('No banner yet.')).toBeInTheDocument();
  });
});

describe('banner helpers', () => {
  it('swaps one slide by kind and keeps the order', () => {
    const slides = [makeBannerSlide('COVER'), makeBannerSlide('HOST'), makeBannerSlide('BOOK')];
    const next = replaceSlide(slides, { kind: 'HOST', url: 'new.jpg' });
    expect(next.map((slide) => slide.kind)).toEqual(['COVER', 'HOST', 'BOOK']);
    expect(next[1].url).toBe('new.jpg');
    expect(next[0]).toBe(slides[0]);
  });

  it('sends null for an automatic look and the look itself otherwise', () => {
    expect(themeVariable('')).toBeNull();
    expect(themeVariable('PLAYFUL_PASTEL')).toBe('PLAYFUL_PASTEL');
  });
});
