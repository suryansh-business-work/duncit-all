import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { renderWithProviders } from '../testkit';
import {
  makeLive,
  makeLook,
  makeSettings,
  occasionLiveErrorMock,
  occasionLiveMock,
  occasionThemesErrorMock,
  occasionThemesMock,
  setOccasionLiveErrorMock,
  setOccasionLiveMock,
} from '../mocks/occasions-live.mock';

const dialogsMock = vi.hoisted(() => ({ notify: vi.fn(), confirm: vi.fn() }));
vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notify: dialogsMock.notify,
  useConfirm: () => dialogsMock.confirm,
}));
vi.mock('@duncit/app-settings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/app-settings')>()),
  useDateFormat: () => ({ formatDateTime: (d: Date | string) => `fmt:${String(d)}` }),
}));
// The phone itself is the preview slice's to test; here it only shows what it was asked to paint.
vi.mock('../../src/pages/occasions-page/preview/PhonePreview', () => ({
  default: ({ label, mode }: { label: string; mode: string }) => <div role="img" aria-label={label} data-mode={mode} />,
}));

import { urlConfigs } from '../../src/config/url-configs';
import LiveHero from '../../src/pages/occasions-page/live/LiveHero';
import LiveTab from '../../src/pages/occasions-page/live/LiveTab';

afterEach(() => {
  vi.clearAllMocks();
});

const DIWALI = makeLook();
const HOLI = makeLook({ key: 'holi', name: 'Holi', greeting: '' });
const OLD = makeLook({ key: 'old', name: 'Old look', is_archived: true });

describe('LiveHero', () => {
  it('shows the house look when nothing is on, with no dates or links', () => {
    renderWithProviders(<LiveHero live={makeLive()} />);
    const hero = screen.getByTestId('occasion-live-hero');
    expect(within(hero).getByRole('heading', { level: 2, name: 'Normal (house look)' })).toBeInTheDocument();
    expect(within(hero).getByText('The apps wear their own colours with nothing over them.')).toBeInTheDocument();
    expect(within(hero).getByRole('img', { name: 'Preview of Normal (house look) on a phone' })).toBeInTheDocument();
    expect(within(hero).getByText('Live in every Duncit app now')).toBeInTheDocument();
    // Source NONE and mode NORMAL both read "Normal": one chip says why, the other names the mode.
    expect(within(hero).getByText('Normal')).toBeInTheDocument();
    expect(within(hero).getByText('Live mode: Normal')).toBeInTheDocument();
    expect(within(hero).queryByText(/The schedule may change it next/)).not.toBeInTheDocument();
    expect(within(hero).queryByRole('link')).not.toBeInTheDocument();
  });

  it('shows the look that is on, why, its greeting, the next change and where to open and edit it', () => {
    const look = makeLook({ key: 'new year', name: 'New Year', greeting: 'Happy New Year!' });
    renderWithProviders(
      <LiveHero live={makeLive({ mode: 'SCHEDULE', source: 'SCHEDULE', next_change_at: '2027-01-01T06:00:00.000Z', theme: look })} />,
    );
    expect(screen.getByRole('heading', { level: 2, name: 'New Year' })).toBeInTheDocument();
    expect(screen.getByText('Lamps and marigolds.')).toBeInTheDocument();
    expect(screen.getByText('Scheduled')).toBeInTheDocument();
    expect(screen.getByText('Live mode: Automatic by schedule')).toBeInTheDocument();
    expect(screen.getByText('Happy New Year!')).toBeInTheDocument();
    expect(screen.getByText('The schedule may change it next on fmt:2027-01-01T06:00:00.000Z')).toBeInTheDocument();
    const mweb = screen.getByRole('link', { name: 'Open on mWeb' });
    expect(mweb).toHaveAttribute('href', `${urlConfigs.mwebUrl}/?occasion=new%20year`);
    expect(mweb).toHaveAttribute('target', '_blank');
    expect(mweb).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByRole('link', { name: 'Edit look' })).toHaveAttribute('href', '/occasions/themes/new%20year');
  });

  it('switches the phone between light and dark', () => {
    renderWithProviders(<LiveHero live={makeLive({ source: 'MANUAL', mode: 'MANUAL', theme: HOLI })} />);
    expect(screen.getByText('Pinned')).toBeInTheDocument();
    expect(screen.getByText('Live mode: Pin a look')).toBeInTheDocument();
    const phone = screen.getByRole('img', { name: 'Preview of Holi on a phone' });
    expect(phone).toHaveAttribute('data-mode', 'light');
    fireEvent.click(screen.getByRole('button', { name: 'Dark' }));
    expect(phone).toHaveAttribute('data-mode', 'dark');
    // A look with no greeting shows none.
    expect(screen.queryByText('Happy Diwali!')).not.toBeInTheDocument();
    expect(screen.queryByText('This look always shows in its own mode.')).not.toBeInTheDocument();
  });

  it('says the switch does nothing for a look that pins its own mode', () => {
    renderWithProviders(<LiveHero live={makeLive({ source: 'PREVIEW', theme: makeLook({ color_mode: 'DARK' }) })} />);
    expect(screen.getByText('Preview')).toBeInTheDocument();
    expect(screen.getByText('This look always shows in its own mode.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dark' })).toBeDisabled();
  });
});

