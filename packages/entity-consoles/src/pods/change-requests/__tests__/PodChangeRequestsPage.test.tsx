import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import type { MutableRefObject } from 'react';
import type { PodChangeRole, PodChangeRow } from '@duncit/utils';
import { renderWithProviders } from '../../../../__tests__/testkit';
import PodChangeRequestsPage from '../PodChangeRequestsPage';
import { makeRequest } from './fixtures';

const probe = vi.hoisted(() => ({
  table: null as null | {
    role: PodChangeRole;
    onAssign: (row: PodChangeRow) => void;
    onCancelPod: (row: PodChangeRow) => void;
    refetchRef: MutableRefObject<(() => void) | null>;
  },
  drawer: null as null | {
    request: PodChangeRow | null;
    onClose: () => void;
    onOffered: (message: string) => void;
  },
  dialog: null as null | {
    request: PodChangeRow | null;
    onClose: () => void;
    onCancelled: (message: string) => void;
  },
}));

vi.mock('../ChangeRequestTable', () => ({
  default: (props: NonNullable<typeof probe.table>) => {
    probe.table = props;
    return <div data-testid="table">{props.role}</div>;
  },
}));
vi.mock('../AssignDrawer', () => ({
  default: (props: NonNullable<typeof probe.drawer>) => {
    probe.drawer = props;
    return <div data-testid="drawer">{props.request?.change_request_no ?? 'closed'}</div>;
  },
}));
vi.mock('../CancelPodDialog', () => ({
  default: (props: NonNullable<typeof probe.dialog>) => {
    probe.dialog = props;
    return <div data-testid="cancel">{props.request?.change_request_no ?? 'closed'}</div>;
  },
}));

const mount = (entry = '/pods/change-requests') => renderWithProviders(<PodChangeRequestsPage />, { initialEntries: [entry] });

describe('PodChangeRequestsPage', () => {
  beforeEach(() => {
    probe.table = null;
    probe.drawer = null;
    probe.dialog = null;
  });

  it('opens on the venue queue', () => {
    mount();
    expect(screen.getByTestId('table')).toHaveTextContent('VENUE');
    expect(screen.getByText('Venue').closest('[role="tab"]')).toHaveAttribute('aria-selected', 'true');
  });

  it('switches the queue by role as the admin changes tab', async () => {
    mount();
    fireEvent.click(screen.getByRole('tab', { name: 'Host' }));
    await waitFor(() => expect(screen.getByTestId('table')).toHaveTextContent('HOST'));
    fireEvent.click(screen.getByRole('tab', { name: 'Club Admin' }));
    await waitFor(() => expect(screen.getByTestId('table')).toHaveTextContent('CLUB_ADMIN'));
  });

  it('hands the chosen row to the assign drawer and closes it again', () => {
    mount();
    expect(screen.getByTestId('drawer')).toHaveTextContent('closed');

    act(() => probe.table?.onAssign(makeRequest({ change_request_no: 'DUN-CR-7' })));
    expect(screen.getByTestId('drawer')).toHaveTextContent('DUN-CR-7');

    act(() => probe.drawer?.onClose());
    expect(screen.getByTestId('drawer')).toHaveTextContent('closed');
  });

  it('hands the chosen row to the cancel dialog and closes it again', () => {
    mount();
    act(() => probe.table?.onCancelPod(makeRequest({ change_request_no: 'DUN-CR-9' })));
    expect(screen.getByTestId('cancel')).toHaveTextContent('DUN-CR-9');

    act(() => probe.dialog?.onClose());
    expect(screen.getByTestId('cancel')).toHaveTextContent('closed');
  });

  it('announces an offer and reloads the queue through the handle the table gave it', async () => {
    mount();
    const reload = vi.fn();
    probe.table!.refetchRef.current = reload;

    act(() => probe.drawer?.onOffered('Offer sent to Dialogues Cafe'));

    expect(await screen.findByText('Offer sent to Dialogues Cafe')).toBeInTheDocument();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('announces a cancellation too, and survives a table that has not mounted its handle', async () => {
    mount();
    probe.table!.refetchRef.current = null;

    act(() => probe.dialog?.onCancelled('Pod cancelled'));
    expect(await screen.findByText('Pod cancelled')).toBeInTheDocument();
  });

  it('lets the announcement go away on its own after a few seconds', () => {
    vi.useFakeTimers();
    try {
      mount();
      act(() => probe.drawer?.onOffered('Offer sent'));
      expect(screen.getByText('Offer sent')).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(4000);
      });
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(screen.queryByText('Offer sent')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});
