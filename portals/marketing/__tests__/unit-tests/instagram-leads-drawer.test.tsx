import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, renderHook, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { renderWithProviders } from '../testkit';
import { __setTableRows, fetchRowsFrom } from './table-mock';
import {
  deleteIgLeadErrorMock,
  deleteIgLeadMock,
  draftIgMessageErrorMock,
  draftIgMessageMock,
  igSettingsErrorMock,
  igSettingsMock,
  makeIgLead,
  makeIgSettings,
  markIgSentErrorMock,
  markIgSentMock,
  setIgStatusErrorMock,
  setIgStatusMock,
} from '../mocks/instagram-leads.mock';

vi.mock('@duncit/table', () => import('./table-mock'));
vi.mock('@duncit/app-settings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/app-settings')>()),
  useDateFormat: () => ({ formatDateTime: (d: Date | string) => `fmt:${String(d)}` }),
}));
const dialogsMock = vi.hoisted(() => ({ notify: vi.fn(), confirm: vi.fn() }));
vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notify: dialogsMock.notify,
  useConfirm: () => dialogsMock.confirm,
}));

import { DuncitTable } from '@duncit/table';
import { useTranslation } from '@duncit/app-settings';
import LeadDrawer from '../../src/pages/instagram-leads-page/leads/LeadDrawer';
import LeadComposer from '../../src/pages/instagram-leads-page/leads/LeadComposer';
import LeadProfile from '../../src/pages/instagram-leads-page/leads/LeadProfile';
import LeadsTab from '../../src/pages/instagram-leads-page/leads/LeadsTab';
import { getLeadColumns } from '../../src/pages/instagram-leads-page/leads/leadColumns';
import { MESSAGE_MAX, leadMessageSchema } from '../../src/pages/instagram-leads-page/lead-message-form';
import type { IgLead } from '../../src/pages/instagram-leads-page/queries';

const writeText = vi.fn();

beforeEach(() => {
  writeText.mockResolvedValue(undefined);
  Object.assign(navigator, { clipboard: { writeText } });
});

afterEach(() => {
  __setTableRows([]);
  vi.clearAllMocks();
});

const translator = () => renderHook(() => useTranslation()).result.current;
const sent = (step: number, text: string, at: string | null = '2026-10-30T12:00:00.000Z') => ({ step, text, sent_at: at });

describe('LeadProfile', () => {
  it('shows who the lead is, the fit, how to reach them, what was sent and when the next message is due', () => {
    const lead = makeIgLead({
      status: 'CONTACTED',
      messages: [sent(0, 'Hi Pawsome!'), sent(1, 'Following up', null)],
      next_follow_up_at: '2026-11-02T10:00:00.000Z',
    });
    const { container } = renderWithProviders(<LeadProfile lead={lead} />);
    expect(screen.getByText('Pawsome Grooming')).toBeInTheDocument();
    expect(screen.getByText('12,500 followers')).toBeInTheDocument();
    expect(screen.getByText('Contacted')).toBeInTheDocument();
    expect(container.querySelector('img')).toHaveAttribute('src', 'https://cdn.test/pawsome.jpg');
    expect(screen.getByRole('link', { name: 'Open on Instagram' })).toHaveAttribute('href', 'https://www.instagram.com/pawsome.blr/');
    expect(screen.getByText(/Dog grooming in Indiranagar/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'https://pawsome.in' })).toHaveAttribute('target', '_blank');
    expect(screen.getByText('Fit 82/100')).toBeInTheDocument();
    expect(screen.getByText('Runs group sessions for dog owners')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '+919876543210' })).toHaveAttribute('href', 'tel:+919876543210');
    expect(screen.getByRole('link', { name: 'hi@pawsome.in' })).toHaveAttribute('href', 'mailto:hi@pawsome.in');
    const history = screen.getByRole('list');
    const items = within(history).getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('fmt:2026-10-30T12:00:00.000ZHi Pawsome!');
    expect(items[1]).toHaveTextContent(/^Following up$/);
    expect(screen.getByText('Next follow-up due fmt:2026-11-02T10:00:00.000Z')).toBeInTheDocument();
  });

  it('falls back to the handle, says when there is no score or contact, and leaves out what the profile does not have', () => {
    const lead = makeIgLead({
      name: '',
      followers: null,
      profile_picture_url: '',
      profile_url: '',
      bio: '',
      website: '',
      fit_score: null,
      fit_reason: '',
      emails: [],
      phones: [],
      messages: [sent(0, 'Hi')],
    });
    const { container } = renderWithProviders(<LeadProfile lead={lead} />);
    expect(screen.getByText('@pawsome.blr')).toBeInTheDocument();
    expect(screen.queryByText(/followers/)).not.toBeInTheDocument();
    expect(container.querySelector('img')).toBeNull();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('Fit -/100')).toBeInTheDocument();
    expect(screen.getByText('The AI could not score this profile.')).toBeInTheDocument();
    expect(screen.getByText('The profile does not publish a phone number or email.')).toBeInTheDocument();
    expect(screen.getByText('Messages sent')).toBeInTheDocument();
    expect(screen.queryByText(/Next follow-up due/)).not.toBeInTheDocument();
  });

  it('shows no history before the first message', () => {
    renderWithProviders(<LeadProfile lead={makeIgLead()} />);
    expect(screen.queryByText('Messages sent')).not.toBeInTheDocument();
  });
});

