import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { formatINR } from '@duncit/utils';
import { renderWithProviders } from '../testkit';
import {
  cancelPodPromoMock,
  generatePodBannersMock,
  makePodPromo,
  makePodPromoFigures,
  podPromoMock,
  podPromoOptionsMock,
  podPromoSettingsMock,
  regeneratePodPromoBannerMock,
  schedulePodPromoMock,
} from '../mocks';

const dialogsMock = vi.hoisted(() => ({ notify: vi.fn(), confirm: vi.fn() }));
vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notify: dialogsMock.notify,
  useConfirm: () => dialogsMock.confirm,
}));
const clipboard = vi.hoisted(() => ({ copyToClipboard: vi.fn() }));
vi.mock('@duncit/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/utils')>()),
  copyToClipboard: clipboard.copyToClipboard,
}));
vi.mock('@duncit/app-settings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/app-settings')>()),
  useDateFormat: () => ({ formatDateTime: (d: Date) => `fmt:${d.toISOString()}` }),
}));

import PromoDrawer from '../../src/pages/pod-promos-page/promos/PromoDrawer';
import PromoFigures from '../../src/pages/pod-promos-page/promos/PromoFigures';

afterEach(() => {
  vi.clearAllMocks();
});

const renderDrawer = (mocks: MockedResponse[], { id = 'pp1', canManage = true }: { id?: string | null; canManage?: boolean } = {}) => {
  const onChanged = vi.fn();
  const onClose = vi.fn();
  renderWithProviders(<PromoDrawer id={id} canManage={canManage} onClose={onClose} onChanged={onChanged} />, { mocks });
  return { onChanged, onClose };
};

