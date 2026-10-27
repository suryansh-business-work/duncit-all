import type { MockedResponse } from '@apollo/client/testing';
import { createTranslator } from '@duncit/i18n';
import { screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WEB_FALLBACK } from '../../../../../shared/i18n';
import { LITE_SEND_EVENT_UPDATE } from '../../../../graphql/manage';
import { UpdateForm, UpdatesTab, makeUpdateSchema } from '../../../../pages/manage/updates';
import { captureNotifications, renderWithProviders, statsFixture, typed } from '../../../test-utils';
import { apiRefusal, hostedEvent } from '../manage-mocks';

const { t } = createTranslator({ locale: 'en-IN', fallback: WEB_FALLBACK });

const sendMock = (result: MockedResponse['result']): MockedResponse => ({
  request: { query: LITE_SEND_EVENT_UPDATE, variables: { event_id: 'ev-1', subject: 'Venue moved', body: 'We are now at Gate 2.' } },
  result,
});

describe('makeUpdateSchema', () => {
  const schema = makeUpdateSchema(t);

  it('needs both a subject and a message', () => {
    const issues = schema.safeParse({ subject: ' ', body: '' }).error?.issues ?? [];
    expect(issues.map((issue) => [issue.path.join('.'), issue.message])).toEqual([
      ['subject', 'This is required'],
      ['body', 'This is required'],
    ]);
  });

  it('caps the subject at 120 and the message at 5000 characters', () => {
    const issues = schema.safeParse({ subject: 's'.repeat(121), body: 'b'.repeat(5001) }).error?.issues ?? [];
    expect(issues.map((issue) => issue.message)).toEqual(['Keep this to 120 characters or fewer', 'Keep this to 5000 characters or fewer']);
  });
});

describe('UpdatesTab', () => {
  it('says how many confirmed guests the email reaches, in the singular for one', () => {
    renderWithProviders(<UpdatesTab event={hostedEvent({ stats: statsFixture({ going: 1 }) })} />);

    expect(screen.getByText('Send an update')).toBeInTheDocument();
    expect(screen.getByText('Emails your 1 confirmed guest.')).toBeInTheDocument();
  });

  it('uses the plural for several guests', () => {
    renderWithProviders(<UpdatesTab event={hostedEvent({ stats: statsFixture({ going: 3 }) })} />);

    expect(screen.getByText('Emails your 3 confirmed guests.')).toBeInTheDocument();
  });
});

describe('UpdateForm', () => {
  let toasts: ReturnType<typeof captureNotifications>;

  beforeEach(() => {
    toasts = captureNotifications();
  });

  afterEach(() => {
    toasts.stop();
  });

  const fill = async (user: ReturnType<typeof renderWithProviders>['user']) => {
    await user.type(screen.getByRole('textbox', { name: 'Subject' }), 'Venue moved');
    await user.type(screen.getByRole('textbox', { name: 'Message' }), 'We are now at Gate 2.');
    await user.click(screen.getByRole('button', { name: 'Send update' }));
  };

  it('asks for a subject and a message before anything is sent', async () => {
    const { user } = renderWithProviders(<UpdateForm eventId="ev-1" goingCount={3} />);

    await user.click(screen.getByRole('button', { name: 'Send update' }));

    expect(await screen.findAllByText('This is required')).toHaveLength(2);
    expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument();
  });

  it('confirms the audience first and sends nothing when the host backs out', async () => {
    const { user } = renderWithProviders(<UpdateForm eventId="ev-1" goingCount={3} />);

    await fill(user);
    const dialog = await screen.findByTestId('confirm-dialog');
    expect(within(dialog).getByText('Send this update?')).toBeInTheDocument();
    expect(within(dialog).getByText('It goes to 3 confirmed guests now.')).toBeInTheDocument();
    await user.click(within(dialog).getByTestId('confirm-dialog-cancel'));

    await vi.waitFor(() => expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument());
    expect(screen.queryByTestId('update-sent')).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Subject' })).toHaveValue('Venue moved');
  });

  it('sends once confirmed, says how many it reached and clears the form', async () => {
    const { user } = renderWithProviders(<UpdateForm eventId="ev-1" goingCount={3} />, {
      mocks: [sendMock({ data: { liteSendEventUpdate: typed('LiteSendResult', { sent: 2 }) } })],
    });

    await fill(user);
    await user.click(within(await screen.findByTestId('confirm-dialog')).getByRole('button', { name: 'Send update' }));

    const sent = await screen.findByTestId('update-sent');
    expect(sent).toHaveTextContent('Sent to 2 guests.');
    expect(sent.closest('[aria-live="polite"]')).not.toBeNull();
    expect(screen.getByRole('textbox', { name: 'Subject' })).toHaveValue('');
    expect(screen.getByRole('textbox', { name: 'Message' })).toHaveValue('');
  });

  it('uses the singular when one guest was reached', async () => {
    const { user } = renderWithProviders(<UpdateForm eventId="ev-1" goingCount={1} />, {
      mocks: [sendMock({ data: { liteSendEventUpdate: typed('LiteSendResult', { sent: 1 }) } })],
    });

    await fill(user);
    await user.click(within(await screen.findByTestId('confirm-dialog')).getByRole('button', { name: 'Send update' }));

    expect(await screen.findByTestId('update-sent')).toHaveTextContent('Sent to 1 guest.');
  });

  it('keeps the message and shows the refusal when sending fails', async () => {
    const { user } = renderWithProviders(<UpdateForm eventId="ev-1" goingCount={3} />, { mocks: [sendMock(apiRefusal('Email is not set up yet'))] });

    await fill(user);
    await user.click(within(await screen.findByTestId('confirm-dialog')).getByRole('button', { name: 'Send update' }));

    await vi.waitFor(() => expect(toasts.seen).toEqual([{ message: 'Email is not set up yet', severity: 'error' }]));
    expect(screen.queryByTestId('update-sent')).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Message' })).toHaveValue('We are now at Gate 2.');
  });
});
