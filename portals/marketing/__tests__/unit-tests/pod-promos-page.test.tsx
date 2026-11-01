import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { formatINR } from '@duncit/utils';
import { renderWithProviders } from '../testkit';
import { __setTableRows } from './table-mock';
import {
  createPodPromoMock,
  generatePodBannersMock,
  makePodPromo,
  makePodPromoCandidate,
  makePodPromoSettings,
  previewPodPromoMock,
  podPromoCandidatesMock,
  podPromoMock,
  podPromoOptionsMock,
  podPromoSettingsMock,
  podPromoSummaryMock,
  schedulePodPromoMock,
  updatePodPromoSettingsMock,
} from '../mocks';

vi.mock('@duncit/table', () => import('./table-mock'));
const userCtx = vi.hoisted(() => ({ roles: ['MARKETING_MANAGER'] as string[] }));
vi.mock('@duncit/user-context', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/user-context')>()),
  useUserData: () => ({ user: { user_id: 'u1', roles: userCtx.roles } }),
}));
const dialogsMock = vi.hoisted(() => ({ notify: vi.fn(), confirm: vi.fn() }));
vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notify: dialogsMock.notify,
  useConfirm: () => dialogsMock.confirm,
}));

/** The pod cell draws the title twice in the table stand-in (its value and its renderer); the renderer's line is what a person reads. */
const podTitleInTable = () => within(screen.getByTestId('duncit-table')).findByText('Sunset Run', { selector: 'p' });
vi.mock('@duncit/app-settings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/app-settings')>()),
  useDateFormat: () => ({ formatDateTime: (d: Date) => `fmt:${d.toISOString()}` }),
}));

import PodPromosPage from '../../src/pages/pod-promos-page';
import { toFormValues } from '../../src/pages/pod-promos-page/promo-settings-form';

/** What the guide kit remembers for u1 once the Pod promotions tour has been shown. */
const TOUR_SEEN = ['duncit.tours.completed.u1', '["marketing.podPromos"]'] as const;

beforeEach(() => {
  userCtx.roles = ['MARKETING_MANAGER'];
  localStorage.setItem(...TOUR_SEEN);
});

afterEach(() => {
  __setTableRows([]);
  localStorage.clear();
  vi.clearAllMocks();
});

const baseMocks = () => [podPromoSummaryMock(), podPromoSettingsMock(), podPromoOptionsMock()];

const renderPage = (mocks = baseMocks()) => renderWithProviders(<PodPromosPage />, { initialEntries: ['/publish/pod-promos'], mocks });

