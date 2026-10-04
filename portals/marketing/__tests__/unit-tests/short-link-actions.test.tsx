import { describe, expect, it, vi, afterEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '../testkit';
import {
  eraseShortLinkClicksMock,
  makeShortLinkRow,
  setShortLinkActiveMock,
  shortLinkDestinationMetaMock,
  updateShortLinkMock,
} from '../mocks';

const dialogsMock = vi.hoisted(() => ({ notifySuccess: vi.fn() }));
vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notifySuccess: dialogsMock.notifySuccess,
}));

import DetailActions from '../../src/pages/short-links-page/detail/DetailActions';
import EditShortLinkDialog from '../../src/pages/short-links-page/EditShortLinkDialog';
import type { ShortLinkRow } from '../../src/pages/short-links-page/queries';

/** A link as the detail page holds it — every field the edit form reads. */
const editableLink = (over: Partial<ShortLinkRow> = {}) =>
  makeShortLinkRow({
    is_external: false,
    share_target: null,
    meta_override_enabled: false,
    meta_title: null,
    meta_description: null,
    meta_image_url: null,
    ...over,
  });

const renderActions = (mocks = [shortLinkDestinationMetaMock()], onChanged = vi.fn()) => {
  renderWithProviders(<DetailActions link={editableLink()} onChanged={onChanged} />, { mocks });
  return onChanged;
};

afterEach(() => {
  vi.clearAllMocks();
});