describe('PromoDrawer', () => {
  it('shows every slide, the look, collaborators, caption, hashtags, link, times and the pod and calendar links', async () => {
    renderDrawer([podPromoMock()]);
    expect(await screen.findByRole('heading', { name: 'Sunset Run' })).toBeInTheDocument();
    const strip = screen.getByTestId('banner-slide-strip');
    expect(within(strip).getAllByRole('img')).toHaveLength(5);
    expect(within(strip).getByRole('img', { name: 'Cover — banner slide for Sunset Run' })).toHaveAttribute('src', expect.stringContaining('cover.jpg'));
    expect(within(strip).getByRole('img', { name: 'Book now — banner slide for Sunset Run' })).toHaveAttribute('src', expect.stringContaining('book.jpg'));
    // Each thumbnail opens the full picture in a new tab.
    expect(within(strip).getByRole('link', { name: 'Meet your host — banner slide for Sunset Run' })).toHaveAttribute('target', '_blank');
    expect(screen.getByTestId('promo-theme')).toHaveTextContent('Sport night · With @blue.cafe, @asha_runs');
    expect(screen.getByText('Caption written by AI')).toBeInTheDocument();
    expect(screen.getByTestId('promo-caption')).toHaveTextContent('Run into the sunset with us.');
    // A tag is shown with one hash, whether or not the server sent it with one.
    expect(screen.getByText('#DuncitPune')).toBeInTheDocument();
    expect(screen.getByText('#running')).toBeInTheDocument();
    expect(screen.getByTestId('promo-tracking-url')).toHaveTextContent('https://duncit.com/aB3xY9Zq');
    expect(screen.getByText(/Pod starts fmt:2026-11-05T12:30:00.000Z/)).toBeInTheDocument();
    expect(screen.getByText(/posts fmt:2026-11-02T12:30:00.000Z/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'See it on the calendar' })).toHaveAttribute('href', '/publish/calendar');
    const pod = screen.getByRole('link', { name: /Open the pod page/ });
    expect(pod).toHaveAttribute('href', 'https://mweb.duncit.com/club/pune-runners/pod/sunset-run');
    expect(pod).toHaveAttribute('target', '_blank');
    expect(pod).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.queryByRole('link', { name: /Open the post/ })).not.toBeInTheDocument();
    expect(screen.getByText('Scheduled')).toBeInTheDocument();
  });

  it('shows the figures funnel with revenue, visitors and reactions', async () => {
    renderDrawer([podPromoMock()]);
    const figures = await screen.findByTestId('promo-figures');
    expect(within(screen.getByTestId('promo-step-clicks')).getByText('120')).toBeInTheDocument();
    expect(within(screen.getByTestId('promo-step-bookings')).getByText('12')).toBeInTheDocument();
    expect(within(figures).getByText(formatINR(4491))).toBeInTheDocument();
    expect(within(figures).getByText('90')).toBeInTheDocument();
    expect(within(screen.getByTestId('promo-step-payments')).getByRole('progressbar', { name: 'Paid' })).toHaveAttribute('aria-valuenow', '8');
  });

  it('shows a published post with its error, without a banner, caption or manager actions', async () => {
    const promo = makePodPromo({
      status: 'PUBLISHED',
      banner_url: '',
      slides: [],
      collaborators: [],
      style: 'ELEGANT_SERIF',
      caption: '',
      hashtags: [],
      ai_caption: false,
      tracking_url: '',
      scheduled_post_id: null,
      scheduled_at: null,
      permalink: 'https://instagram.com/p/abc',
      error: 'Facebook refused the post',
      pod_url: '',
    });
    renderDrawer([podPromoMock(promo)]);
    expect(await screen.findByText('Facebook refused the post')).toBeInTheDocument();
    expect(screen.getByText('No banner yet.')).toBeInTheDocument();
    // No collaborators: the look stands alone.
    expect(screen.getByTestId('promo-theme')).toHaveTextContent(/^Elegant serif$/);
    expect(screen.getByText('No caption yet.')).toBeInTheDocument();
    expect(screen.getByText('Caption from the built-in template')).toBeInTheDocument();
    expect(screen.getByText(/posts not scheduled/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open the post/ })).toHaveAttribute('href', 'https://instagram.com/p/abc');
    expect(screen.queryByRole('link', { name: 'See it on the calendar' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('promo-tracking-url')).not.toBeInTheDocument();
    expect(screen.queryByTestId('promo-actions')).not.toBeInTheDocument();
  });

  it('keeps the actions from an editor', async () => {
    renderDrawer([podPromoMock()], { canManage: false });
    expect(await screen.findByTestId('promo-details')).toBeInTheDocument();
    expect(screen.queryByTestId('promo-actions')).not.toBeInTheDocument();
  });

  it('says why the promotion could not be read', async () => {
    renderDrawer([podPromoMock(makePodPromo(), 'Promotion not found')]);
    expect(await screen.findByText('Promotion not found')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Promotion' })).toBeInTheDocument();
  });

  it('stays closed with no promotion picked', () => {
    renderDrawer([], { id: null });
    expect(screen.queryByTestId('promo-drawer')).not.toBeInTheDocument();
  });

  it('closes from its close button', async () => {
    const { onClose } = renderDrawer([podPromoMock()]);
    fireEvent.click(await screen.findByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('makes a new banner and re-reads the promotion', async () => {
    const { onChanged } = renderDrawer([podPromoMock(), regeneratePodPromoBannerMock('pp1'), podPromoMock()]);
    fireEvent.click(await screen.findByRole('button', { name: 'Make a new banner' }));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('A new banner is on the post', 'success'));
    expect(onChanged).toHaveBeenCalled();
  });

  it('makes the new banner in the look the manager picked', async () => {
    const { onChanged } = renderDrawer([podPromoMock(), regeneratePodPromoBannerMock('pp1', undefined, 'FESTIVE_BOLD'), podPromoMock()]);
    fireEvent.mouseDown(await screen.findByRole('combobox', { name: /Banner look/ }));
    fireEvent.click(await screen.findByRole('option', { name: 'Festive bold' }));
    fireEvent.click(screen.getByRole('button', { name: 'Make a new banner' }));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('A new banner is on the post', 'success'));
    expect(onChanged).toHaveBeenCalled();
  });

  it('opens Make banners for this pod, from managers and editors alike', async () => {
    renderDrawer([podPromoMock()], { canManage: false });
    fireEvent.click(await screen.findByTestId('promo-make-banners'));
    expect(await screen.findByRole('dialog', { name: 'Banners for Sunset Run' })).toBeInTheDocument();
    // The pod is fixed: no picker.
    expect(screen.queryByTestId('pod-picker')).not.toBeInTheDocument();
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Banners for Sunset Run' })).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Banners for Sunset Run' })).not.toBeInTheDocument());
    expect(screen.getByTestId('promo-drawer')).toBeInTheDocument();
  });

  it('closes Make banners once a manager schedules from it, and re-reads the promotion', async () => {
    const { onChanged } = renderDrawer([
      podPromoMock(),
      generatePodBannersMock('pod1'),
      podPromoOptionsMock(),
      podPromoSettingsMock(),
      schedulePodPromoMock({ pod_id: 'pod1', at: null, account_ids: null, collaborators: ['blue.cafe', 'asha_runs'], style: null }),
      podPromoMock(),
    ]);
    fireEvent.click(await screen.findByTestId('promo-make-banners'));
    const dialog = await screen.findByRole('dialog', { name: 'Banners for Sunset Run' });
    fireEvent.click(within(dialog).getByTestId('banner-generate'));
    const section = await within(dialog).findByTestId('banner-schedule-section');
    const submit = within(section).getByTestId('form-actions-row-submit');
    await waitFor(() => expect(submit).toBeEnabled());
    fireEvent.click(submit);
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Sunset Run is being promoted', 'success'));
    expect(onChanged).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Banners for Sunset Run' })).not.toBeInTheDocument());
  });

  it('says why a new banner could not be made', async () => {
    const { onChanged } = renderDrawer([podPromoMock(), regeneratePodPromoBannerMock('pp1', 'ImageKit is down')]);
    fireEvent.click(await screen.findByRole('button', { name: 'Make a new banner' }));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('ImageKit is down', 'error'));
    expect(onChanged).not.toHaveBeenCalled();
  });

  it('cancels only after the manager confirms', async () => {
    dialogsMock.confirm.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const { onChanged } = renderDrawer([podPromoMock(), cancelPodPromoMock('pp1'), podPromoMock()]);
    const cancel = await screen.findByRole('button', { name: 'Cancel promotion' });
    fireEvent.click(cancel);
    await waitFor(() => expect(dialogsMock.confirm).toHaveBeenCalledTimes(1));
    expect(dialogsMock.confirm.mock.calls[0][0]).toMatchObject({ title: 'Cancel the promotion for Sunset Run?', destructive: true });
    expect(dialogsMock.notify).not.toHaveBeenCalled();
    fireEvent.click(cancel);
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Promotion cancelled', 'success'));
    expect(onChanged).toHaveBeenCalled();
  });

  it('copies the tracking link and says whether it landed', async () => {
    clipboard.copyToClipboard.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    renderDrawer([podPromoMock()]);
    fireEvent.click(await screen.findByRole('button', { name: 'Copy link' }));
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeInTheDocument();
    expect(clipboard.copyToClipboard).toHaveBeenCalledWith('https://duncit.com/aB3xY9Zq');
    fireEvent.click(screen.getByRole('button', { name: 'Copied' }));
    expect(await screen.findByRole('button', { name: 'Could not copy — select it' })).toBeInTheDocument();
  });
});

describe('PromoFigures', () => {
  it('draws empty bars rather than dividing by zero when nobody clicked', () => {
    renderWithProviders(<PromoFigures figures={makePodPromoFigures({ clicks: 0, signups: 0, bookings: 0, payments: 0 })} />);
    for (const bar of screen.getAllByRole('progressbar')) expect(bar).toHaveAttribute('aria-valuenow', '0');
  });
});
