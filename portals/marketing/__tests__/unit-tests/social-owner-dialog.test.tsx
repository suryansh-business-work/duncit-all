import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { GraphQLError } from 'graphql';
import type { MockedResponse } from '@apollo/client/testing';
import { renderWithProviders } from '../testkit';
import {
  audienceListOwnersEmptyMock,
  audienceListOwnersMock,
  makeSocialAccount,
  setSocialAccountOwnerErrorMock,
  setSocialAccountOwnerMock,
} from '../mocks';
import { AUDIENCE_LIST_OWNERS } from '../../src/pages/target-audience-page/queries';

const dialogsMock = vi.hoisted(() => ({ notify: vi.fn() }));
vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notify: dialogsMock.notify,
}));

import OwnerDialog from '../../src/pages/social-accounts-page/accounts/OwnerDialog';
import type { SocialAccount } from '../../src/pages/social-accounts-page/queries';

afterEach(() => {
  vi.clearAllMocks();
});

const renderDialog = (account: SocialAccount, mocks: MockedResponse[]) => {
  const onClose = vi.fn();
  const onSaved = vi.fn();
  renderWithProviders(<OwnerDialog account={account} onClose={onClose} onSaved={onSaved} />, { mocks });
  return { onClose, onSaved };
};

const ownerInput = () => screen.getByRole('combobox', { name: 'Owner' });
const teamInput = () => screen.getByRole('combobox', { name: 'Team' });

/** Opens the picker and presses the named person. */
const pick = async (input: HTMLElement, name: string) => {
  fireEvent.mouseDown(input);
  fireEvent.click(within(await screen.findByRole('listbox')).getByRole('option', { name }));
};

describe('OwnerDialog', () => {
  it('is titled after the account and explains both pickers', async () => {
    renderDialog(makeSocialAccount(), [audienceListOwnersMock]);
    expect(screen.getByRole('dialog', { name: 'Set owner for Duncit Pages' })).toBeInTheDocument();
    expect(screen.getByText('Gets the reminders when access is about to expire, and reconnects the account.')).toBeInTheDocument();
    expect(screen.getByText('Others who look after this account.')).toBeInTheDocument();
    expect(ownerInput()).toHaveAttribute('role', 'combobox');
    expect(teamInput()).toHaveAttribute('role', 'combobox');
    fireEvent.mouseDown(ownerInput());
    expect(await screen.findByText('Ravi Boss')).toBeInTheDocument();
  });

  it('starts from the account’s current owner and team', async () => {
    renderDialog(makeSocialAccount({ owner_user_id: 'me', team_user_ids: ['boss', 'nameless'] }), [audienceListOwnersMock]);
    await waitFor(() => expect(ownerInput()).toHaveValue('Asha Rao'));
    // The team shows as chips on the picker; nothing is open, so each name appears once.
    expect(screen.getByText('Ravi Boss')).toHaveClass('MuiChip-label');
    expect(screen.getByText('new.hire@duncit.com')).toHaveClass('MuiChip-label');
  });

  it('shows an owner who has since lost portal access as blank, and keeps them unless somebody picks another', async () => {
    const { onSaved } = renderDialog(makeSocialAccount({ owner_user_id: 'left-the-company' }), [
      audienceListOwnersMock,
      setSocialAccountOwnerMock({ id: 'sa1', owner_user_id: 'left-the-company', team_user_ids: [] }, makeSocialAccount()),
    ]);
    fireEvent.mouseDown(ownerInput());
    await screen.findByRole('listbox');
    expect(ownerInput()).toHaveValue('');
    fireEvent.click(screen.getByTestId('social-owner-save'));
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  });

  it('saves a picked owner and team, tells the marketer, refreshes and closes', async () => {
    const { onClose, onSaved } = renderDialog(makeSocialAccount(), [
      audienceListOwnersMock,
      setSocialAccountOwnerMock(
        { id: 'sa1', owner_user_id: 'boss', team_user_ids: ['me', 'nameless'] },
        makeSocialAccount({ owner_user_id: 'boss', owner_name: 'Ravi Boss', team_user_ids: ['me', 'nameless'] }),
      ),
    ]);
    await pick(ownerInput(), 'Ravi Boss');
    expect(ownerInput()).toHaveValue('Ravi Boss');
    await pick(teamInput(), 'Asha Rao');
    await pick(teamInput(), 'new.hire@duncit.com');
    expect(screen.getByText('Asha Rao')).toHaveClass('MuiChip-label');

    fireEvent.click(screen.getByTestId('social-owner-save'));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Owner updated for Duncit Pages', 'success'));
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('clears the owner when the pick is removed', async () => {
    const { onSaved } = renderDialog(makeSocialAccount({ owner_user_id: 'me' }), [
      audienceListOwnersMock,
      setSocialAccountOwnerMock({ id: 'sa1', owner_user_id: null, team_user_ids: [] }, makeSocialAccount()),
    ]);
    await waitFor(() => expect(ownerInput()).toHaveValue('Asha Rao'));
    fireEvent.click(screen.getByTitle('Clear'));
    expect(ownerInput()).toHaveValue('');
    fireEvent.click(screen.getByTestId('social-owner-save'));
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  });

  it('reports a refused save and stays open', async () => {
    const { onClose, onSaved } = renderDialog(makeSocialAccount(), [
      audienceListOwnersMock,
      setSocialAccountOwnerErrorMock({ id: 'sa1', owner_user_id: null, team_user_ids: [] }, 'The owner is not a known user'),
    ]);
    fireEvent.click(screen.getByTestId('social-owner-save'));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('The owner is not a known user', 'error'));
    expect(onSaved).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('says when nobody can be picked', async () => {
    renderDialog(makeSocialAccount(), [audienceListOwnersEmptyMock]);
    fireEvent.mouseDown(ownerInput());
    expect(await screen.findByText('Nobody has access to this portal yet')).toBeInTheDocument();
  });

  it('shows why the people could not be loaded', async () => {
    renderDialog(makeSocialAccount(), [
      { request: { query: AUDIENCE_LIST_OWNERS }, result: { errors: [new GraphQLError('Directory unavailable')] } },
    ]);
    expect(await screen.findByRole('alert')).toHaveTextContent('Directory unavailable');
  });

  it('cancels without touching the server', () => {
    const { onClose, onSaved } = renderDialog(makeSocialAccount(), [audienceListOwnersMock]);
    fireEvent.click(screen.getByTestId('social-owner-cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSaved).not.toHaveBeenCalled();
    expect(dialogsMock.notify).not.toHaveBeenCalled();
  });
});
