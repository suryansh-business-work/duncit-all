import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import AddClubAdminDialog from '../../../../src/pages/club-admins/AddClubAdminDialog';
import {
  ADD_REGION_CLUB_ADMIN,
  REGION_CLUB_ADMIN_CANDIDATES,
  type RegionCandidate,
} from '../../../../src/pages/queries';
import { renderWithProviders } from '../../../testkit';
import { candidate, makeRegion } from '../../../mocks/region';

/** The search box is debounced by 300ms before it reaches the server. */
const DEBOUNCED = { timeout: 3000 };

const NEHA = candidate();
const KIRAN = candidate({ user_id: 'u-admin-kiran', name: '', email: 'kiran.s@duncit.com' });
const NAMELESS = candidate({ user_id: 'u-admin-7c1f', name: '', email: '' });

const candidatesMock = (search: string | null, rows: RegionCandidate[]): MockedResponse => ({
  request: { query: REGION_CLUB_ADMIN_CANDIDATES, variables: { search } },
  result: { data: { regionClubAdminCandidates: rows } },
});

const addMock: MockedResponse = {
  request: { query: ADD_REGION_CLUB_ADMIN, variables: { user_id: NEHA.user_id } },
  result: { data: { addRegionClubAdmin: makeRegion({ club_admin_count: 3 }) } },
};

const addRefused: MockedResponse = {
  request: { query: ADD_REGION_CLUB_ADMIN, variables: { user_id: NEHA.user_id } },
  result: { errors: [new GraphQLError('That Club Admin already belongs to a region.')] },
};

interface HarnessProps {
  onAdded: () => void;
  onClose: () => void;
}

/** The page's own wiring: the dialog is open until it asks to close. */
function Harness({ onAdded, onClose }: Readonly<HarnessProps>) {
  const [open, setOpen] = useState(true);
  const close = () => {
    onClose();
    setOpen(false);
  };
  return <AddClubAdminDialog open={open} onClose={close} onAdded={onAdded} />;
}

const renderDialog = (mocks: MockedResponse[]) => {
  const onAdded = vi.fn();
  const onClose = vi.fn();
  renderWithProviders(<Harness onAdded={onAdded} onClose={onClose} />, { mocks });
  return { onAdded, onClose };
};

const searchBox = () => screen.getByRole('combobox', { name: 'Search Club Admins' });
const addButton = () => screen.getByRole('button', { name: 'Add' });

/** Narrow the list to Neha and pick her, as a manager would. */
const pickNeha = async () => {
  fireEvent.change(searchBox(), { target: { value: 'neha' } });
  fireEvent.click(await screen.findByRole('option', { name: /Neha Kapoor/ }, DEBOUNCED));
};

describe('AddClubAdminDialog', () => {
  it('renders nothing, and asks for no one, while closed', () => {
    renderWithProviders(<AddClubAdminDialog open={false} onClose={vi.fn()} onAdded={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('offers only unassigned Club Admins, by name, else email, else id', async () => {
    renderDialog([candidatesMock(null, [NEHA, KIRAN, NAMELESS])]);

    expect(screen.getByRole('dialog', { name: 'Add Club Admin' })).toBeInTheDocument();
    expect(screen.getByText('Only Club Admins who are not already in a region are offered.')).toBeInTheDocument();
    // The list is still on its way.
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(addButton()).toBeDisabled();

    fireEvent.mouseDown(searchBox());
    const neha = await screen.findByRole('option', { name: /Neha Kapoor/ });
    expect(neha).toHaveTextContent('neha.kapoor@duncit.com');
    expect(screen.getAllByText('kiran.s@duncit.com')).toHaveLength(2);
    expect(screen.getByRole('option', { name: 'u-admin-7c1f' })).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('searches the server with what was typed, not the list it already has', async () => {
    renderDialog([candidatesMock(null, [NEHA, KIRAN]), candidatesMock('kiran', [KIRAN])]);
    fireEvent.change(searchBox(), { target: { value: '  kiran ' } });

    // Only the server's answer for "kiran" drops Neha while keeping Kiran listed.
    await waitFor(() => {
      expect(screen.queryByRole('option', { name: /Neha Kapoor/ })).not.toBeInTheDocument();
      expect(screen.getByRole('option', { name: /kiran\.s@duncit\.com/ })).toBeInTheDocument();
    }, DEBOUNCED);
  });

  it('says so when nobody matches', async () => {
    renderDialog([candidatesMock(null, [NEHA]), candidatesMock('zoya', [])]);
    fireEvent.change(searchBox(), { target: { value: 'zoya' } });
    expect(await screen.findByText('No Club Admin matches that search.', {}, DEBOUNCED)).toBeInTheDocument();
  });

  it('adds the chosen Club Admin, tells the page, and closes', async () => {
    const { onAdded, onClose } = renderDialog([
      candidatesMock(null, [NEHA, KIRAN]),
      candidatesMock('neha', [NEHA]),
      addMock,
    ]);
    await pickNeha();

    expect(searchBox()).toHaveValue('Neha Kapoor');
    fireEvent.click(addButton());

    await waitFor(() => expect(onAdded).toHaveBeenCalledTimes(1));
    expect(onClose).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('keeps the dialog open with the server’s reason when the add is refused', async () => {
    const { onAdded, onClose } = renderDialog([
      candidatesMock(null, [NEHA]),
      candidatesMock('neha', [NEHA]),
      candidatesMock('Neha Kapoor', [NEHA]),
      addRefused,
    ]);
    await pickNeha();
    fireEvent.click(addButton());

    expect(await screen.findByRole('alert')).toHaveTextContent('That Club Admin already belongs to a region.');
    expect(onAdded).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes without adding anyone on Cancel', async () => {
    const { onAdded, onClose } = renderDialog([candidatesMock(null, [NEHA])]);
    fireEvent.click(screen.getByRole('button', { name: 'shell.common.cancel' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onAdded).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
