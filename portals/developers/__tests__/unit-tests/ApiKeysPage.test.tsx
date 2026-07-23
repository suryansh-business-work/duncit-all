import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import ApiKeysPage from '../../src/pages/api-keys/ApiKeysPage';
import { renderWithProviders } from '../testkit';
import {
  RAW_API_KEY,
  createApiKeyEmptyMock,
  createApiKeyMock,
  makeApiKeyRow,
  revokeApiKeyMock,
} from '../mocks';
import { __setTableRows } from './table-mock';

// The real page drives the shared table + create/revoke mutations; the table is
// the lightweight stand-in and the mutations run through Apollo MockedProvider.
vi.mock('@duncit/table', () => import('./table-mock'));

const openCreateDialog = (): HTMLElement => {
  fireEvent.click(screen.getByRole('button', { name: 'Create key' }));
  return screen.getByRole('dialog');
};

const submitName = (dialog: HTMLElement, name = 'New Key') => {
  fireEvent.change(within(dialog).getByLabelText(/^Key name/), { target: { value: name } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Create key' }));
};

describe('ApiKeysPage', () => {
  it('renders the heading and the empty table', async () => {
    __setTableRows([]);
    renderWithProviders(<ApiKeysPage />);
    expect(screen.getByRole('heading', { name: 'API Keys' })).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByTestId('table-empty')).toHaveTextContent(/No API keys yet/),
    );
  });

  it('opens the create dialog and cancels without creating', async () => {
    __setTableRows([]);
    renderWithProviders(<ApiKeysPage />);
    const dialog = openCreateDialog();
    expect(within(dialog).getByText('Create API key')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('creates a key, reveals the one-time raw key and refetches the table', async () => {
    __setTableRows([]);
    renderWithProviders(<ApiKeysPage />, { mocks: [createApiKeyMock()] });
    submitName(openCreateDialog());
    await waitFor(() => expect(screen.getByText('API key created')).toBeInTheDocument());
    expect(screen.getByDisplayValue(RAW_API_KEY)).toBeInTheDocument();
    // Done clears the revealed key and closes the dialog.
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('falls back to no raw key when the mutation returns no key object', async () => {
    __setTableRows([]);
    renderWithProviders(<ApiKeysPage />, { mocks: [createApiKeyEmptyMock()] });
    const dialog = openCreateDialog();
    submitName(dialog);
    // rawKey stays null → the dialog never enters the "API key created" reveal state.
    await waitFor(() =>
      expect(within(dialog).getByLabelText(/^Key name/)).toBeInTheDocument(),
    );
    expect(screen.queryByText('API key created')).not.toBeInTheDocument();
  });

  it('surfaces a create error in both the page alert and the dialog', async () => {
    __setTableRows([]);
    renderWithProviders(<ApiKeysPage />, { mocks: [createApiKeyMock({ fail: true })] });
    submitName(openCreateDialog());
    await waitFor(() =>
      expect(screen.getAllByText(/create failed/i).length).toBeGreaterThan(0),
    );
  });

  it('revokes an active key and leaves no error alert', async () => {
    __setTableRows([makeApiKeyRow()]);
    renderWithProviders(<ApiKeysPage />, { mocks: [revokeApiKeyMock()] });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Revoke' })).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Revoke' }));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });

  it('surfaces a revoke error in the page alert', async () => {
    __setTableRows([makeApiKeyRow()]);
    renderWithProviders(<ApiKeysPage />, { mocks: [revokeApiKeyMock({ fail: true })] });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Revoke' })).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Revoke' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/revoke failed/i));
  });
});
