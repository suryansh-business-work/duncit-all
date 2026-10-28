import { screen, waitFor } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SignInDialog } from '../../../components/auth/SignInDialog';
import { LITE_SUBSCRIBE_CALENDAR, LITE_UNSUBSCRIBE_CALENDAR } from '../../../graphql/calendars';
import { FollowButton } from '../../../pages/discover/FollowButton';
import { calendarFixture, captureNotifications, meFixture, renderWithProviders } from '../../test-utils';

const subscribed = vi.fn(() => ({ data: { liteSubscribeCalendar: calendarFixture({ viewer_subscribed: true }) } }));
const unsubscribed = vi.fn(() => ({ data: { liteUnsubscribeCalendar: calendarFixture({ viewer_subscribed: false }) } }));

const subscribeMock: MockedResponse = { request: { query: LITE_SUBSCRIBE_CALENDAR, variables: { id: 'cal-1' } }, result: subscribed };
const unsubscribeMock: MockedResponse = { request: { query: LITE_UNSUBSCRIBE_CALENDAR, variables: { id: 'cal-1' } }, result: unsubscribed };

const renderFollow = (following: boolean, options: { signedIn?: boolean; mocks?: MockedResponse[] } = {}) =>
  renderWithProviders(
    <>
      <FollowButton calendar={calendarFixture({ viewer_subscribed: following })} />
      <SignInDialog />
    </>,
    { me: options.signedIn === false ? null : meFixture(), mocks: options.mocks ?? [subscribeMock, unsubscribeMock] },
  );

describe('FollowButton', () => {
  let notifications: ReturnType<typeof captureNotifications>;
  beforeEach(() => {
    subscribed.mockClear();
    unsubscribed.mockClear();
    notifications = captureNotifications();
  });
  afterEach(() => notifications.stop());

  it('reads Follow, unpressed, and names the calendar for a screen reader', () => {
    renderFollow(false);
    const button = screen.getByRole('button', { name: 'Follow Run Club', pressed: false });
    expect(button).toHaveTextContent('Follow');
  });

  it('reads Following, pressed, once the reader follows', () => {
    renderFollow(true);
    const button = screen.getByRole('button', { name: 'Following Run Club', pressed: true });
    expect(button).toHaveTextContent('Following');
  });

  it('subscribes a signed-in reader who is not following yet', async () => {
    const { user } = renderFollow(false);
    await user.click(screen.getByRole('button', { name: 'Follow Run Club' }));
    await waitFor(() => expect(subscribed).toHaveBeenCalledTimes(1));
    expect(unsubscribed).not.toHaveBeenCalled();
    expect(notifications.seen).toEqual([]);
  });

  it('unsubscribes a reader who already follows', async () => {
    const { user } = renderFollow(true);
    await user.click(screen.getByRole('button', { name: 'Following Run Club' }));
    await waitFor(() => expect(unsubscribed).toHaveBeenCalledTimes(1));
    expect(subscribed).not.toHaveBeenCalled();
  });

  it('asks a visitor to sign in first, and follows nothing when they close the dialog', async () => {
    const { user } = renderFollow(false, { signedIn: false });
    await user.click(screen.getByRole('button', { name: 'Follow Run Club' }));
    expect(await screen.findByRole('dialog', { name: 'Sign in' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Close sign-in' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(subscribed).not.toHaveBeenCalled();
  });

  it('tells the reader when the API refuses', async () => {
    const refused: MockedResponse = { request: { query: LITE_SUBSCRIBE_CALENDAR, variables: { id: 'cal-1' } }, result: { errors: [{ message: 'This calendar is private' }] } };
    const { user } = renderFollow(false, { mocks: [refused] });
    await user.click(screen.getByRole('button', { name: 'Follow Run Club' }));
    await waitFor(() => expect(notifications.seen).toContainEqual({ message: 'This calendar is private', severity: 'error' }));
  });
});