describe('PodPromosPage', () => {
  it('opens with its heading, intro, totals, settings and the promotions table', async () => {
    __setTableRows([makePodPromo()]);
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: 'Pod promotions' })).toBeInTheDocument();
    expect(within(screen.getByTestId('page-intro')).getByText(/gets a banner made from its own details/)).toBeInTheDocument();
    expect(await screen.findByText('1,500')).toBeInTheDocument();
    expect(within(screen.getByTestId('promo-card-revenue')).getByText(formatINR(24990))).toBeInTheDocument();
    expect(await screen.findByTestId('promo-settings-form')).toBeInTheDocument();
    expect(screen.getByText('Scheduled posts are filed under Asha Rao, who last saved these settings.')).toBeInTheDocument();
    expect(await podTitleInTable()).toBeInTheDocument();
    expect(screen.queryByTestId('portal-tour')).not.toBeInTheDocument();
  });

  it('says the totals could not be read', async () => {
    renderPage([podPromoSummaryMock(undefined, 'Summary is down'), podPromoSettingsMock(), podPromoOptionsMock()]);
    expect(await screen.findByText('Summary is down')).toBeInTheDocument();
  });

  it('saves the settings for a manager and says so', async () => {
    const input = { ...toFormValues(makePodPromoSettings()), days_before: 5 };
    renderPage([...baseMocks(), updatePodPromoSettingsMock(input), podPromoSettingsMock(makePodPromoSettings({ days_before: 5 }))]);
    const days = await screen.findByLabelText(/Days before the pod/);
    fireEvent.change(days, { target: { value: '5' } });
    const save = screen.getByRole('button', { name: 'Save settings' });
    await waitFor(() => expect(save).toBeEnabled());
    fireEvent.click(save);
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Promotion settings saved', 'success'));
  });

  it('shows the server refusal when the save fails', async () => {
    const input = { ...toFormValues(makePodPromoSettings()), days_before: 5 };
    renderPage([...baseMocks(), updatePodPromoSettingsMock(input, 'Reconnect Instagram first')]);
    fireEvent.change(await screen.findByLabelText(/Days before the pod/), { target: { value: '5' } });
    const save = screen.getByRole('button', { name: 'Save settings' });
    await waitFor(() => expect(save).toBeEnabled());
    fireEvent.click(save);
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Reconnect Instagram first', 'error'));
  });

  it('hands an editor the settings to read, not to change', async () => {
    userCtx.roles = ['MARKETING_EDITOR'];
    renderPage();
    expect(await screen.findByText('Only marketing managers can change these settings.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save settings' })).not.toBeInTheDocument();
  });

  it('shows why the settings and their choices could not be read', async () => {
    renderPage([podPromoSummaryMock(), podPromoSettingsMock(null, 'Settings are down'), podPromoOptionsMock('Options are down')]);
    expect(await screen.findByText('Settings are down')).toBeInTheDocument();
    expect(await screen.findByText('Some choices could not be loaded; saved picks are shown by id.')).toBeInTheDocument();
  });

  it('leaves out who saved the settings when nobody has yet', async () => {
    renderPage([podPromoSummaryMock(), podPromoSettingsMock(makePodPromoSettings({ updated_by_name: '' })), podPromoOptionsMock()]);
    expect(await screen.findByTestId('promo-settings-form')).toBeInTheDocument();
    expect(screen.queryByText(/Scheduled posts are filed under/)).not.toBeInTheDocument();
  });

  it('opens a promotion from its row and the preview dialog from the toolbar', async () => {
    __setTableRows([makePodPromo()]);
    renderPage([...baseMocks(), podPromoMock(), podPromoCandidatesMock([])]);
    fireEvent.click(await screen.findByText('rowclick-0'));
    expect(await screen.findByTestId('promo-details')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    fireEvent.click(screen.getByTestId('pod-promo-open-preview'));
    expect(await screen.findByRole('dialog', { name: 'Preview a pod promotion' })).toBeInTheDocument();
    expect(await screen.findByText('No upcoming pods match.')).toBeInTheDocument();
  });

  it('re-reads the table once a pod is promoted from the preview dialog', async () => {
    renderPage([
      ...baseMocks(),
      podPromoCandidatesMock([makePodPromoCandidate()]),
      previewPodPromoMock('pod1'),
      createPodPromoMock('pod1'),
      podPromoSummaryMock(),
      podPromoCandidatesMock([makePodPromoCandidate({ promo_status: 'SCHEDULED' })]),
    ]);
    expect(await screen.findByTestId('table-empty')).toBeInTheDocument();
    __setTableRows([makePodPromo()]);
    fireEvent.click(screen.getByTestId('pod-promo-open-preview'));
    fireEvent.click(await screen.findByTestId('pod-candidate-pod1'));
    fireEvent.click(await screen.findByRole('button', { name: 'Promote now' }));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Sunset Run is being promoted', 'success'));
    expect(await podTitleInTable()).toBeInTheDocument();
  });

  it('makes banners from the header and re-reads the table once they are scheduled', async () => {
    renderPage([
      ...baseMocks(),
      podPromoCandidatesMock([makePodPromoCandidate()]),
      generatePodBannersMock('pod1'),
      schedulePodPromoMock({ pod_id: 'pod1', at: null, account_ids: null, collaborators: null, style: null }),
      podPromoSummaryMock(),
      podPromoCandidatesMock([]),
    ]);
    expect(await screen.findByTestId('table-empty')).toBeInTheDocument();
    __setTableRows([makePodPromo()]);
    fireEvent.click(screen.getByTestId('pod-promos-make-banners'));
    const dialog = await screen.findByRole('dialog', { name: 'Make banners' });
    fireEvent.click(await within(dialog).findByTestId('pod-candidate-pod1'));
    fireEvent.click(within(dialog).getByTestId('banner-generate'));
    const section = await within(dialog).findByTestId('banner-schedule-section');
    await waitFor(() => expect(within(section).getByTestId('form-actions-row-submit')).toBeEnabled());
    fireEvent.click(within(section).getByTestId('form-actions-row-submit'));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Sunset Run is being promoted', 'success'));
    expect(await podTitleInTable()).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog', { name: /Banners for/ })).not.toBeInTheDocument());
  });

  it('shows the empty table when nothing has been promoted', async () => {
    renderPage();
    expect(await screen.findByTestId('table-empty')).toHaveTextContent('No pods have been promoted yet.');
  });
});
