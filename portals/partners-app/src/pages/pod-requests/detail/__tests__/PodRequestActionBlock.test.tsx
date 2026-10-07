import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import PodRequestActionBlock from '../PodRequestActionBlock';
import type { PodRequestDetail } from '../../queries';
import type { PodRequestActions } from '../../usePodRequestActions';
import { renderWithProviders } from '../../../../__tests__/render';
import { scriptedLink } from '../../../../__tests__/groupC-link';
import { requestDetail } from '../../__tests__/fixtures';

afterEach(cleanup);

const actionsStub = (busy: boolean): PodRequestActions => ({
  notice: null,
  clearNotice: vi.fn(),
  busy,
  respond: vi.fn(async () => true),
  withdraw: vi.fn(async () => true),
  sendSlot: vi.fn(async () => true),
  respondSlot: vi.fn(async () => true),
});

const mount = (over: Record<string, unknown>, actions: PodRequestActions) =>
  renderWithProviders(
    <PodRequestActionBlock request={requestDetail(over) as unknown as PodRequestDetail} actions={actions} />,
    { link: scriptedLink({}) },
  );

describe('PodRequestActionBlock', () => {
  it('locks Accept and Decline while another answer is in flight', () => {
    const actions = actionsStub(true);
    mount({}, actions);

    const accept = screen.getByRole('button', { name: 'Accept' }) as HTMLButtonElement;
    expect(accept.disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Decline' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(accept);
    expect(actions.respond).not.toHaveBeenCalled();
  });

  it('locks Withdraw and the slot answers while busy', () => {
    mount({ direction: 'HOST_TO_VENUE' }, actionsStub(true));
    expect((screen.getByRole('button', { name: 'Withdraw' }) as HTMLButtonElement).disabled).toBe(true);
    cleanup();

    mount({ status: 'SLOT_REQUESTED', viewer_side: 'VENUE' }, actionsStub(true));
    expect((screen.getByRole('button', { name: 'Confirm slot' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Decline slot' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('offers no slot picker when the request carries no venue', () => {
    mount({ direction: 'HOST_TO_VENUE', viewer_side: 'VENUE', status: 'ACCEPTED', venue: null }, actionsStub(false));

    expect(screen.queryByRole('heading', { name: 'Pick a slot' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Send Slot Request' })).toBeNull();
  });

  it('hands the answer to the shared actions with this request id', () => {
    const actions = actionsStub(false);
    mount({ id: 'req-42' }, actions);

    fireEvent.click(screen.getByRole('button', { name: 'Decline' }));
    expect(actions.respond).toHaveBeenCalledWith('req-42', false);
  });
});
