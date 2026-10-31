import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { Route, useLocation } from 'react-router';
import type { OccasionTheme } from '@duncit/gql-types';
import { renderWithProviders } from '../testkit';
import {
  archiveOccasionThemeErrorMock,
  archiveOccasionThemeMock,
  deleteOccasionThemeMock,
  duplicateOccasionThemeMock,
  makeLook,
  resetOccasionThemeMock,
  setOccasionLiveMock,
} from '../mocks/occasions-themes.mock';

const dialogsMock = vi.hoisted(() => ({ confirm: vi.fn(), notify: vi.fn() }));
vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  useConfirm: () => dialogsMock.confirm,
  notify: dialogsMock.notify,
}));

import { useThemeActions } from '../../src/pages/occasions-page/themes/useThemeActions';

const results = vi.fn();

function Harness({ look }: Readonly<{ look: OccasionTheme }>) {
  const actions = useThemeActions();
  const run = (work: Promise<boolean>) => {
    work.then(results);
  };
  return (
    <>
      <button type="button" onClick={() => run(actions.apply(look))}>
        apply
      </button>
      <button type="button" onClick={() => run(actions.archive(look))}>
        archive
      </button>
      <button type="button" onClick={() => run(actions.reset(look))}>
        reset
      </button>
      <button type="button" onClick={() => run(actions.remove(look))}>
        remove
      </button>
      <button type="button" onClick={() => run(actions.duplicate(look, 'Diwali copy'))}>
        duplicate
      </button>
    </>
  );
}

function Landed() {
  return <div data-testid="landed">{useLocation().pathname}</div>;
}

const renderHarness = (look: OccasionTheme, mocks: MockedResponse[]) =>
  renderWithProviders(<div />, {
    mocks,
    routes: (
      <>
        <Route path="/" element={<Harness look={look} />} />
        <Route path="/occasions/themes/:key" element={<Landed />} />
      </>
    ),
  });

const diwali = makeLook();

afterEach(() => {
  vi.clearAllMocks();
});

describe('useThemeActions', () => {
  it('applies a look by pinning it live once confirmed', async () => {
    dialogsMock.confirm.mockResolvedValue(true);
    renderHarness(diwali, [setOccasionLiveMock('diwali')]);
    fireEvent.click(screen.getByRole('button', { name: 'apply' }));
    await waitFor(() => expect(results).toHaveBeenCalledWith(true));
    expect(dialogsMock.confirm).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Every Duncit app wears Diwali the next time it loads, until you change it.' }),
    );
  });

  it('archives a look in the catalogue and says so', async () => {
    renderHarness(diwali, [archiveOccasionThemeMock('diwali', true)]);
    fireEvent.click(screen.getByRole('button', { name: 'archive' }));
    await waitFor(() => expect(results).toHaveBeenCalledWith(true));
    expect(dialogsMock.notify).toHaveBeenCalledWith('Diwali archived.', 'success');
    expect(dialogsMock.confirm).not.toHaveBeenCalled();
  });

  it('brings an archived look back', async () => {
    renderHarness(makeLook({ is_archived: true }), [archiveOccasionThemeMock('diwali', false)]);
    fireEvent.click(screen.getByRole('button', { name: 'archive' }));
    await waitFor(() => expect(results).toHaveBeenCalledWith(true));
    expect(dialogsMock.notify).toHaveBeenCalledWith('Diwali is back in the catalogue.', 'success');
  });

  it('reports an archive the server refused and resolves false', async () => {
    renderHarness(diwali, [archiveOccasionThemeErrorMock('diwali', true, 'The live look cannot be archived')]);
    fireEvent.click(screen.getByRole('button', { name: 'archive' }));
    await waitFor(() => expect(results).toHaveBeenCalledWith(false));
    expect(dialogsMock.notify).toHaveBeenCalledWith('The live look cannot be archived', 'error');
  });

  it('resets a built-in look only once confirmed', async () => {
    dialogsMock.confirm.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const reset = resetOccasionThemeMock('diwali');
    const resultFn = vi.fn(() => reset.result as { data: Record<string, unknown> });
    renderHarness(diwali, [{ ...reset, result: resultFn }]);

    fireEvent.click(screen.getByRole('button', { name: 'reset' }));
    await waitFor(() => expect(results).toHaveBeenCalledWith(false));
    expect(dialogsMock.confirm).toHaveBeenCalledWith({
      title: 'Reset Diwali?',
      message: 'Its design goes back to the way Duncit shipped it. Your changes are lost. Its schedule stays.',
      confirmLabel: 'Reset',
      confirmColor: 'warning',
    });
    expect(resultFn).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'reset' }));
    await waitFor(() => expect(results).toHaveBeenLastCalledWith(true));
    expect(resultFn).toHaveBeenCalledTimes(1);
    expect(dialogsMock.notify).toHaveBeenCalledWith('Diwali reset.', 'success');
  });

  it('deletes a look for good only once confirmed', async () => {
    dialogsMock.confirm.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    renderHarness(diwali, [deleteOccasionThemeMock('diwali')]);

    fireEvent.click(screen.getByRole('button', { name: 'remove' }));
    await waitFor(() => expect(results).toHaveBeenCalledWith(false));
    expect(dialogsMock.notify).not.toHaveBeenCalled();
    expect(dialogsMock.confirm).toHaveBeenCalledWith({
      title: 'Delete Diwali?',
      message: 'This look is deleted for good. This cannot be undone.',
      confirmLabel: 'Delete',
      destructive: true,
    });

    fireEvent.click(screen.getByRole('button', { name: 'remove' }));
    await waitFor(() => expect(results).toHaveBeenLastCalledWith(true));
    expect(dialogsMock.notify).toHaveBeenCalledWith('Diwali deleted.', 'success');
  });

  it('copies a look under the new name and opens the copy in the editor', async () => {
    renderHarness(diwali, [duplicateOccasionThemeMock('diwali', 'Diwali copy', 'diwali-copy-2')]);
    fireEvent.click(screen.getByRole('button', { name: 'duplicate' }));
    expect(await screen.findByTestId('landed')).toHaveTextContent('/occasions/themes/diwali-copy-2');
    expect(results).toHaveBeenCalledWith(true);
    expect(dialogsMock.notify).toHaveBeenCalledWith('Diwali copy created. You can edit it now.', 'success');
  });

  it('stays put when the server hands back no copy', async () => {
    renderHarness(diwali, [duplicateOccasionThemeMock('diwali', 'Diwali copy', null)]);
    fireEvent.click(screen.getByRole('button', { name: 'duplicate' }));
    await waitFor(() => expect(results).toHaveBeenCalledWith(true));
    expect(screen.queryByTestId('landed')).not.toBeInTheDocument();
  });
});
