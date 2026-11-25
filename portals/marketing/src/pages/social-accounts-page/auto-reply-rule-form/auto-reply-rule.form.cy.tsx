import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '../../../../__tests__/testkit';
import { makeAutoReplyRule, makeSocialAccount } from '../../../../__tests__/mocks';
import { AutoReplyRuleForm, NEW_RULE, autoReplyRuleSchema, messagingAccounts, ruleFormValues, ruleInput, ruleKeywords } from '.';

const t = (key: string, options?: { vars?: Record<string, string | number> }) => (options?.vars ? `${key}:${JSON.stringify(options.vars)}` : key);
const messages = (result: ReturnType<ReturnType<typeof autoReplyRuleSchema>['safeParse']>) =>
  result.success ? '' : result.error.issues.map((issue) => issue.message).join(' | ');
const valid = () => ({ ...NEW_RULE, name: 'Price', keywords: 'price', reply_text: 'From ₹299' });

const ig = makeSocialAccount({ id: 'ig1', provider: 'INSTAGRAM', platform: 'INSTAGRAM', name: 'Duncit IG', handle: '@duncit' });
const fb = makeSocialAccount({ id: 'fb1', provider: 'FACEBOOK', platform: 'FACEBOOK', name: 'Duncit Page', handle: null });
const linkedIn = makeSocialAccount({ id: 'li1' });

describe('auto-reply rule values', () => {
  it('reads keywords trimmed, upper-cased and once each', () => {
    expect(ruleKeywords(' price, Menu card ,price,, ')).toEqual(['PRICE', 'MENU CARD']);
    expect(ruleKeywords('')).toEqual([]);
  });

  it('starts a new rule blank, and turns a saved rule into the form and back', () => {
    expect(ruleFormValues(null)).toEqual(NEW_RULE);
    const values = ruleFormValues(makeAutoReplyRule({ keywords: ['PRICE', 'HOW MUCH'], account_ids: ['ig1'] }));
    expect(values).toMatchObject({ keywords: 'PRICE, HOW MUCH', account_ids: ['ig1'] });
    expect(ruleInput({ ...values, name: '  Price  ', reply_text: ' Hi ' })).toEqual({
      name: 'Price',
      kind: 'KEYWORD',
      keywords: ['PRICE', 'HOW MUCH'],
      reply_text: 'Hi',
      account_ids: ['ig1'],
      trusted: false,
      enabled: true,
    });
    expect(ruleInput({ ...values, kind: 'WELCOME' }).keywords).toEqual([]);
  });

  it('offers only accounts that can message', () => {
    expect(messagingAccounts([ig, fb, linkedIn]).map((account) => account.id)).toEqual(['ig1', 'fb1']);
  });
});

describe('autoReplyRuleSchema', () => {
  const schema = autoReplyRuleSchema(t);

  it('takes a complete rule, and a welcome without keywords', () => {
    expect(schema.safeParse(valid()).success).toBe(true);
    expect(schema.safeParse({ ...valid(), kind: 'WELCOME', keywords: '' }).success).toBe(true);
  });

  it('wants a name and a reply, each within its length', () => {
    expect(messages(schema.safeParse({ ...valid(), name: '  ' }))).toBe('marketing.autoReplies.nameRequired');
    expect(messages(schema.safeParse({ ...valid(), name: 'n'.repeat(81) }))).toBe('marketing.autoReplies.tooLong:{"max":80}');
    expect(messages(schema.safeParse({ ...valid(), reply_text: '' }))).toBe('marketing.autoReplies.replyRequired');
    expect(messages(schema.safeParse({ ...valid(), reply_text: 'r'.repeat(1001) }))).toBe('marketing.autoReplies.tooLong:{"max":1000}');
  });

  it('wants one to twenty keywords of at most forty characters, except for a welcome', () => {
    expect(messages(schema.safeParse({ ...valid(), keywords: ' , ' }))).toBe('marketing.autoReplies.keywordsRequired');
    const many = Array.from({ length: 21 }, (_, i) => `W${i}`).join(',');
    expect(messages(schema.safeParse({ ...valid(), kind: 'FAQ', keywords: many }))).toBe('marketing.socialSettings.tooManyKeywords:{"max":20}');
    expect(messages(schema.safeParse({ ...valid(), kind: 'COMMENT_TO_DM', keywords: 'k'.repeat(41) }))).toBe('marketing.socialSettings.keywordTooLong:{"max":40}');
  });
});

