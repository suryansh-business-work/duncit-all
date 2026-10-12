import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import { DELETE_COUPON } from '@duncit/coupons';
import { renderWithProviders } from '../../../../__tests__/testkit';
import PodCouponsSection from '../PodCouponsSection';

const harness = vi.hoisted(() => ({
  refetch: vi.fn(),
  fetchOptions: null as unknown,
  fetchDeps: null as unknown,
  dialog: null as null | {
    open: boolean;
    initial: unknown;
    lockedPod: unknown;
    pods: unknown;
  },
}));

vi.mock('@duncit/table', () => ({
  useApolloTableFetch: (
    _client: unknown,
    _document: unknown,
    resultKey: string,
    options: unknown,
    deps: unknown,
  ) => {
    harness.fetchOptions = { resultKey, options };
    harness.fetchDeps = deps;
    return async () => ({ rows: [], total: 0 });
  },
}));

const POD_COUPON = { id: 'cp1', code: 'POD50', scope: 'POD' };
const GLOBAL_COUPON = { id: 'cp2', code: 'ALL10', scope: 'GLOBAL' };

// The table and dialog belong to @duncit/coupons and have their own suites; here
// they are a row, its two actions, and the props the page gives the dialog.
vi.mock('@duncit/coupons', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    CouponsTable: (props: {
      tableId: string;
      refetchRef: { current: (() => void) | null };
      onEdit: (c: unknown) => void;
      onDelete: (c: unknown) => void;
    }) => {
      props.refetchRef.current = harness.refetch;
      return (
        <div data-testid={props.tableId}>
          <button type="button" onClick={() => props.onEdit(POD_COUPON)}>
            edit-pod-coupon
          </button>
          <button type="button" onClick={() => props.onEdit(GLOBAL_COUPON)}>
            edit-global-coupon
          </button>
          <button type="button" onClick={() => props.onDelete(POD_COUPON)}>
            delete-coupon
          </button>
        </div>
      );
    },
    CouponFormDialog: (props: {
      open: boolean;
      initial: unknown;
      lockedPod: unknown;
      pods: unknown;
      onSaved: () => void;
      onClose: () => void;
    }) => {
      harness.dialog = {
        open: props.open,
        initial: props.initial,
        lockedPod: props.lockedPod,
        pods: props.pods,
      };
      return (
        <div data-testid="coupon-dialog" data-open={String(props.open)}>
          <button type="button" onClick={props.onSaved}>
            dialog-saved
          </button>
          <button type="button" onClick={props.onClose}>
            dialog-close
          </button>
        </div>
      );
    },
  };
});

const renderSection = (mocks: MockedResponse[] = []) =>
  renderWithProviders(<PodCouponsSection podId="pod-1" podTitle="Sunrise Yoga" />, { mocks });

beforeEach(() => {
  harness.refetch.mockReset();
  harness.dialog = null;
});

describe('PodCouponsSection', () => {
  it('lists the coupons of this pod through the coupons-for-pod table', () => {
    renderSection();

    expect(screen.getByTestId('admin-pod-coupons')).toBeInTheDocument();
    expect(harness.fetchOptions).toEqual({
      resultKey: 'couponsForPodTable',
      options: { extraVariables: { pod_id: 'pod-1' } },
    });
    expect(harness.fetchDeps).toEqual(['pod-1']);
  });

  it('opens a blank offer-code form locked to this pod from New offer code', () => {
    renderSection();
    expect(screen.getByTestId('coupon-dialog')).toHaveAttribute('data-open', 'false');

    fireEvent.click(screen.getByRole('button', { name: 'New offer code' }));

    expect(screen.getByTestId('coupon-dialog')).toHaveAttribute('data-open', 'true');
    expect(harness.dialog).toMatchObject({
      initial: null,
      lockedPod: { id: 'pod-1', title: 'Sunrise Yoga' },
    });
  });

  it('opens a pod-scoped coupon for editing, still locked to this pod', () => {
    renderSection();
    fireEvent.click(screen.getByText('edit-pod-coupon'));

    expect(harness.dialog).toMatchObject({
      open: true,
      initial: POD_COUPON,
      lockedPod: { id: 'pod-1', title: 'Sunrise Yoga' },
    });
  });

  it('opens a global coupon with no pod lock, so it is not re-scoped to this pod', () => {
    renderSection();
    fireEvent.click(screen.getByText('edit-global-coupon'));

    expect(harness.dialog).toMatchObject({ open: true, initial: GLOBAL_COUPON, lockedPod: null });
  });

  it('closes the form without saving', () => {
    renderSection();
    fireEvent.click(screen.getByRole('button', { name: 'New offer code' }));
    fireEvent.click(screen.getByText('dialog-close'));

    expect(screen.getByTestId('coupon-dialog')).toHaveAttribute('data-open', 'false');
    expect(harness.refetch).not.toHaveBeenCalled();
  });

  it('says a coupon was created, or updated, and reloads the table', async () => {
    renderSection();
    fireEvent.click(screen.getByRole('button', { name: 'New offer code' }));
    fireEvent.click(screen.getByText('dialog-saved'));
    expect(await screen.findByText('Coupon created')).toBeInTheDocument();
    expect(harness.refetch).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('edit-pod-coupon'));
    fireEvent.click(screen.getByText('dialog-saved'));
    expect(await screen.findByText('Coupon updated')).toBeInTheDocument();
    expect(harness.refetch).toHaveBeenCalledTimes(2);
  });

  it('asks for confirmation naming the code, then deletes and reloads', async () => {
    renderSection([
      {
        request: { query: DELETE_COUPON, variables: { id: 'cp1' } },
        result: { data: { deleteCoupon: true } },
      },
    ]);
    fireEvent.click(screen.getByText('delete-coupon'));
    expect(await screen.findByText('Delete coupon "POD50"?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^(Confirm|Delete|OK)$/ }));

    expect(await screen.findByText('Coupon deleted')).toBeInTheDocument();
    expect(harness.refetch).toHaveBeenCalledTimes(1);
  });

  it('deletes nothing when the confirmation is dismissed', async () => {
    renderSection();
    fireEvent.click(screen.getByText('delete-coupon'));
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByText('Delete coupon "POD50"?')).not.toBeInTheDocument());
    expect(harness.refetch).not.toHaveBeenCalled();
    expect(screen.queryByText('Coupon deleted')).not.toBeInTheDocument();
  });

  it('shows the server message when the delete fails', async () => {
    renderSection([
      {
        request: { query: DELETE_COUPON, variables: { id: 'cp1' } },
        result: { errors: [new GraphQLError('Coupon already redeemed')] },
      },
    ]);
    fireEvent.click(screen.getByText('delete-coupon'));
    await screen.findByText('Delete coupon "POD50"?');
    fireEvent.click(screen.getByRole('button', { name: /^(Confirm|Delete|OK)$/ }));

    expect(await screen.findByText('Coupon already redeemed')).toBeInTheDocument();
    expect(harness.refetch).not.toHaveBeenCalled();
  });
});
