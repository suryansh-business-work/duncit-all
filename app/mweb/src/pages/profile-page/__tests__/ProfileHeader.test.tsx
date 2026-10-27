import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import ProfileHeader from '../ProfileHeader';

const h = vi.hoisted(() => ({ share: vi.fn() }));

vi.mock('../../../utils/share', () => ({ shareProfile: h.share }));
vi.mock('../../../components/profile-avatar', () => ({
  default: (p: { name: string; photo?: string | null; onChanged?: () => void }) => (
    <div data-testid="avatar" data-name={p.name} data-photo={p.photo ?? ''}>
      <button data-testid="avatar-changed" onClick={p.onChanged} />
    </div>
  ),
}));
vi.mock('../ProfileHandleLink', () => ({
  default: (p: { username: string | null; fallback: string }) => (
    <div data-testid="handle" data-username={p.username ?? ''} data-fallback={p.fallback} />
  ),
}));
vi.mock('../../../components/FollowListDialog', () => ({
  default: (p: { open: boolean; userId: string; initialTab: string; viewerId: string; onClose: () => void }) => (
    <div data-testid="follow-dialog" data-open={String(p.open)} data-tab={p.initialTab} data-user={p.userId} data-viewer={p.viewerId}>
      <button data-testid="follow-close" onClick={p.onClose} />
    </div>
  ),
}));

const me = (over: object = {}) => ({
  user_id: 'u1',
  full_name: 'Asha Rao',
  first_name: 'Asha',
  last_name: 'Rao',
  username: 'asha',
  email: 'a@x.com',
  bio: 'Runner',
  profile_photo: 'https://img/a.png',
  is_email_verified: true,
  followers_count: 12,
  following_count: 3,
  ...over,
});
const header = (m: object, props: { onChanged?: () => void } = {}) => {
  const spies = { onNewPost: vi.fn(), onSettings: vi.fn() };
  render(<ProfileHeader me={m} postsCount={5} {...spies} {...props} />);
  return spies;
};

beforeEach(() => vi.clearAllMocks());

describe('ProfileHeader', () => {
  it('shows the name with a verified tick, the bio, handle, photo and stats', () => {
    header(me());
    expect(screen.getByTestId('profile-header-name')).toHaveTextContent('Asha Rao');
    expect(screen.getByTitle('Email verified')).toBeInTheDocument();
    expect(screen.getByText('Runner')).toBeInTheDocument();
    expect(screen.getByTestId('handle')).toHaveAttribute('data-username', 'asha');
    expect(screen.getByTestId('handle')).toHaveAttribute('data-fallback', 'a@x.com');
    expect(screen.getByTestId('avatar')).toHaveAttribute('data-photo', 'https://img/a.png');
    expect(screen.getByTestId('profile-header-stat-posts')).toHaveTextContent('5');
    expect(screen.getByTestId('profile-header-stat-followers')).toHaveTextContent('12');
    expect(screen.getByTestId('profile-header-stat-following')).toHaveTextContent('3');
  });

  it('joins first and last name when there is no full name, and shows no tick or bio when absent', () => {
    header(me({ full_name: '', is_email_verified: false, bio: null }));
    expect(screen.getByTestId('profile-header-name')).toHaveTextContent('Asha Rao');
    expect(screen.queryByTitle('Email verified')).not.toBeInTheDocument();
    expect(screen.queryByText('Runner')).not.toBeInTheDocument();
  });

  it('falls back to the user id handle when there is no email and no username', () => {
    header(me({ username: undefined, email: undefined }));
    expect(screen.getByTestId('handle')).toHaveAttribute('data-username', '');
    expect(screen.getByTestId('handle')).toHaveAttribute('data-fallback', '@u1');
  });

  it('counts missing follow numbers as zero and shortens thousands', () => {
    header(me({ followers_count: 12500, following_count: undefined }));
    expect(screen.getByTestId('profile-header-stat-following')).toHaveTextContent('0');
    expect(screen.getByTestId('profile-header-stat-followers')).toHaveTextContent(new Intl.NumberFormat(undefined, { notation: 'compact' }).format(12500));
    expect(screen.getByTestId('profile-header-stat-followers')).not.toHaveTextContent('12500');
    expect(screen.getByTestId('profile-header-stat-followers')).not.toHaveTextContent('12,500');
  });

  it('counts a missing followers number as zero too', () => {
    header(me({ followers_count: undefined }));
    expect(screen.getByTestId('profile-header-stat-followers')).toHaveTextContent('0');
  });

  it('opens the followers and following lists for this member, and closes them', () => {
    header(me());
    expect(screen.getByTestId('follow-dialog')).toHaveAttribute('data-open', 'false');
    expect(screen.getByTestId('follow-dialog')).toHaveAttribute('data-tab', 'followers');
    fireEvent.click(screen.getByTestId('profile-header-stat-following'));
    expect(screen.getByTestId('follow-dialog')).toHaveAttribute('data-open', 'true');
    expect(screen.getByTestId('follow-dialog')).toHaveAttribute('data-tab', 'following');
    expect(screen.getByTestId('follow-dialog')).toHaveAttribute('data-user', 'u1');
    expect(screen.getByTestId('follow-dialog')).toHaveAttribute('data-viewer', 'u1');
    fireEvent.click(screen.getByTestId('follow-close'));
    expect(screen.getByTestId('follow-dialog')).toHaveAttribute('data-open', 'false');
    fireEvent.click(screen.getByTestId('profile-header-stat-followers'));
    expect(screen.getByTestId('follow-dialog')).toHaveAttribute('data-tab', 'followers');
  });

  it('wires the new post, edit, settings and share actions', () => {
    const { onNewPost, onSettings } = header(me());
    fireEvent.click(screen.getByTestId('profile-header-new-post'));
    fireEvent.click(screen.getByTestId('profile-header-edit'));
    fireEvent.click(screen.getByTestId('profile-header-settings'));
    expect(onNewPost).toHaveBeenCalledTimes(1);
    expect(onSettings).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByTestId('profile-header-share'));
    expect(h.share).toHaveBeenCalledWith('u1', 'Asha Rao', 'asha');
  });

  it('tells the page when the avatar changes, when it asked to know', () => {
    const onChanged = vi.fn();
    header(me(), { onChanged });
    fireEvent.click(screen.getByTestId('avatar-changed'));
    expect(onChanged).toHaveBeenCalledTimes(1);
  });
});
