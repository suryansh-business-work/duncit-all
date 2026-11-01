import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { renderWithProviders } from '../testkit';
import {
  addLeadNoteErrorMock,
  addLeadNoteMock,
  assignLeadOwnerMock,
  audienceListOwnersMock,
  makeLeadDetail,
  makeTimelineEntry,
  marketingLeadErrorMock,
  marketingLeadMock,
  promoteLeadErrorMock,
  promoteLeadMock,
  setLeadStageErrorMock,
  setLeadStageMock,
} from '../mocks';

const userCtx = vi.hoisted(() => ({ value: { user: { user_id: 'u1', roles: ['MARKETING_MANAGER'] } as { user_id?: string; roles?: string[] } | null } }));
vi.mock('@duncit/user-context', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/user-context')>()),
  useUserData: () => userCtx.value,
}));
vi.mock('@duncit/app-settings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/app-settings')>()),
  useDateFormat: () => ({ formatDateTime: (d: Date | string) => `fmt:${String(d)}` }),
}));
const dialogsMock = vi.hoisted(() => ({ notify: vi.fn() }));
vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notify: dialogsMock.notify,
}));

import LeadDrawer from '../../src/pages/leads-page/drawer/LeadDrawer';
import LeadStageButtons from '../../src/pages/leads-page/drawer/LeadStageButtons';
import LeadTimeline from '../../src/pages/leads-page/drawer/LeadTimeline';

beforeEach(() => {
  userCtx.value = { user: { user_id: 'u1', roles: ['MARKETING_MANAGER'] } };
});

afterEach(() => {
  vi.clearAllMocks();
});

const renderDrawer = (mocks: MockedResponse[], leadId: string | null = 'l1') => {
  const onClose = vi.fn();
  const onChanged = vi.fn();
  renderWithProviders(<LeadDrawer leadId={leadId} onClose={onClose} onChanged={onChanged} />, { mocks });
  return { onClose, onChanged };
};

