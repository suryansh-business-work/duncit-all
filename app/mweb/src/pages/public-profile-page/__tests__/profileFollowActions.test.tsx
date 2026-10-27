import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import ProfileFollowActions from '../ProfileFollowActions';
import { fallbackT } from '../../../i18n/fallback';
import { ANSWER_FOLLOW_REQUEST, CANCEL_FOLLOW_REQUEST, FOLLOW_USER, REJECT_FOLLOW_REQUEST, UNFOLLOW_USER } from '../../hosts-venues-page/queries';

const h = vi.hoisted(() => ({ useMutation: vi.fn() }));
vi.mock('@apollo/client/react', async (orig) => ({ ...(await orig<object>()), useMutation: h.useMutation }));
vi.mock('../../../components/FollowButton', () => ({
  default: (p: { status: string; followsViewer?: boolean | null; loading?: boolean; disabled?: boolean; onToggle: () => void }) => (
    <button data-testid="follow" data-status={p.status} data-follows-viewer={String(p.followsViewer)} data-loading={String(Boolean(p.loading))} disabled={p.disabled} onClick={p.onToggle} />
  ),
}));

const fns = () => ({
  follow: vi.fn().mockResolvedValue({}),
  unfollow: vi.fn().mockResolvedValue({}),
  cancel: vi.fn().mockResolvedValue({}),
  accept: vi.fn().mockResolvedValue({}),
  reject: vi.fn().mockResolvedValue({}),
});

const mount = (profile: object, overrides: Partial<ReturnType<typeof fns>> = {}, onChanged = vi.fn().mockResolvedValue(undefined)) => {
  const f = { ...fns(), ...overrides };
  const byDoc = new Map<unknown, unknown>([
    [FOLLOW_USER, f.follow],
    [UNFOLLOW_USER, f.unfollow],
    [CANCEL_FOLLOW_REQUEST, f.cancel],
    [ANSWER_FOLLOW_REQUEST, f.accept],
    [REJECT_FOLLOW_REQUEST, f.reject],
  ]);
  h.useMutation.mockImplementation((doc: unknown) => [byDoc.get(doc)]);
  render(<ProfileFollowActions profile={{ user_id: 'u1', follow_status: 'NONE', follows_viewer: false, ...profile } as never} onChanged={onChanged} />);
  return { ...f, onChanged };
};

beforeEach(() => vi.clearAllMocks());

describe('ProfileFollowActions', () => {
  it('follows a stranger and re-reads the profile', async () => {
    const m = mount({});
    expect(screen.getByTestId('follow')).toHaveAttribute('data-status', 'NONE');
    fireEvent.click(screen.getByTestId('follow'));
    await waitFor(() => expect(m.follow).toHaveBeenCalledWith({ variables: { user_id: 'u1' } }));
    await waitFor(() => expect(m.onChanged).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId('profile-follow-actions-inbound')).not.toBeInTheDocument();
  });

  it('unfollows someone followed, and withdraws a pending request', async () => {
    const first = mount({ follow_status: 'FOLLOWING' });
    fireEvent.click(screen.getByTestId('follow'));
    await waitFor(() => expect(first.unfollow).toHaveBeenCalledWith({ variables: { user_id: 'u1' } }));
  });

  it('withdraws a pending request', async () => {
    const m = mount({ follow_status: 'REQUESTED', follows_viewer: true });
    expect(screen.getByTestId('follow')).toHaveAttribute('data-follows-viewer', 'true');
    fireEvent.click(screen.getByTestId('follow'));
    await waitFor(() => expect(m.cancel).toHaveBeenCalledWith({ variables: { user_id: 'u1' } }));
  });

  it('offers Accept and Deny for an open inbound ask, answering the same request', async () => {
    const m = mount({ inbound_request_id: 'req1' });
    expect(screen.getByTestId('profile-follow-actions-inbound')).toHaveTextContent(fallbackT('mweb.follow.wantsToFollowYou'));
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.follow.accept') }));
    await waitFor(() => expect(m.accept).toHaveBeenCalledWith({ variables: { request_id: 'req1' } }));
    await waitFor(() => expect(m.onChanged).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.follow.reject') }));
    await waitFor(() => expect(m.reject).toHaveBeenCalledWith({ variables: { request_id: 'req1' } }));
  });

  it('keeps going when an action fails, leaving the button on the state the server still reports', async () => {
    const m = mount({}, { follow: vi.fn().mockRejectedValue(new Error('offline')) });
    fireEvent.click(screen.getByTestId('follow'));
    await waitFor(() => expect(m.follow).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByTestId('follow')).toBeEnabled());
    expect(m.onChanged).not.toHaveBeenCalled();
  });

  it('survives a failing answer to an inbound ask', async () => {
    const m = mount({ inbound_request_id: 'req1' }, { accept: vi.fn().mockRejectedValue(new Error('gone')) });
    fireEvent.click(screen.getByRole('button', { name: fallbackT('mweb.follow.accept') }));
    await waitFor(() => expect(m.accept).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByTestId('follow')).toBeEnabled());
  });

  it('locks the follow button while an action is in flight', async () => {
    let finish: () => void = () => undefined;
    const m = mount({}, { follow: vi.fn().mockReturnValue(new Promise<void>((resolve) => (finish = resolve))) });
    fireEvent.click(screen.getByTestId('follow'));
    await waitFor(() => expect(screen.getByTestId('follow')).toBeDisabled());
    expect(screen.getByTestId('follow')).toHaveAttribute('data-loading', 'true');
    finish();
    await waitFor(() => expect(screen.getByTestId('follow')).toBeEnabled());
    expect(m.onChanged).toHaveBeenCalled();
  });
});