// ===========================================================================
describe('DetailActions — retiring and reviving', () => {
  it('retires a live link, says so and refreshes the page', async () => {
    const onChanged = renderActions([shortLinkDestinationMetaMock(), setShortLinkActiveMock(false)]);
    const toggle = screen.getByTestId('short-link-toggle-active');
    expect(toggle).toHaveTextContent('Retire link');
    fireEvent.click(toggle);
    await waitFor(() =>
      expect(dialogsMock.notifySuccess).toHaveBeenCalledWith('“Diwali pod push” retired'),
    );
    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  it('offers to reactivate a retired link', async () => {
    const onChanged = vi.fn();
    renderWithProviders(
      <DetailActions link={editableLink({ is_active: false })} onChanged={onChanged} />,
      { mocks: [shortLinkDestinationMetaMock(), setShortLinkActiveMock(true)] },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Reactivate link' }));
    await waitFor(() =>
      expect(dialogsMock.notifySuccess).toHaveBeenCalledWith('“Diwali pod push” reactivated'),
    );
    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  // A refused toggle must not claim the link changed state.
  it('announces nothing when the toggle is refused', async () => {
    const onChanged = renderActions([
      shortLinkDestinationMetaMock(),
      setShortLinkActiveMock(false, { failWith: 'Not allowed' }),
    ]);
    const toggle = screen.getByTestId('short-link-toggle-active');
    fireEvent.click(toggle);
    // Disabled while the mutation is in flight; enabled again once it settled.
    expect(toggle).toBeDisabled();
    await waitFor(() => expect(toggle).toBeEnabled());
    expect(dialogsMock.notifySuccess).not.toHaveBeenCalled();
    expect(onChanged).not.toHaveBeenCalled();
  });
});

// ===========================================================================
describe('DetailActions — erasing click data', () => {
  const openErase = async () => {
    fireEvent.click(screen.getByTestId('short-link-erase-clicks'));
    return screen.findByRole('dialog');
  };

  it('warns what an erasure costs before doing it', async () => {
    renderActions();
    const dialog = await openErase();
    expect(within(dialog).getByText('Erase every click on this link?')).toBeInTheDocument();
    expect(within(dialog).getByText(/This cannot be undone/)).toBeInTheDocument();
  });

  it('erases the clicks, reports how many went and refreshes the page', async () => {
    const onChanged = renderActions([shortLinkDestinationMetaMock(), eraseShortLinkClicksMock(5)]);
    const dialog = await openErase();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Erase click data' }));

    await waitFor(() => expect(dialogsMock.notifySuccess).toHaveBeenCalledWith('5 clicks erased'));
    expect(onChanged).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  // A server that answers with nothing must not be reported as "NaN clicks".
  it('counts a missing answer as nothing erased', async () => {
    renderActions([shortLinkDestinationMetaMock(), eraseShortLinkClicksMock(null)]);
    const dialog = await openErase();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Erase click data' }));
    await waitFor(() => expect(dialogsMock.notifySuccess).toHaveBeenCalledWith('0 clicks erased'));
  });

  it('keeps the confirm open with the reason when the erasure fails', async () => {
    const onChanged = renderActions([
      shortLinkDestinationMetaMock(),
      eraseShortLinkClicksMock(null, { failWith: 'Erasure is locked for this link' }),
    ]);
    const dialog = await openErase();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Erase click data' }));

    expect(await within(dialog).findByText(/Erasure is locked for this link/)).toBeInTheDocument();
    expect(within(dialog).queryByText(/This cannot be undone/)).not.toBeInTheDocument();
    expect(dialogsMock.notifySuccess).not.toHaveBeenCalled();
    expect(onChanged).not.toHaveBeenCalled();
  });

  // The failure belongs to that attempt; reopening starts from the warning again.
  it('forgets a failure once the confirm is dismissed', async () => {
    renderActions([
      shortLinkDestinationMetaMock(),
      eraseShortLinkClicksMock(null, { failWith: 'Erasure is locked for this link' }),
    ]);
    let dialog = await openErase();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Erase click data' }));
    await within(dialog).findByText(/Erasure is locked for this link/);

    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    dialog = await openErase();
    expect(within(dialog).getByText(/This cannot be undone/)).toBeInTheDocument();
    expect(within(dialog).queryByText(/Erasure is locked/)).not.toBeInTheDocument();
  });
});

// ===========================================================================
describe('DetailActions — editing the link', () => {
  it('opens the edit dialog on the link as it stands', async () => {
    renderActions();
    fireEvent.click(screen.getByTestId('short-link-edit'));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Edit link')).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/^Label/)).toHaveValue('Diwali pod push');
    expect(within(dialog).getByLabelText(/^Destination/)).toHaveValue(
      'https://mweb.duncit.com/club/c1/pod/p1',
    );
  });

  it('closes the dialog and refreshes the page once the edit is saved', async () => {
    const onChanged = renderActions([shortLinkDestinationMetaMock(), updateShortLinkMock()]);
    fireEvent.click(screen.getByTestId('short-link-edit'));
    const dialog = await screen.findByRole('dialog');
    const save = within(dialog).getByRole('button', { name: 'Save changes' });
    await waitFor(() => expect(save).toBeEnabled());
    fireEvent.click(save);

    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('backs out of an edit without refreshing anything', async () => {
    const onChanged = renderActions();
    fireEvent.click(screen.getByTestId('short-link-edit'));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(onChanged).not.toHaveBeenCalled();
  });
});

// ===========================================================================
describe('EditShortLinkDialog', () => {
  const renderDialog = (
    mocks = [shortLinkDestinationMetaMock()],
    link: ShortLinkRow = editableLink(),
  ) => {
    const onClose = vi.fn();
    const onSaved = vi.fn();
    renderWithProviders(<EditShortLinkDialog link={link} onClose={onClose} onSaved={onSaved} />, {
      mocks,
    });
    return { onClose, onSaved };
  };

  it('explains that the channel and campaign are not editable', () => {
    renderDialog();
    expect(screen.getByText(/The channel and campaign stay as the link went out with/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Link creating for/)).not.toBeInTheDocument();
  });

  it('saves the renamed link and says so by its new name', async () => {
    const { onSaved } = renderDialog([
      shortLinkDestinationMetaMock(),
      updateShortLinkMock({ label: 'Holi pod push' }),
    ]);
    fireEvent.change(screen.getByLabelText(/^Label/), { target: { value: 'Holi pod push' } });
    const save = screen.getByRole('button', { name: 'Save changes' });
    await waitFor(() => expect(save).toBeEnabled());
    fireEvent.click(save);

    await waitFor(() =>
      expect(dialogsMock.notifySuccess).toHaveBeenCalledWith('“Holi pod push” updated'),
    );
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('surfaces a refused update and stays open', async () => {
    const { onSaved } = renderDialog([
      shortLinkDestinationMetaMock(),
      updateShortLinkMock({}, { failWith: 'That destination is blocked' }),
    ]);
    const save = screen.getByRole('button', { name: 'Save changes' });
    await waitFor(() => expect(save).toBeEnabled());
    fireEvent.click(save);

    expect(await screen.findByText(/That destination is blocked/)).toBeInTheDocument();
    expect(onSaved).not.toHaveBeenCalled();
    expect(dialogsMock.notifySuccess).not.toHaveBeenCalled();
    expect(screen.getByText('Edit link')).toBeInTheDocument();
  });

  // A share link follows the thing it was minted for.
  it('locks the destination of a link minted by a share', () => {
    renderDialog([shortLinkDestinationMetaMock()], editableLink({ share_target: 'pod:p1' }));
    expect(screen.getByLabelText(/^Destination/)).toBeDisabled();
    expect(screen.getByText(/its destination cannot be changed/)).toBeInTheDocument();
  });

  it('leaves the destination of an ordinary link editable', () => {
    renderDialog();
    expect(screen.getByLabelText(/^Destination/)).toBeEnabled();
  });

  it('closes on Cancel', () => {
    const { onClose } = renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