describe('LeadDrawer', () => {
  it('shows the lead: details, contacts as links, the stage buttons, notes and history', async () => {
    renderDrawer([marketingLeadMock(makeLeadDetail())]);
    expect(await screen.findByRole('heading', { level: 2, name: 'Blue Cafe' })).toBeInTheDocument();
    const details = screen.getByTestId('lead-details');
    expect(within(details).getByText('Blue Cafe Pvt')).toBeInTheDocument();
    expect(within(details).getByText('Venue')).toBeInTheDocument();
    expect(within(details).getByText('Instagram')).toBeInTheDocument();
    expect(within(details).getByText('Pune')).toBeInTheDocument();
    expect(within(details).getByText('82/100')).toBeInTheDocument();
    expect(within(details).getByText('Hosts brunches')).toBeInTheDocument();
    expect(within(details).getByText('Asha Rao')).toBeInTheDocument();
    expect(within(details).getByText('coffee')).toBeInTheDocument();
    const contacts = screen.getByTestId('lead-contacts');
    expect(within(contacts).getByRole('link', { name: '+919876543210' })).toHaveAttribute('href', 'tel:+919876543210');
    expect(within(contacts).getByRole('link', { name: 'hi@bluecafe.in' })).toHaveAttribute('href', 'mailto:hi@bluecafe.in');
    expect(within(contacts).getByRole('link', { name: 'bluecafe.in' })).toHaveAttribute('href', 'https://bluecafe.in');
    expect(within(contacts).getByRole('link', { name: '@bluecafe' })).toHaveAttribute('href', 'https://www.instagram.com/bluecafe/');
    const stages = screen.getByTestId('lead-stage-buttons');
    expect(within(stages).getAllByRole('button').map((button) => button.textContent)).toEqual([
      'Move to Contacted',
      'Move to Replied',
      'Move to Qualified',
      'Move to Converted',
      'Move to Lost',
      'Promote to CRM',
    ]);
    expect(screen.getByTestId('lead-notes')).toHaveTextContent('Spoke to the owner');
    expect(screen.getByTestId('lead-notes')).toHaveTextContent('Asha Rao · fmt:2026-10-30T10:00:00.000Z');
    expect(screen.getByTestId('lead-timeline')).toHaveTextContent('Added');
    expect(screen.getByTestId('lead-timeline')).toHaveTextContent('Added from INSTAGRAM');
    expect(screen.getByTestId('lead-change-owner')).toBeInTheDocument();
  });

  it('hides Promote and the owner picker from an editor, and says when a lead has no contacts', async () => {
    userCtx.value = { user: { user_id: 'u2', roles: ['MARKETING_EDITOR'] } };
    renderDrawer([
      marketingLeadMock(
        makeLeadDetail({ emails: [], phones: [], website: '', instagram_handle: '', company: '', city: '', score: null, owner_name: null, tags: [], notes: [] }),
      ),
    ]);
    await screen.findByRole('heading', { level: 2, name: 'Blue Cafe' });
    expect(screen.getByTestId('lead-contacts')).toHaveTextContent('No phone, email, website or handle yet.');
    expect(screen.getByTestId('lead-details')).toHaveTextContent('Not scored');
    expect(screen.getByTestId('lead-details')).toHaveTextContent('Unassigned');
    expect(screen.queryByTestId('lead-change-owner')).not.toBeInTheDocument();
    expect(screen.queryByTestId('lead-promote')).not.toBeInTheDocument();
    expect(screen.getByTestId('lead-notes')).toHaveTextContent('No notes yet.');
  });

  it('shows the error when the lead cannot be read, and nothing while closed', async () => {
    renderDrawer([marketingLeadErrorMock('l1', 'Lead not found')]);
    expect(await screen.findByRole('alert')).toHaveTextContent('Lead not found');
    expect(screen.getByRole('heading', { level: 2, name: 'Lead' })).toBeInTheDocument();
  });

  it('moves the stage, tells the person, reloads the lead and the list behind it', async () => {
    const lead = makeLeadDetail();
    const { onChanged } = renderDrawer([marketingLeadMock(lead, 2), setLeadStageMock(lead, 'CONTACTED')]);
    await screen.findByRole('heading', { level: 2, name: 'Blue Cafe' });
    fireEvent.click(screen.getByTestId('lead-move-CONTACTED'));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Moved to Contacted.', 'success'));
    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  it('asks why before losing a lead, insists on an answer, and passes the reason along', async () => {
    const lead = makeLeadDetail();
    renderDrawer([marketingLeadMock(lead, 2), setLeadStageMock(lead, 'LOST', 'Went with a competitor')]);
    await screen.findByRole('heading', { level: 2, name: 'Blue Cafe' });
    fireEvent.click(screen.getByTestId('lead-move-LOST'));
    const dialog = await screen.findByRole('dialog', { name: 'Mark this lead as lost?' });
    fireEvent.click(within(dialog).getByTestId('lead-lost-confirm'));
    expect(within(dialog).getByText('Say why the lead was lost.')).toBeInTheDocument();
    const reason = within(dialog).getByLabelText('Why was it lost?');
    fireEvent.change(reason, { target: { value: 'x'.repeat(2001) } });
    fireEvent.blur(reason);
    expect(within(dialog).getByText('Keep it under 2000 characters.')).toBeInTheDocument();
    fireEvent.change(reason, { target: { value: '  Went with a competitor  ' } });
    fireEvent.click(within(dialog).getByTestId('lead-lost-confirm'));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Moved to Lost.', 'success'));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Mark this lead as lost?' })).not.toBeInTheDocument());
  });

  it('keeps the lost dialog open and reports the refusal when the server says no', async () => {
    const lead = makeLeadDetail();
    renderDrawer([marketingLeadMock(lead), setLeadStageErrorMock('l1', 'LOST', 'No', 'Say why')]);
    await screen.findByRole('heading', { level: 2, name: 'Blue Cafe' });
    fireEvent.click(screen.getByTestId('lead-move-LOST'));
    const dialog = await screen.findByRole('dialog', { name: 'Mark this lead as lost?' });
    fireEvent.change(within(dialog).getByLabelText('Why was it lost?'), { target: { value: 'No' } });
    fireEvent.click(within(dialog).getByTestId('lead-lost-confirm'));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Say why', 'error'));
    expect(screen.getByRole('dialog', { name: 'Mark this lead as lost?' })).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
  });

  it('adds a note once there is one to add, and clears the box', async () => {
    const lead = makeLeadDetail();
    renderDrawer([marketingLeadMock(lead, 2), addLeadNoteMock(lead, 'Call back Monday')]);
    await screen.findByRole('heading', { level: 2, name: 'Blue Cafe' });
    fireEvent.click(screen.getByTestId('lead-add-note'));
    expect(screen.getByText('Write the note first.')).toBeInTheDocument();
    const box = screen.getByLabelText('Add a note');
    fireEvent.change(box, { target: { value: 'x'.repeat(2001) } });
    expect(screen.getByText('Keep the note under 2000 characters.')).toBeInTheDocument();
    fireEvent.change(box, { target: { value: ' Call back Monday ' } });
    fireEvent.click(screen.getByTestId('lead-add-note'));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Note added.', 'success'));
    await waitFor(() => expect(box).toHaveValue(''));
  });

  it('keeps the note in the box when the server refuses it', async () => {
    const lead = makeLeadDetail();
    renderDrawer([marketingLeadMock(lead), addLeadNoteErrorMock('l1', 'Nope', 'Too short')]);
    await screen.findByRole('heading', { level: 2, name: 'Blue Cafe' });
    const box = screen.getByLabelText('Add a note');
    fireEvent.change(box, { target: { value: 'Nope' } });
    fireEvent.click(screen.getByTestId('lead-add-note'));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Too short', 'error'));
    expect(box).toHaveValue('Nope');
  });

  it('lets a manager pick an owner from the portal’s people and saves the pick', async () => {
    const lead = makeLeadDetail();
    renderDrawer([marketingLeadMock(lead, 2), audienceListOwnersMock, assignLeadOwnerMock(lead, 'boss', 'Ravi Boss')]);
    await screen.findByRole('heading', { level: 2, name: 'Blue Cafe' });
    fireEvent.click(screen.getByTestId('lead-change-owner'));
    const dialog = await screen.findByRole('dialog', { name: 'Who works this lead?' });
    const input = within(dialog).getByRole('combobox', { name: 'Owner' });
    await waitFor(() => expect(input).toHaveValue('Asha Rao'));
    fireEvent.mouseDown(input);
    fireEvent.click(within(await screen.findByRole('listbox')).getByRole('option', { name: 'Ravi Boss' }));
    fireEvent.click(within(dialog).getByTestId('lead-owner-save'));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Owner saved.', 'success'));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Who works this lead?' })).not.toBeInTheDocument());
  });

  it('promotes through the dialog, then shows where the lead lives in the CRM', async () => {
    const lead = makeLeadDetail();
    const promoted = { ...lead, crm_ref: { kind: 'VENUE' as const, id: 'crm-1', promoted_at: '2026-10-31T10:00:00.000Z', promoted_by: 'boss' } };
    renderDrawer([marketingLeadMock(lead), promoteLeadMock(lead, 'VENUE'), marketingLeadMock(promoted)]);
    await screen.findByRole('heading', { level: 2, name: 'Blue Cafe' });
    fireEvent.click(screen.getByTestId('lead-promote'));
    const dialog = await screen.findByRole('dialog', { name: 'Promote to the CRM' });
    expect(within(dialog).getByText(/A venue lead is created in the CRM from this Venue lead/)).toBeInTheDocument();
    expect(within(dialog).getByTestId('lead-promote-kind')).toHaveValue('VENUE');
    fireEvent.click(within(dialog).getByTestId('lead-promote-confirm'));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('Promoted. Sales can see the venue lead in the CRM now.', 'success'));
    expect(await screen.findByTestId('lead-promoted')).toHaveTextContent('In the CRM as a venue lead.');
    expect(screen.getByRole('link', { name: 'Open in CRM' })).toHaveAttribute('href', 'http://localhost:2007/venue-leads/crm-1/view');
    expect(screen.queryByTestId('lead-promote')).not.toBeInTheDocument();
  });

  it('lets the person pick another kind, and reports the server’s refusal', async () => {
    const lead = makeLeadDetail({ pipeline: 'HOST' });
    renderDrawer([marketingLeadMock(lead), promoteLeadErrorMock('l1', 'ECOMM', 'A HOST lead becomes a HOST lead in the CRM, not ECOMM.')]);
    await screen.findByRole('heading', { level: 2, name: 'Blue Cafe' });
    fireEvent.click(screen.getByTestId('lead-promote'));
    const dialog = await screen.findByRole('dialog', { name: 'Promote to the CRM' });
    expect(within(dialog).getByTestId('lead-promote-kind')).toHaveValue('HOST');
    fireEvent.change(within(dialog).getByTestId('lead-promote-kind'), { target: { value: 'ECOMM' } });
    expect(within(dialog).getByText(/A ecomm lead is created in the CRM from this Host lead/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByTestId('lead-promote-confirm'));
    await waitFor(() => expect(dialogsMock.notify).toHaveBeenCalledWith('A HOST lead becomes a HOST lead in the CRM, not ECOMM.', 'error'));
    expect(screen.getByRole('dialog', { name: 'Promote to the CRM' })).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Promote to the CRM' })).not.toBeInTheDocument());
  });
});

