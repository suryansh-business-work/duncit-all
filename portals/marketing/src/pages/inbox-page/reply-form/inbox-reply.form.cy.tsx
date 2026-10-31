import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../../../__tests__/testkit';
import { blankInboxReplyValues, inboxReplySchema, InboxReplyForm } from '.';

const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
  options?.vars ? `${key}:${JSON.stringify(options.vars)}` : key;

const messages = (result: ReturnType<ReturnType<typeof inboxReplySchema>['safeParse']>) =>
  result.success ? '' : result.error.issues.map((issue) => issue.message).join(' ');

describe('inboxReplySchema', () => {
  const schema = inboxReplySchema(t, 5);

  it('refuses a blank reply and one longer than the network takes', () => {
    expect(messages(schema.safeParse(blankInboxReplyValues()))).toBe('marketing.inbox.replyRequired');
    expect(messages(schema.safeParse({ text: '   ' }))).toBe('marketing.inbox.replyRequired');
    expect(messages(schema.safeParse({ text: '123456' }))).toBe('marketing.inbox.replyTooLong:{"max":5}');
  });

  it('takes a reply that fits, trimmed', () => {
    expect(schema.safeParse({ text: ' hi ' })).toEqual({ success: true, data: { text: 'hi' } });
    expect(schema.safeParse({ text: '12345' }).success).toBe(true);
  });
});

describe('InboxReplyForm', () => {
  const renderForm = (onSend = vi.fn(async () => true)) => {
    renderWithProviders(<InboxReplyForm max={5} blockedReason={null} busy={false} suggesting={false} onSuggest={vi.fn(async () => null)} onSend={onSend} />);
    return onSend;
  };

  it('says what is wrong instead of sending', async () => {
    const onSend = renderForm();
    fireEvent.click(screen.getByTestId('inbox-send'));
    expect(await screen.findByText('Write the reply first.')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: 'Reply' }), { target: { value: 'too long' } });
    expect(await screen.findByText('A reply here is at most 5 characters.')).toBeInTheDocument();
    expect(onSend).not.toHaveBeenCalled();
  });

  it('sends the trimmed reply', async () => {
    const onSend = renderForm();
    fireEvent.change(screen.getByRole('textbox', { name: 'Reply' }), { target: { value: ' ok ' } });
    fireEvent.click(screen.getByTestId('inbox-send'));
    await waitFor(() => expect(onSend).toHaveBeenCalledWith('ok'));
  });
});
