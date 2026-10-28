import type { MockedResponse } from '@apollo/client/testing';
import { createTranslator } from '@duncit/i18n';
import { screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SITE_URL } from '../../../../../../shared/env';
import { WEB_FALLBACK } from '../../../../../../shared/i18n';
import { LITE_CHANGE_EVENT_SLUG } from '../../../../../graphql/events';
import { EventLinkForm, makeEventLinkSchema } from '../../../../../pages/manage/settings/event-link-form';
import { captureNotifications, renderWithProviders, settle } from '../../../../test-utils';
import { apiRefusal, hostedEvent } from '../../manage-mocks';

const { t } = createTranslator({ locale: 'en-IN', fallback: WEB_FALLBACK });
const SLUG_RULE = 'Use lowercase letters, numbers and hyphens only';

const changeMock = (slug: string, result: MockedResponse['result']): MockedResponse => ({ request: { query: LITE_CHANGE_EVENT_SLUG, variables: { id: 'ev-1', slug } }, result });

describe('makeEventLinkSchema', () => {
  const schema = makeEventLinkSchema(t);

  it('lower-cases and trims a valid link', () => {
    expect(schema.parse({ slug: '  Summer-Picnic-2026 ' })).toEqual({ slug: 'summer-picnic-2026' });
  });

  it.each([
    ['too short', 'ab'],
    ['too long', 'a'.repeat(81)],
    ['a space', 'summer picnic'],
    ['a double hyphen', 'summer--picnic'],
    ['a leading hyphen', '-summer'],
    ['an underscore', 'summer_picnic'],
  ])('refuses a link with %s', (_case, slug) => {
    expect(schema.safeParse({ slug }).error?.issues[0]?.message).toBe(SLUG_RULE);
  });

  it('accepts the shortest and the longest allowed links', () => {
    expect(schema.safeParse({ slug: 'abc' }).success).toBe(true);
    expect(schema.safeParse({ slug: 'a'.repeat(80) }).success).toBe(true);
  });
});

describe('EventLinkForm', () => {
  let toasts: ReturnType<typeof captureNotifications>;

  beforeEach(() => {
    toasts = captureNotifications();
  });

  afterEach(() => {
    toasts.stop();
  });

  const renderForm = (mocks: MockedResponse[] = []) =>
    renderWithProviders(<EventLinkForm event={hostedEvent()} />, { mocks, path: '/e/:slug/manage', route: '/e/garden-party/manage' });

  it('starts from the current link, shown after the site address', () => {
    renderForm();

    expect(screen.getByRole('textbox', { name: 'Event link' })).toHaveValue('garden-party');
    expect(screen.getByText(`${new URL(SITE_URL).host}/e/`)).toBeInTheDocument();
  });

  it('refuses a malformed link before asking anything', async () => {
    const { user } = renderForm();

    const field = screen.getByRole('textbox', { name: 'Event link' });
    await user.clear(field);
    await user.type(field, 'summer picnic');
    await user.click(screen.getByRole('button', { name: 'Update link' }));

    expect(await screen.findByText(SLUG_RULE)).toBeInTheDocument();
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument();
  });

  it('does nothing when the link is unchanged', async () => {
    const { user, router } = renderForm();

    await user.click(screen.getByRole('button', { name: 'Update link' }));
    await settle();

    expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Event link' })).not.toHaveAttribute('aria-invalid', 'true');
    expect(router.state.location.pathname).toBe('/e/garden-party/manage');
    expect(toasts.seen).toEqual([]);
  });

  it('warns that the old link stops working and keeps it when the host backs out', async () => {
    const { user, router } = renderForm();

    const field = screen.getByRole('textbox', { name: 'Event link' });
    await user.clear(field);
    await user.type(field, 'summer-picnic');
    await user.click(screen.getByRole('button', { name: 'Update link' }));

    const dialog = await screen.findByTestId('confirm-dialog');
    expect(within(dialog).getByText('Change the event link?')).toBeInTheDocument();
    expect(within(dialog).getByText('Anyone with the old link will no longer reach this event.')).toBeInTheDocument();
    await user.click(within(dialog).getByTestId('confirm-dialog-cancel'));

    await vi.waitFor(() => expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument());
    expect(router.state.location.pathname).toBe('/e/garden-party/manage');
    expect(toasts.seen).toEqual([]);
  });

  it('changes the link once confirmed and moves the console to the new address', async () => {
    const { user, router } = renderForm([changeMock('summer-picnic', { data: { liteChangeEventSlug: hostedEvent({ slug: 'summer-picnic' }) } })]);

    const field = screen.getByRole('textbox', { name: 'Event link' });
    await user.clear(field);
    await user.type(field, 'Summer-Picnic');
    await user.click(screen.getByRole('button', { name: 'Update link' }));
    await user.click(within(await screen.findByTestId('confirm-dialog')).getByRole('button', { name: 'Update link' }));

    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/e/summer-picnic/manage'));
    expect(toasts.seen).toEqual([{ message: 'Event link updated.', severity: 'success' }]);
  });

  it('stays put and shows the refusal when the link is taken', async () => {
    const { user, router } = renderForm([changeMock('summer-picnic', apiRefusal('That link is already taken'))]);

    const field = screen.getByRole('textbox', { name: 'Event link' });
    await user.clear(field);
    await user.type(field, 'summer-picnic');
    await user.click(screen.getByRole('button', { name: 'Update link' }));
    await user.click(within(await screen.findByTestId('confirm-dialog')).getByRole('button', { name: 'Update link' }));

    await vi.waitFor(() => expect(toasts.seen).toEqual([{ message: 'That link is already taken', severity: 'error' }]));
    expect(router.state.location.pathname).toBe('/e/garden-party/manage');
  });
});
