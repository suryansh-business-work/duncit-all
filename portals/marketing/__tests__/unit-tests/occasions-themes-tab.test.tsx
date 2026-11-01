import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { Route, useLocation } from 'react-router';
import { renderWithProviders } from '../testkit';
import {
  duplicateOccasionThemeMock,
  makeLook,
  occasionLiveMock,
  occasionThemesErrorMock,
  occasionThemesMock,
  setOccasionLiveMock,
} from '../mocks/occasions-themes.mock';

const dialogsMock = vi.hoisted(() => ({ confirm: vi.fn(), notify: vi.fn() }));
vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  useConfirm: () => dialogsMock.confirm,
  notify: dialogsMock.notify,
}));

vi.mock('@duncit/ui', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/ui')>()),
  OccasionEffects: () => <div data-testid="effects" />,
}));

import ThemesTab from '../../src/pages/occasions-page/themes/ThemesTab';

const diwali = makeLook();
const holi = makeLook({ key: 'holi', name: 'Holi', description: 'Colours everywhere' });
const christmas = makeLook({ key: 'christmas', name: 'Christmas', description: 'Snow', region: 'WESTERN', is_builtin: true });
const oldLook = makeLook({ key: 'old-diwali', name: 'Old Diwali', is_archived: true });
const catalogue = [diwali, holi, christmas, oldLook];

function Landed() {
  return <div data-testid="landed">{useLocation().pathname}</div>;
}

// The gallery refetches both reads after every change, so each is served more than once.
const renderTab = (mocks: MockedResponse[]) =>
  renderWithProviders(<div />, {
    mocks,
    routes: (
      <>
        <Route path="/" element={<ThemesTab />} />
        <Route path="/occasions/themes/:key" element={<Landed />} />
      </>
    ),
  });

const section = (name: string) => screen.getByRole('region', { name });

afterEach(() => {
  vi.clearAllMocks();
});

describe('ThemesTab', () => {
  it('waits for the catalogue, then groups the looks by region with counts and marks the live one', async () => {
    renderTab([occasionThemesMock(catalogue), occasionLiveMock(diwali)]);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    expect(await screen.findByRole('heading', { name: 'Indian festivals' })).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(within(section('Indian festivals')).getByText('2 looks')).toBeInTheDocument();
    expect(within(section('Western festivals')).getByText('1 look')).toBeInTheDocument();
    await waitFor(() => expect(within(screen.getByTestId('occasion-card-diwali')).getByText('Live now')).toBeInTheDocument());
    expect(within(screen.getByTestId('occasion-card-holi')).queryByText('Live now')).not.toBeInTheDocument();
    expect(screen.queryByTestId('occasion-card-old-diwali')).not.toBeInTheDocument();
  });

  it('marks nothing live while the apps wear the house look, and shows archived looks when asked', async () => {
    renderTab([occasionThemesMock(catalogue), occasionLiveMock(null)]);
    await screen.findByTestId('occasion-card-diwali');
    expect(screen.queryByText('Live now')).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Show archived'));
    expect(await screen.findByTestId('occasion-card-old-diwali')).toBeInTheDocument();
    expect(within(section('Indian festivals')).getByText('3 looks')).toBeInTheDocument();
  });

  it('says when no look matches the search or region', async () => {
    renderTab([occasionThemesMock(catalogue), occasionLiveMock(null)]);
    await screen.findByTestId('occasion-card-diwali');
    fireEvent.click(screen.getByRole('button', { name: 'National days' }));
    expect(await screen.findByText('No looks match. Clear the search or pick another region.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Western festivals' }));
    expect(await screen.findByTestId('occasion-card-christmas')).toBeInTheDocument();
    expect(screen.queryByTestId('occasion-card-diwali')).not.toBeInTheDocument();
  });

  it('says why the catalogue could not be read', async () => {
    renderTab([occasionThemesErrorMock('Not allowed'), occasionLiveMock(null)]);
    expect(await screen.findByText('Not allowed')).toBeInTheDocument();
    expect(screen.queryByText('No looks match. Clear the search or pick another region.')).not.toBeInTheDocument();
  });

  it('previews a look in a dialog and closes it again', async () => {
    renderTab([occasionThemesMock(catalogue), occasionLiveMock(null)]);
    fireEvent.click(await screen.findByRole('button', { name: 'Preview Holi' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Colours everywhere')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('applies a look from its card once confirmed', async () => {
    dialogsMock.confirm.mockResolvedValue(true);
    renderTab([occasionThemesMock(catalogue, 2), occasionLiveMock(null, 2), setOccasionLiveMock('christmas')]);
    const card = await screen.findByTestId('occasion-card-christmas');
    fireEvent.click(within(card).getByRole('button', { name: 'Apply now' }));
    await waitFor(() =>
      expect(dialogsMock.notify).toHaveBeenCalledWith('Live look updated. Apps pick it up on their next load.', 'success'),
    );
  });

  it('copies a look under the suggested name and opens the copy, or lets the person back out', async () => {
    renderTab([
      occasionThemesMock(catalogue, 2),
      occasionLiveMock(null, 2),
      duplicateOccasionThemeMock('holi', 'Holi copy', 'holi-copy'),
    ]);
    const more = await screen.findByRole('button', { name: 'More actions for Holi' });

    fireEvent.click(more);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Duplicate' }));
    let dialog = await screen.findByRole('dialog', { name: 'Duplicate Holi' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    fireEvent.click(more);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Duplicate' }));
    dialog = await screen.findByRole('dialog', { name: 'Duplicate Holi' });
    expect(within(dialog).getByRole('textbox', { name: /Name/ })).toHaveValue('Holi copy');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Duplicate' }));
    expect(await screen.findByTestId('landed')).toHaveTextContent('/occasions/themes/holi-copy');
    expect(dialogsMock.notify).toHaveBeenCalledWith('Holi copy created. You can edit it now.', 'success');
  });
});
