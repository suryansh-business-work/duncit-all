import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { notifySuccess } from '@duncit/dialogs';
import ReelSettingsPage from '../../src/pages/website/reel-settings/ReelSettingsPage';
import ReelsPage from '../../src/pages/website/reels/ReelsPage';
import { renderWithProviders } from '../testkit';
import { en, label } from '../en';
import { reelSettingsMock, reelsTableMock, updateReelSettingsMock, makeReel } from '../mocks/reels.mock';

vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notifySuccess: vi.fn(),
}));

const maxMb = () => screen.getByLabelText(label('websiteApp.reels.settings.maxReelMb'));
const maxReels = () => screen.getByLabelText(label('websiteApp.reels.settings.maxReels'));
const save = () => screen.getByRole('button', { name: en('shell.common.save') });

beforeEach(() => {
  vi.mocked(notifySuccess).mockClear();
});

describe('ReelSettingsPage', () => {
  it('shows the current limits and saves a change', async () => {
    const seen: Record<string, unknown>[] = [];
    renderWithProviders(<ReelSettingsPage />, { mocks: [reelSettingsMock({ max_reel_mb: 20, max_reels: 5 }), updateReelSettingsMock(seen)] });
    await waitFor(() => expect(maxMb()).toHaveValue(20));
    expect(maxReels()).toHaveValue(5);
    expect(screen.getByRole('heading', { name: en('websiteApp.reels.settings.title') })).toBeInTheDocument();

    fireEvent.change(maxMb(), { target: { value: '30' } });
    fireEvent.change(maxReels(), { target: { value: '4' } });
    fireEvent.click(save());
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith(en('websiteApp.reels.settings.saved')));
    expect(seen).toEqual([{ input: { max_reel_mb: 30, max_reels: 4 } }]);
  });

  it('refuses values outside the bounds the server clamps to', async () => {
    const seen: Record<string, unknown>[] = [];
    renderWithProviders(<ReelSettingsPage />, { mocks: [reelSettingsMock(), updateReelSettingsMock(seen)] });
    await waitFor(() => expect(maxMb()).toHaveValue(20));
    fireEvent.change(maxMb(), { target: { value: '101' } });
    fireEvent.change(maxReels(), { target: { value: '1.5' } });
    fireEvent.click(save());
    const range = en('websiteApp.reels.settings.errRange', { min: 1, max: 100 });
    expect(await screen.findByText(range)).toBeInTheDocument();
    expect(screen.getByText(en('websiteApp.reels.settings.errRange', { min: 1, max: 10 }))).toBeInTheDocument();
    expect(seen).toHaveLength(0);
  });

  it('keeps the form and says so when the save is refused', async () => {
    renderWithProviders(<ReelSettingsPage embedded />, {
      mocks: [reelSettingsMock(), updateReelSettingsMock([], [{ message: 'no' }])],
    });
    await waitFor(() => expect(maxMb()).toHaveValue(20));
    fireEvent.click(save());
    expect(await screen.findByText(en('websiteApp.reels.settings.saveFailed'))).toBeInTheDocument();
    expect(notifySuccess).not.toHaveBeenCalled();
    // Embedded in a website tab it is a section, not a page header.
    expect(screen.getByRole('heading', { level: 2, name: en('websiteApp.reels.settings.title') })).toBeInTheDocument();
  });

  it('reports limits that could not be read, with no form to edit', async () => {
    renderWithProviders(<ReelSettingsPage />, { mocks: [reelSettingsMock({ fail: true })] });
    expect(await screen.findByText(en('websiteApp.reels.settings.loadFailed'))).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: en('shell.common.save') })).not.toBeInTheDocument();
  });
});

describe('ReelsPage', () => {
  it('opens on the main website and lists its reels', async () => {
    const seen: Record<string, unknown>[] = [];
    renderWithProviders(<ReelsPage />, { mocks: [reelsTableMock([makeReel({ title: 'Opening reel' })], seen), reelSettingsMock()] });
    expect(await screen.findByText('Opening reel')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: en('websiteApp.reels.title') })).toBeInTheDocument();
    expect(JSON.stringify(seen[0])).toContain('"value":"MAIN"');
  });
});