describe('leadMessageSchema', () => {
  it('trims the message, needs one, and keeps it within the server cap', () => {
    const schema = leadMessageSchema(translator().t);
    expect(schema.parse({ text: '  Hi there  ' })).toEqual({ text: 'Hi there' });
    expect(schema.safeParse({ text: '   ' }).error?.issues[0]?.message).toBe('Write the message first.');
    expect(schema.safeParse({ text: 'x'.repeat(MESSAGE_MAX + 1) }).error?.issues[0]?.message).toBe('Keep the message under 1000 characters.');
    expect(schema.safeParse({ text: 'x'.repeat(MESSAGE_MAX) }).success).toBe(true);
  });
});

const renderComposer = (lead: IgLead, mocks: MockedResponse[]) => {
  const onChanged = vi.fn();
  renderWithProviders(<LeadComposer lead={lead} onChanged={onChanged} />, { mocks });
  return { onChanged };
};

describe('LeadComposer', () => {
  it('starts on the opening message, refuses an empty one, and links the lead’s Instagram chat', async () => {
    renderComposer(makeIgLead(), [igSettingsMock(makeIgSettings())]);
    expect(await screen.findByRole('heading', { level: 3, name: 'Opening message' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Message' })).toHaveValue('');
    expect(screen.getByRole('link', { name: 'Open Instagram chat' })).toHaveAttribute('href', 'https://ig.me/m/pawsome.blr');
    // Enter in the box must not submit the page away: the form holds its own submit back.
    expect(fireEvent.submit(screen.getByTestId('ig-lead-message-form'))).toBe(false);
    fireEvent.click(screen.getByTestId('ig-lead-send'));
    expect(await screen.findByText('Write the message first.')).toBeInTheDocument();
    expect(writeText).not.toHaveBeenCalled();
  });

  it('counts the follow-up against the schedule in Settings', async () => {
    renderComposer(makeIgLead({ status: 'CONTACTED', messages: [sent(0, 'Hi')] }), [igSettingsMock(makeIgSettings())]);
    expect(await screen.findByRole('heading', { level: 3, name: 'Follow-up 1 of 2' })).toBeInTheDocument();
  });

  it('counts the follow-up against itself while the settings cannot be read', async () => {
    renderComposer(makeIgLead({ status: 'CONTACTED', messages: [sent(0, 'Hi')] }), [igSettingsErrorMock('Forbidden')]);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(screen.getByRole('heading', { level: 3, name: 'Follow-up 1 of 1' })).toBeInTheDocument();
  });

  it('says every follow-up has gone once the schedule is used up', async () => {
    const lead = makeIgLead({ status: 'CONTACTED', messages: [sent(0, 'a'), sent(1, 'b'), sent(2, 'c')] });
    renderComposer(lead, [igSettingsMock(makeIgSettings({ max_follow_ups: 2 }))]);
    expect(await screen.findByRole('alert')).toHaveTextContent('Every follow-up in Settings has been sent.');
    expect(screen.queryByTestId('ig-lead-message-form')).not.toBeInTheDocument();
  });

  it('asks the AI for a draft and hands the drafted lead up', async () => {
    const lead = makeIgLead();
    const { onChanged } = renderComposer(lead, [
      igSettingsMock(makeIgSettings()),
      draftIgMessageMock(lead.id, { ...lead, draft: 'Hi Pawsome, we run pods', draft_step: 0 }),
    ]);
    fireEvent.click(await screen.findByTestId('ig-lead-draft'));
    await waitFor(() => expect(onChanged).toHaveBeenCalledWith(expect.objectContaining({ id: 'ig1', draft: 'Hi Pawsome, we run pods', draft_step: 0 })));
    expect(dialogsMock.notify).not.toHaveBeenCalled();
  });

  it('reports a refused draft, and hands nothing up when the server brings nothing back', async () => {
    const lead = makeIgLead();
    const { onChanged } = renderComposer(lead, [
      igSettingsMock(makeIgSettings()),
      draftIgMessageErrorMock(lead.id, 'AI is busy'),
      draftIgMessageMock(lead.id, null),
    ]);
    fireEvent.click(await screen.findByTestId('ig-lead-draft'));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('AI is busy', 'error'));
    fireEvent.click(screen.getByTestId('ig-lead-draft'));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledTimes(1));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(onChanged).not.toHaveBeenCalled();
  });

  it('copies the trimmed message, says so, records the send and hands the lead up', async () => {
    const lead = makeIgLead({ draft: '  Hi Pawsome, we run pods  ' });
    const after = { ...lead, status: 'CONTACTED' as const, draft: '', messages: [sent(0, 'Hi Pawsome, we run pods')] };
    const { onChanged } = renderComposer(lead, [igSettingsMock(makeIgSettings(), 2), markIgSentMock(lead.id, 'Hi Pawsome, we run pods', after)]);
    expect(await screen.findByRole('textbox', { name: 'Message' })).toHaveValue('  Hi Pawsome, we run pods  ');
    fireEvent.click(screen.getByTestId('ig-lead-send'));
    await waitFor(() => expect(onChanged).toHaveBeenCalledWith(expect.objectContaining({ status: 'CONTACTED', draft: '' })));
    expect(writeText).toHaveBeenCalledWith('Hi Pawsome, we run pods');
    expect(dialogsMock.notify).toHaveBeenCalledWith('Copied. Paste it into the Instagram chat and send.', 'success');
  });

  it('still records the send when the clipboard is refused, and says to copy by hand', async () => {
    writeText.mockRejectedValue(new Error('denied'));
    const lead = makeIgLead({ draft: 'Hello' });
    const { onChanged } = renderComposer(lead, [igSettingsMock(makeIgSettings(), 2), markIgSentMock(lead.id, 'Hello', { ...lead, status: 'CONTACTED' })]);
    fireEvent.click(await screen.findByTestId('ig-lead-send'));
    await waitFor(() => expect(onChanged).toHaveBeenCalledWith(expect.objectContaining({ status: 'CONTACTED' })));
    expect(dialogsMock.notify).toHaveBeenCalledWith('Could not copy automatically. Select the message and copy it by hand.', 'warning');
  });

  it('reports a refused send, and hands nothing up when the server brings nothing back', async () => {
    const lead = makeIgLead({ draft: 'Hello' });
    const { onChanged } = renderComposer(lead, [
      igSettingsMock(makeIgSettings(), 3),
      markIgSentErrorMock(lead.id, 'Hello', 'Daily limit reached'),
      markIgSentMock(lead.id, 'Hello', null),
    ]);
    fireEvent.click(await screen.findByTestId('ig-lead-send'));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Daily limit reached', 'error'));
    fireEvent.click(screen.getByTestId('ig-lead-send'));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(2));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(onChanged).not.toHaveBeenCalled();
    expect(dialogsMock.notify.mock.calls.filter(([, kind]) => kind === 'error')).toEqual([['Daily limit reached', 'error']]);
  });
});

