import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { renderWithProviders } from '../testkit';
import {
  createAutoReplyRuleErrorMock,
  createAutoReplyRuleMock,
  deleteAutoReplyRuleErrorMock,
  deleteAutoReplyRuleMock,
  makeAutoReplyRule,
  makeSocialAccount,
  makeSocialSettings,
  socialSettingsMock,
  updateAutoReplyRuleMock,
} from '../mocks';
import { __setTableRows } from './table-mock';

vi.mock('@duncit/table', () => import('./table-mock'));
const dialogsMock = vi.hoisted(() => ({ notify: vi.fn(), confirm: vi.fn() }));
vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notify: dialogsMock.notify,
  useConfirm: () => dialogsMock.confirm,
}));
const userCtx = vi.hoisted(() => ({ roles: ['MARKETING_MANAGER'] }));
vi.mock('@duncit/user-context', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/user-context')>()),
  useUserData: () => ({ user: { user_id: 'u1', roles: userCtx.roles } }),
}));

import AutoRepliesTab from '../../src/pages/social-accounts-page/auto-replies/AutoRepliesTab';

const ig = makeSocialAccount({ id: 'ig1', provider: 'INSTAGRAM', platform: 'INSTAGRAM', name: 'Duncit IG' });
const price = makeAutoReplyRule();
const welcome = makeAutoReplyRule({ id: 'r2', name: 'Hello', kind: 'WELCOME', keywords: [], account_ids: ['ig1', 'fb1'], trusted: true, enabled: false, sent_7d: 0 });

const renderTab = (mocks: MockedResponse[] = []) =>
  renderWithProviders(<AutoRepliesTab accounts={[ig]} />, { mocks: [socialSettingsMock(makeSocialSettings({ auto_reply_enabled: false })), ...mocks] });

const dialog = () => screen.findByRole('dialog');

beforeEach(() => {
  dialogsMock.notify.mockReset();
  dialogsMock.confirm.mockReset();
  userCtx.roles = ['MARKETING_MANAGER'];
  __setTableRows([price, welcome]);
});

