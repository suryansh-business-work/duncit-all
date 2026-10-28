import type { MockedResponse } from '@apollo/client/testing';
import { screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LiteCalendar } from '../../../../shared/graphql/documents';
import { useSignInPrompt } from '../../../app/providers/SignInPromptProvider';
import { LITE_SUBSCRIBE_CALENDAR, LITE_UNSUBSCRIBE_CALENDAR } from '../../../graphql/calendars';
import { CalendarHeader } from '../../../pages/calendar/CalendarHeader';
import { calendarFixture, captureNotifications, meFixture, renderWithProviders, type RenderOptions } from '../../test-utils';

/** Whether the app-wide sign-in dialog has been asked for. */
function PromptState() {
  const { dialogOpen } = useSignInPrompt();
  return <output data-testid="sign-in-prompt">{dialogOpen ? 'open' : 'closed'}</output>;
}

function renderHeader(calendar: LiteCalendar, options: RenderOptions = {}) {
  const onChanged = vi.fn();
  const utils = renderWithProviders(
    <>
      <CalendarHeader calendar={calendar} onChanged={onChanged} />
      <PromptState />
    </>,
    options,
  );
  return { ...utils, onChanged };
}

const subscribeMock = (result: MockedResponse['result']): MockedResponse => ({ request: { query: LITE_SUBSCRIBE_CALENDAR, variables: { id: 'cal-1' } }, result });
const unsubscribeMock = (result: MockedResponse['result']): MockedResponse => ({ request: { query: LITE_UNSUBSCRIBE_CALENDAR, variables: { id: 'cal-1' } }, result });

let toasts: ReturnType<typeof captureNotifications>;

beforeEach(() => {
  toasts = captureNotifications();
});

afterEach(() => {
  toasts.stop();
});

describe('CalendarHeader', () => {
  it('names the calendar, its owner, its followers and its city', () => {
    renderHeader(calendarFixture({ subscriber_count: 12, city_name: 'Delhi' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Run Club' })).toBeInTheDocument();
    const owner = screen.getByRole('link', { name: 'Asha Rao' });
    expect(owner).toHaveAttribute('href', '/u/asha');
    expect(owner.parentElement).toHaveTextContent(/^By Asha Rao · 12 subscribers · Delhi$/);
  });

  it('leaves the city out when the calendar has none', () => {
    renderHeader(calendarFixture({ subscriber_count: 1 }));
    expect(screen.getByRole('link', { name: 'Asha Rao' }).parentElement).toHaveTextContent(/^By Asha Rao · 1 subscriber$/);
  });

  it('shows the cover and the description as paragraphs', () => {
    renderHeader(calendarFixture({ cover_url: 'https://cdn.example/cover.jpg', description: 'Saturday 6am runs.\n\nAll paces welcome.' }));
    expect(screen.getByText('Saturday 6am runs.').tagName).toBe('P');
    expect(screen.getByText('All paces welcome.').tagName).toBe('P');
    expect(screen.getByTestId('calendar-header').querySelector('img[src="https://cdn.example/cover.jpg"]')).not.toBeNull();
  });

  it('offers the feed as a webcal subscription for calendar apps', () => {
    renderHeader(calendarFixture());
    expect(screen.getByRole('link', { name: 'Subscribe in your calendar app' }).getAttribute('href')).toMatch(/^webcal:\/\/.+\/ics\/cal\/run-club\.ics$/);
  });

  it('gives the owner Edit instead of Subscribe', () => {
    renderHeader(calendarFixture({ viewer_is_owner: true }), { me: meFixture() });
    expect(screen.getByRole('link', { name: 'Edit' })).toHaveAttribute('href', '/calendars/cal-1/edit');
    expect(screen.queryByRole('button', { name: 'Subscribe' })).not.toBeInTheDocument();
  });

  it('asks a visitor to sign in before subscribing, and changes nothing yet', async () => {
    const { user, onChanged } = renderHeader(calendarFixture());
    expect(screen.getByTestId('sign-in-prompt')).toHaveTextContent('closed');
    await user.click(screen.getByRole('button', { name: 'Subscribe' }));
    expect(screen.getByTestId('sign-in-prompt')).toHaveTextContent('open');
    expect(onChanged).not.toHaveBeenCalled();
    expect(toasts.seen).toEqual([]);
  });

  it('subscribes a signed-in reader', async () => {
    const { user, onChanged } = renderHeader(calendarFixture(), {
      me: meFixture(),
      mocks: [subscribeMock({ data: { liteSubscribeCalendar: calendarFixture({ viewer_subscribed: true, subscriber_count: 1 }) } })],
    });
    await user.click(screen.getByRole('button', { name: 'Subscribe' }));
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
    expect(toasts.seen).toContainEqual({ message: 'Subscribed. New events will reach you by email.', severity: 'success' });
  });

  it('unsubscribes a subscribed reader', async () => {
    const { user, onChanged } = renderHeader(calendarFixture({ viewer_subscribed: true, subscriber_count: 3 }), {
      me: meFixture(),
      mocks: [unsubscribeMock({ data: { liteUnsubscribeCalendar: calendarFixture({ viewer_subscribed: false, subscriber_count: 2 }) } })],
    });
    await user.click(screen.getByRole('button', { name: 'Unsubscribe' }));
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
    expect(toasts.seen).toContainEqual({ message: 'Unsubscribed.', severity: 'success' });
  });

  it('shows the API’s reason and keeps the page as it was when subscribing fails', async () => {
    const { user, onChanged } = renderHeader(calendarFixture(), {
      me: meFixture(),
      mocks: [subscribeMock({ errors: [{ message: 'You cannot follow your own calendar' }] })],
    });
    await user.click(screen.getByRole('button', { name: 'Subscribe' }));
    await waitFor(() => expect(toasts.seen).toContainEqual({ message: 'You cannot follow your own calendar', severity: 'error' }));
    expect(onChanged).not.toHaveBeenCalled();
  });
});