describe('LeadStageButtons', () => {
  it('disables Promote for a pipeline the CRM has no record for, and says why', () => {
    const onMove = vi.fn().mockResolvedValue(true);
    renderWithProviders(<LeadStageButtons lead={makeLeadDetail({ pipeline: 'INFLUENCER' })} busy={false} canPromote onMove={onMove} onPromote={vi.fn()} />);
    expect(screen.getByTestId('lead-promote')).toBeDisabled();
    expect(screen.getByText('Only Venue, Host, Brand and Advertiser leads can be promoted.')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('lead-move-QUALIFIED'));
    expect(onMove).toHaveBeenCalledWith('QUALIFIED');
  });
});

describe('LeadTimeline', () => {
  it('lists newest first with the kind of each entry', () => {
    renderWithProviders(
      <LeadTimeline
        entries={[
          makeTimelineEntry(),
          makeTimelineEntry({ at: '2026-10-31T09:00:00.000Z', kind: 'PROMOTED', text: 'Promoted to the CRM as a VENUE lead', by_name: 'Meera' }),
          makeTimelineEntry({ at: null, kind: 'SOURCE', text: 'Seen again from IMPORT', by_name: '' }),
        ]}
      />,
    );
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Seen again');
    expect(items[0]).toHaveTextContent('Seen again from IMPORT');
    expect(items[1]).toHaveTextContent('Promoted');
    expect(items[1]).toHaveTextContent('Meera · fmt:2026-10-31T09:00:00.000Z');
    expect(items[2]).toHaveTextContent('Added from INSTAGRAM');
  });

  it('names an entry a sequence left as Outreach', () => {
    renderWithProviders(
      <LeadTimeline entries={[makeTimelineEntry({ kind: 'OUTREACH', text: 'Email "Hello" sent by Venue intro', by_name: 'System' })]} />,
    );
    const [item] = screen.getAllByRole('listitem');
    expect(item).toHaveTextContent('Outreach');
    expect(item).toHaveTextContent('Email "Hello" sent by Venue intro');
  });
});