const renderDrawer = (lead: IgLead | null, mocks: MockedResponse[] = []) => {
  const onClose = vi.fn();
  const onChanged = vi.fn();
  renderWithProviders(<LeadDrawer lead={lead} onClose={onClose} onChanged={onChanged} />, {
    mocks: [igSettingsMock(makeIgSettings(), 5), ...mocks],
  });
  return { onClose, onChanged };
};

describe('LeadDrawer', () => {
  it('shows nothing while no lead is open', () => {
    renderDrawer(null);
    expect(screen.queryByTestId('ig-lead-drawer')).not.toBeInTheDocument();
  });

  it('shows an open lead with its composer and the ways to close the conversation, and closes', async () => {
    const { onClose } = renderDrawer(makeIgLead());
    expect(screen.getByRole('heading', { level: 2, name: '@pawsome.blr' })).toBeInTheDocument();
    expect(await screen.findByTestId('ig-lead-message-form')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'They replied' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Converted' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Lost' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Reopen lead' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['They replied', 'REPLIED'],
    ['Converted', 'CONVERTED'],
    ['Lost', 'LOST'],
  ] as const)('“%s” moves the lead to %s and hands it up', async (label, status) => {
    const lead = makeIgLead();
    const { onChanged } = renderDrawer(lead, [setIgStatusMock(lead.id, status, { ...lead, status })]);
    fireEvent.click(screen.getByRole('button', { name: label }));
    await waitFor(() => expect(onChanged).toHaveBeenCalledWith(expect.objectContaining({ id: 'ig1', status })));
  });

  it('reports a refused status, and hands nothing up when the server brings nothing back', async () => {
    const lead = makeIgLead();
    const { onChanged } = renderDrawer(lead, [setIgStatusErrorMock(lead.id, 'LOST', 'Not allowed'), setIgStatusMock(lead.id, 'LOST', null)]);
    fireEvent.click(screen.getByRole('button', { name: 'Lost' }));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Not allowed', 'error'));
    fireEvent.click(screen.getByRole('button', { name: 'Lost' }));
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(onChanged).not.toHaveBeenCalled();
    expect(dialogsMock.notify).toHaveBeenCalledTimes(1);
  });

  it('reopens a closed lead it already wrote to as Contacted, with no composer', async () => {
    const lead = makeIgLead({ status: 'REPLIED', messages: [sent(0, 'Hi')] });
    const { onChanged } = renderDrawer(lead, [setIgStatusMock(lead.id, 'CONTACTED', { ...lead, status: 'CONTACTED' })]);
    expect(screen.queryByTestId('ig-lead-message-form')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'They replied' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reopen lead' }));
    await waitFor(() => expect(onChanged).toHaveBeenCalledWith(expect.objectContaining({ status: 'CONTACTED' })));
  });

  it('reopens a closed lead it never wrote to as New', async () => {
    const lead = makeIgLead({ status: 'LOST' });
    const { onChanged } = renderDrawer(lead, [setIgStatusMock(lead.id, 'NEW', { ...lead, status: 'NEW' })]);
    fireEvent.click(screen.getByRole('button', { name: 'Reopen lead' }));
    await waitFor(() => expect(onChanged).toHaveBeenCalledWith(expect.objectContaining({ status: 'NEW' })));
  });

  it('deletes only once confirmed, then hands up nothing', async () => {
    const lead = makeIgLead();
    const { onChanged } = renderDrawer(lead, [deleteIgLeadMock(lead.id)]);
    dialogsMock.confirm.mockResolvedValueOnce(false);
    fireEvent.click(screen.getByRole('button', { name: 'Delete lead' }));
    await waitFor(() => expect(dialogsMock.confirm).toHaveBeenCalledWith({ title: 'Delete this lead?', message: '@pawsome.blr', destructive: true }));
    expect(onChanged).not.toHaveBeenCalled();
    dialogsMock.confirm.mockResolvedValueOnce(true);
    fireEvent.click(screen.getByRole('button', { name: 'Delete lead' }));
    await waitFor(() => expect(onChanged).toHaveBeenCalledWith(null));
  });

  it('reports a refused delete and keeps the lead', async () => {
    const lead = makeIgLead();
    const { onChanged } = renderDrawer(lead, [deleteIgLeadErrorMock(lead.id, 'Lead is locked')]);
    dialogsMock.confirm.mockResolvedValueOnce(true);
    fireEvent.click(screen.getByRole('button', { name: 'Delete lead' }));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Lead is locked', 'error'));
    expect(onChanged).not.toHaveBeenCalled();
  });
});

describe('getLeadColumns', () => {
  const columnsFor = () => getLeadColumns(translator().t, 'en');

  it('reads each lead’s profile, fit, followers, contacts and status, with a dash for what is missing', async () => {
    const full = makeIgLead();
    const bare = makeIgLead({
      id: 'ig2',
      username: 'quiet.cafe',
      name: 'Quiet Cafe',
      profile_picture_url: '',
      fit_score: null,
      followers: null,
      phones: [],
      emails: [],
      status: 'LOST',
    });
    const phoneOnly = makeIgLead({ id: 'ig3', username: 'callme', emails: [], status: 'CONVERTED' });
    const emailOnly = makeIgLead({ id: 'ig4', username: 'mailme', phones: [], status: 'REPLIED' });
    const { container } = renderWithProviders(
      <DuncitTable tableId="marketing-ig-leads" columns={columnsFor()} fetchRows={fetchRowsFrom([full, bare, phoneOnly, emailOnly])} getRowId={(row: IgLead) => row.id} />,
    );
    const rows = await screen.findAllByTestId('table-row');
    expect(rows).toHaveLength(4);
    expect(within(rows[0]).getByTestId('cell-username')).toHaveTextContent('pawsome.blr@pawsome.blrPawsome Grooming');
    expect(within(rows[0]).getByTestId('cell-fit_score')).toHaveTextContent('82');
    expect(within(rows[0]).getByTestId('cell-followers')).toHaveTextContent('12,500');
    expect(within(rows[0]).getByTestId('cell-contact')).toHaveTextContent('919876543210, hi@pawsome.in');
    expect(within(rows[0]).getByTitle('Has a phone number')).toBeInTheDocument();
    expect(within(rows[0]).getByTitle('Has an email')).toBeInTheDocument();
    expect(within(rows[0]).getByTestId('cell-status')).toHaveTextContent('NewNew');
    expect(container.querySelectorAll('img')).toHaveLength(3);
    expect(within(rows[1]).getByTestId('cell-fit_score')).toHaveTextContent('—');
    expect(within(rows[1]).getByTestId('cell-followers')).toHaveTextContent('—');
    expect(within(rows[1]).getByTestId('cell-contact')).toHaveTextContent(/^—$/);
    expect(within(rows[1]).getByTestId('cell-status')).toHaveTextContent('LostLost');
    expect(within(rows[2]).getByTitle('Has a phone number')).toBeInTheDocument();
    expect(within(rows[2]).queryByTitle('Has an email')).not.toBeInTheDocument();
    expect(within(rows[3]).queryByTitle('Has a phone number')).not.toBeInTheDocument();
    expect(within(rows[3]).getByTitle('Has an email')).toBeInTheDocument();
  });

  it('offers every status as a filter, by its label', () => {
    const status = columnsFor().find((column) => column.field === 'status');
    expect(status).toMatchObject({ options: [
      { value: 'NEW', label: 'New' },
      { value: 'CONTACTED', label: 'Contacted' },
      { value: 'REPLIED', label: 'Replied' },
      { value: 'CONVERTED', label: 'Converted' },
      { value: 'LOST', label: 'Lost' },
    ] });
  });
});

describe('LeadsTab', () => {
  it('says how many DMs went today, narrows to follow-ups due, and says when none are', async () => {
    renderWithProviders(<LeadsTab settings={makeIgSettings()} />);
    expect(screen.getByText('4 of 20 DMs sent today')).toBeInTheDocument();
    expect(await screen.findByTestId('table-empty')).toHaveTextContent('No leads yet. Start a search under Find leads.');
    fireEvent.click(screen.getByRole('switch', { name: 'Follow-ups due' }));
    expect(screen.getByRole('switch', { name: 'Follow-ups due' })).toBeChecked();
    expect(screen.getByTestId('table-empty')).toHaveTextContent('No follow-ups are due right now.');
  });

  it('hides the sent count until the settings are read', () => {
    renderWithProviders(<LeadsTab settings={null} />);
    expect(screen.queryByText(/DMs sent today/)).not.toBeInTheDocument();
  });

  it('opens a lead from its row, follows a change the drawer makes, and closes', async () => {
    const lead = makeIgLead();
    __setTableRows([lead]);
    renderWithProviders(<LeadsTab settings={makeIgSettings()} />, {
      mocks: [igSettingsMock(makeIgSettings(), 5), setIgStatusMock(lead.id, 'REPLIED', { ...lead, status: 'REPLIED' })],
    });
    fireEvent.click(await screen.findByRole('button', { name: 'rowclick-0' }));
    const drawer = await screen.findByTestId('ig-lead-drawer');
    fireEvent.click(within(drawer).getByRole('button', { name: 'They replied' }));
    expect(await within(drawer).findByRole('button', { name: 'Reopen lead' })).toBeInTheDocument();
    fireEvent.click(within(drawer).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByTestId('ig-lead-drawer')).not.toBeInTheDocument());
  });
});