describe('AutoRepliesTab', () => {
  it('lists the rules with what each answers, where, and how it has done, and says Settings has them off', async () => {
    renderTab();
    expect(await screen.findByTestId('auto-replies-off')).toHaveTextContent('Auto-replies are switched off in Settings');
    const rows = await screen.findAllByTestId('table-row');
    expect(within(rows[0]).getByTestId('cell-kind')).toHaveTextContent('Keyword DM');
    expect(within(rows[0]).getByTestId('cell-keywords')).toHaveTextContent('PRICE');
    expect(within(rows[0]).getByTestId('cell-account_ids')).toHaveTextContent('Every account');
    expect(within(rows[0]).getByTestId('cell-trusted')).toHaveTextContent('No');
    expect(within(rows[0]).getByTestId('cell-enabled')).toHaveTextContent('Yes');
    expect(within(rows[0]).getByTestId('cell-sent_7d')).toHaveTextContent('3');
    expect(within(rows[1]).getByTestId('cell-kind')).toHaveTextContent('First message');
    expect(within(rows[1]).getByTestId('cell-account_ids')).toHaveTextContent('2 accounts');
    expect(within(rows[1]).getByTestId('cell-trusted')).toHaveTextContent('Yes');
    expect(within(rows[1]).getByTestId('cell-enabled')).toHaveTextContent('No');
    expect(screen.queryByTestId('auto-replies-approval')).not.toBeInTheDocument();
  });

  it('notes Approvals when replies wait for a yes, and nothing extra when they go straight out', async () => {
    const { unmount } = renderWithProviders(<AutoRepliesTab accounts={[ig]} />, {
      mocks: [socialSettingsMock(makeSocialSettings({ auto_reply_enabled: true, auto_reply_requires_approval: true }))],
    });
    expect(await screen.findByTestId('auto-replies-approval')).toBeInTheDocument();
    unmount();
    renderWithProviders(<AutoRepliesTab accounts={[ig]} />, {
      mocks: [socialSettingsMock(makeSocialSettings({ auto_reply_enabled: true, auto_reply_requires_approval: false }))],
    });
    await screen.findAllByTestId('table-row');
    expect(screen.queryByTestId('auto-replies-approval')).not.toBeInTheDocument();
    expect(screen.queryByTestId('auto-replies-off')).not.toBeInTheDocument();
  });

  it('adds a rule and says so, or shows why the server refused it', async () => {
    const input = { name: 'Hi', kind: 'KEYWORD' as const, keywords: ['HI'], reply_text: 'Welcome!', account_ids: [], trusted: false, enabled: true };
    renderTab([createAutoReplyRuleErrorMock(input, 'keywords: HI is a stop or start keyword in Social Settings'), createAutoReplyRuleMock(input)]);
    fireEvent.click(await screen.findByTestId('auto-reply-new'));
    const box = within(await dialog());
    expect(box.getByText('New auto-reply rule')).toBeInTheDocument();
    fireEvent.change(box.getByRole('textbox', { name: /^Name/ }), { target: { value: 'Hi' } });
    fireEvent.change(box.getByRole('textbox', { name: /^Keywords or phrases/ }), { target: { value: 'hi' } });
    fireEvent.change(box.getByRole('textbox', { name: /^Reply/ }), { target: { value: 'Welcome!' } });
    await waitFor(() => expect(box.getByTestId('auto-reply-save')).toBeEnabled());
    fireEvent.click(box.getByTestId('auto-reply-save'));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('keywords: HI is a stop or start keyword in Social Settings', 'error'));
    fireEvent.click(box.getByTestId('auto-reply-save'));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Rule added.', 'success'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('opens a rule from its row and saves the change', async () => {
    renderTab([updateAutoReplyRuleMock('r1', { name: 'Price list', kind: 'KEYWORD', keywords: ['PRICE'], reply_text: 'Passes start at ₹299.', account_ids: [], trusted: false, enabled: true })]);
    fireEvent.click(await screen.findByText('rowclick-0'));
    const box = within(await dialog());
    expect(box.getByText('Auto-reply rule')).toBeInTheDocument();
    fireEvent.change(box.getByRole('textbox', { name: /^Name/ }), { target: { value: 'Price list' } });
    await waitFor(() => expect(box.getByTestId('auto-reply-save')).toBeEnabled());
    fireEvent.click(box.getByTestId('auto-reply-save'));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Rule saved.', 'success'));
  });

  it('deletes a rule only once confirmed, and shows a refusal', async () => {
    renderTab([deleteAutoReplyRuleErrorMock('r1', 'Auto-reply rule not found'), deleteAutoReplyRuleMock('r1')]);
    fireEvent.click(await screen.findByText('rowclick-0'));
    const box = within(await dialog());
    dialogsMock.confirm.mockResolvedValueOnce(false);
    fireEvent.click(box.getByTestId('auto-reply-delete'));
    await waitFor(() =>
      expect(dialogsMock.confirm).toHaveBeenCalledWith({
        title: 'Delete this rule?',
        message: 'It stops answering. Replies it already sent stay in Activity.',
        confirmLabel: 'Delete',
        destructive: true,
      })
    );
    expect(dialogsMock.notify).not.toHaveBeenCalled();
    dialogsMock.confirm.mockResolvedValue(true);
    fireEvent.click(box.getByTestId('auto-reply-delete'));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Auto-reply rule not found', 'error'));
    fireEvent.click(box.getByTestId('auto-reply-delete'));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Rule deleted.', 'success'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('lets someone who may not change rules read one, and offers them no New rule', async () => {
    userCtx.roles = ['MARKETING_EDITOR'];
    renderTab();
    await screen.findAllByTestId('table-row');
    expect(screen.queryByTestId('auto-reply-new')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('rowclick-1'));
    const box = within(await dialog());
    expect(box.getByTestId('auto-reply-read-only')).toBeInTheDocument();
    expect(box.queryByRole('textbox', { name: /^Keywords or phrases/ })).not.toBeInTheDocument();
    fireEvent.click(box.getByTestId('auto-reply-cancel'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