const renderTab = (mocks: MockedResponse[]) => renderWithProviders(<LiveTab />, { mocks, initialEntries: ['/occasions'] });

const pick = async (name: string) => {
  fireEvent.mouseDown(screen.getByRole('combobox'));
  fireEvent.click(within(await screen.findByRole('listbox')).getByRole('option', { name }));
};

describe('LiveTab', () => {
  it('waits for both reads, then shows what is on and the switch, offering only looks that are not archived', async () => {
    renderTab([occasionLiveMock(makeLive({ theme: DIWALI, source: 'SCHEDULE', mode: 'SCHEDULE' }), makeSettings({ mode: 'SCHEDULE' })), occasionThemesMock([DIWALI, HOLI, OLD])]);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 2, name: 'Diwali' })).toBeInTheDocument();
    expect(await screen.findByText('What the apps wear')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: /Pin a look/ }));
    fireEvent.mouseDown(screen.getByRole('combobox'));
    const listbox = await screen.findByRole('listbox');
    expect(within(listbox).getAllByRole('option').map((o) => o.textContent)).toEqual(['Diwali', 'Holi']);
  });

  it('pins a look once confirmed, names it in the question, says so and reads the live look again', async () => {
    dialogsMock.confirm.mockResolvedValue(true);
    const pinned = makeSettings({ mode: 'MANUAL', manual_key: 'holi' });
    renderTab([
      occasionLiveMock(makeLive(), makeSettings()),
      occasionThemesMock([DIWALI, HOLI], 2),
      setOccasionLiveMock('MANUAL', 'holi', pinned),
      occasionLiveMock(makeLive({ mode: 'MANUAL', source: 'MANUAL', theme: HOLI }), pinned),
    ]);
    await screen.findByText('What the apps wear');
    fireEvent.click(screen.getByRole('radio', { name: /Pin a look/ }));
    await pick('Holi');
    fireEvent.click(screen.getByTestId('occasion-live-mode-save'));
    await waitFor(() =>
      expect(dialogsMock.confirm).toHaveBeenCalledWith({
        title: 'Change every Duncit app?',
        message: 'Every Duncit app wears Holi the next time it loads, until you change it.',
        confirmLabel: 'Apply',
      }),
    );
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Live look updated. Apps pick it up on their next load.', 'success'));
    expect(await screen.findByRole('heading', { level: 2, name: 'Holi' })).toBeInTheDocument();
    expect(screen.getByText('Pinned')).toBeInTheDocument();
  });

  it('changes nothing when the question is declined', async () => {
    dialogsMock.confirm.mockResolvedValue(false);
    renderTab([occasionLiveMock(makeLive(), makeSettings({ mode: 'MANUAL', manual_key: 'diwali' })), occasionThemesMock([DIWALI])]);
    await screen.findByText('What the apps wear');
    fireEvent.click(screen.getByRole('radio', { name: /Automatic by schedule/ }));
    fireEvent.click(screen.getByTestId('occasion-live-mode-save'));
    await waitFor(() =>
      expect(dialogsMock.confirm).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Every Duncit app follows the schedule: a look goes live while its dates are open, otherwise the house look shows.',
        }),
      ),
    );
    expect(dialogsMock.notify).not.toHaveBeenCalled();
  });

  it('goes back to normal with no look sent, and reports a switch the server refused', async () => {
    dialogsMock.confirm.mockResolvedValue(true);
    renderTab([
      occasionLiveMock(makeLive({ mode: 'SCHEDULE' }), makeSettings({ mode: 'SCHEDULE' })),
      occasionThemesMock([DIWALI]),
      setOccasionLiveErrorMock('NORMAL', null, 'not allowed'),
    ]);
    await screen.findByText('What the apps wear');
    fireEvent.click(screen.getByRole('radio', { name: /^Normal/ }));
    fireEvent.click(screen.getByTestId('occasion-live-mode-save'));
    await waitFor(() =>
      expect(dialogsMock.confirm).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Every Duncit app goes back to its house look the next time it loads.' }),
      ),
    );
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('not allowed', 'error'));
  });

  it('shows why the live look could not be read, and keeps the switch away without it', async () => {
    renderTab([occasionLiveErrorMock('live is down'), occasionThemesMock([DIWALI])]);
    expect(await screen.findByText('live is down')).toBeInTheDocument();
    expect(screen.queryByTestId('occasion-live-hero')).not.toBeInTheDocument();
    expect(screen.queryByTestId('occasion-live-mode-form')).not.toBeInTheDocument();
  });

  it('shows the live look but no switch when the looks could not be read', async () => {
    renderTab([occasionLiveMock(makeLive(), makeSettings()), occasionThemesErrorMock('looks are down')]);
    expect(await screen.findByText('looks are down')).toBeInTheDocument();
    expect(screen.getByTestId('occasion-live-hero')).toBeInTheDocument();
    expect(screen.queryByTestId('occasion-live-mode-form')).not.toBeInTheDocument();
  });
});