describe('AutoReplyRuleForm', () => {
  const renderForm = (over: Partial<Parameters<typeof AutoReplyRuleForm>[0]> = {}) => {
    const props = { rule: null, accounts: [ig, fb, linkedIn], canEdit: true, onSubmit: vi.fn(async () => undefined), onCancel: vi.fn(), ...over };
    renderWithProviders(<AutoReplyRuleForm {...props} />);
    return props;
  };

  it('saves a new rule as the server takes it, for the accounts picked', async () => {
    const { onSubmit } = renderForm();
    expect(screen.getByText('The whole message is one of the keywords, such as PRICE.')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: /^Name/ }), { target: { value: 'Price' } });
    fireEvent.change(screen.getByRole('textbox', { name: /^Keywords or phrases/ }), { target: { value: 'price, how much' } });
    fireEvent.change(screen.getByRole('textbox', { name: /^Reply/ }), { target: { value: 'Passes start at ₹299.' } });
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /^Accounts/ }));
    const list = within(await screen.findByRole('listbox'));
    expect(list.getAllByRole('option').map((option) => option.textContent)).toEqual(['Duncit IG · @duncit', 'Duncit Page']);
    fireEvent.click(list.getByRole('option', { name: 'Duncit IG · @duncit' }));
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' });
    fireEvent.click(screen.getByLabelText('Trusted'));
    await waitFor(() => expect(screen.getByTestId('auto-reply-save')).toBeEnabled());
    fireEvent.click(screen.getByTestId('auto-reply-save'));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        name: 'Price',
        kind: 'KEYWORD',
        keywords: ['PRICE', 'HOW MUCH'],
        reply_text: 'Passes start at ₹299.',
        account_ids: ['ig1'],
        trusted: true,
        enabled: true,
      })
    );
  });

  it('hides the keywords for a welcome and explains each kind', async () => {
    renderForm();
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /^Answers/ }));
    fireEvent.click(within(await screen.findByRole('listbox')).getByRole('option', { name: 'First message' }));
    await waitFor(() => expect(screen.queryByRole('textbox', { name: /^Keywords or phrases/ })).not.toBeInTheDocument());
    expect(screen.getByText('A person’s first message to the account, whatever it says.')).toBeInTheDocument();
  });

  it('says what is missing instead of saving', async () => {
    const { onSubmit } = renderForm();
    fireEvent.change(screen.getByRole('textbox', { name: /^Name/ }), { target: { value: 'Price' } });
    await waitFor(() => expect(screen.getByTestId('auto-reply-save')).toBeEnabled());
    fireEvent.click(screen.getByTestId('auto-reply-save'));
    expect(await screen.findByText('Add at least one keyword or phrase.')).toBeInTheDocument();
    expect(screen.getByText('Write the reply.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('cancels, and deletes a saved rule', () => {
    const onDelete = vi.fn();
    const { onCancel } = renderForm({ rule: makeAutoReplyRule(), onDelete });
    expect(screen.getByRole('textbox', { name: /^Keywords or phrases/ })).toHaveValue('PRICE');
    fireEvent.click(screen.getByTestId('auto-reply-delete'));
    fireEvent.click(screen.getByTestId('auto-reply-cancel'));
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('is read-only for someone who may not change rules', () => {
    renderForm({ rule: makeAutoReplyRule(), canEdit: false, onDelete: vi.fn() });
    expect(screen.getByTestId('auto-reply-read-only')).toHaveTextContent('Only a marketing manager can change rules.');
    expect(screen.getByRole('textbox', { name: /^Name/ })).toBeDisabled();
    expect(screen.queryByTestId('auto-reply-save')).not.toBeInTheDocument();
    expect(screen.queryByTestId('auto-reply-delete')).not.toBeInTheDocument();
    expect(screen.getByTestId('auto-reply-cancel')).toBeEnabled();
  });
});
