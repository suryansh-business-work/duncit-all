import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { GraphQLError } from 'graphql';
import type { MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import CreateLeadDialog from '@/pages/user-leads/CreateLeadDialog';
import DeleteLeadsDialog from '@/pages/user-leads/DeleteLeadsDialog';
import EditLeadDialog from '@/pages/user-leads/EditLeadDialog';
import type { LeadRow } from '@/pages/user-leads/LeadsTable';
import {
  WA_CREATE_USER_LEAD,
  WA_DELETE_USER_LEADS,
  WA_UPDATE_USER_LEAD,
} from '@/pages/tools/whatsapp/whatsappQueries';

const withApollo = (ui: React.ReactElement, mocks: MockedResponse[] = []) =>
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      {ui}
    </MockedProvider>,
  );

const createMock = (input: Record<string, unknown>, result: MockedResponse['result']): MockedResponse => ({
  request: { query: WA_CREATE_USER_LEAD, variables: { input } },
  result,
});

describe('CreateLeadDialog', () => {
  const renderCreate = (mocks: MockedResponse[] = []) => {
    const onClose = vi.fn();
    const onCreated = vi.fn();
    withApollo(<CreateLeadDialog open onClose={onClose} onCreated={onCreated} />, mocks);
    const dialog = within(screen.getByRole('dialog', { name: 'New user lead' }));
    return {
      onClose,
      onCreated,
      phone: dialog.getByRole('textbox', { name: /Phone \(with country code\)/ }),
      name: dialog.getByRole('textbox', { name: 'Name' }),
      create: dialog.getByRole('button', { name: 'Create' }),
    };
  };

  it('keeps Create disabled until a phone is typed', () => {
    const { phone, create } = renderCreate();
    expect(create).toBeDisabled();
    fireEvent.change(phone, { target: { value: '   ' } });
    expect(create).toBeDisabled();
    fireEvent.change(phone, { target: { value: '919876543210' } });
    expect(create).toBeEnabled();
  });

  it('does not send a phone with no digits in it', async () => {
    const created = vi.fn(() => ({ data: { waCreateUserLead: { id: 'l1', phone: '+-', name: null } } }));
    const { phone, create, onCreated, onClose } = renderCreate([createMock({ phone: '+-' }, created)]);
    fireEvent.change(phone, { target: { value: '+-' } });
    fireEvent.click(create);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(created).not.toHaveBeenCalled();
    expect(onCreated).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('creates the lead with phone and name, then clears, notifies and closes', async () => {
    const created = vi.fn(() => ({
      data: { waCreateUserLead: { __typename: 'WaUserLead', id: 'l1', phone: '919876543210', name: 'Asha' } },
    }));
    const { phone, name, create, onCreated, onClose } = renderCreate([
      createMock({ phone: '919876543210', name: 'Asha' }, created),
    ]);
    fireEvent.change(phone, { target: { value: '919876543210' } });
    fireEvent.change(name, { target: { value: 'Asha' } });
    fireEvent.click(create);

    expect(await screen.findByRole('button', { name: 'Saving…' })).toBeDisabled();
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(created).toHaveBeenCalledTimes(1);
    expect(onCreated).toHaveBeenCalledTimes(1);
    expect(phone).toHaveValue('');
    expect(name).toHaveValue('');
  });

  it('omits the name when it is left blank', async () => {
    const created = vi.fn(() => ({
      data: { waCreateUserLead: { __typename: 'WaUserLead', id: 'l2', phone: '919800000000', name: null } },
    }));
    const { phone, create, onCreated } = renderCreate([createMock({ phone: '919800000000' }, created)]);
    fireEvent.change(phone, { target: { value: '919800000000' } });
    fireEvent.click(create);
    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
    expect(created).toHaveBeenCalledTimes(1);
  });

  it('shows the server error under the phone field and stays open', async () => {
    const { phone, create, onCreated, onClose } = renderCreate([
      createMock({ phone: '12' }, { errors: [new GraphQLError('Phone number is invalid')] }),
    ]);
    fireEvent.change(phone, { target: { value: '12' } });
    fireEvent.click(create);

    expect(await screen.findByText('Phone number is invalid')).toBeInTheDocument();
    expect(phone).toHaveAttribute('aria-invalid', 'true');
    expect(phone).toHaveValue('12');
    expect(onCreated).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes on Cancel without creating anything', () => {
    const { onClose, onCreated } = renderCreate();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onCreated).not.toHaveBeenCalled();
  });
});

describe('DeleteLeadsDialog', () => {
  const deleteMock = (ids: string[], result: MockedResponse['result']): MockedResponse => ({
    request: { query: WA_DELETE_USER_LEADS, variables: { ids } },
    result,
  });

  it('stays closed when there is nothing to delete', () => {
    withApollo(<DeleteLeadsDialog ids={[]} onClose={vi.fn()} onDeleted={vi.fn()} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('words a single delete in the singular and reports the deleted count', async () => {
    const onClose = vi.fn();
    const onDeleted = vi.fn();
    withApollo(<DeleteLeadsDialog ids={['l1']} onClose={onClose} onDeleted={onDeleted} />, [
      deleteMock(['l1'], { data: { waDeleteUserLeads: 1 } }),
    ]);
    const dialog = within(screen.getByRole('dialog', { name: 'Delete lead?' }));
    expect(dialog.getByText(/Permanently delete this lead from the database/)).toBeInTheDocument();

    fireEvent.click(dialog.getByRole('button', { name: 'Delete' }));
    expect(await dialog.findByRole('button', { name: 'Deleting…' })).toBeDisabled();
    await waitFor(() => expect(onDeleted).toHaveBeenCalledWith(1));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('words a bulk delete in the plural and reports 0 when the server returns no count', async () => {
    const onDeleted = vi.fn();
    withApollo(<DeleteLeadsDialog ids={['l1', 'l2', 'l3']} onClose={vi.fn()} onDeleted={onDeleted} />, [
      deleteMock(['l1', 'l2', 'l3'], { data: { waDeleteUserLeads: null } }),
    ]);
    const dialog = within(screen.getByRole('dialog', { name: 'Delete leads?' }));
    expect(dialog.getByText(/Permanently delete these 3 leads from the database/)).toBeInTheDocument();

    fireEvent.click(dialog.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(onDeleted).toHaveBeenCalledWith(0));
  });

  it('closes on Cancel without deleting', () => {
    const onClose = vi.fn();
    const onDeleted = vi.fn();
    withApollo(<DeleteLeadsDialog ids={['l1']} onClose={onClose} onDeleted={onDeleted} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onDeleted).not.toHaveBeenCalled();
  });
});

describe('EditLeadDialog', () => {
  const lead: LeadRow = { id: 'l1', phone: '919876543210', name: 'Asha Rao' };

  const updateMock = (input: Record<string, unknown>, result: MockedResponse['result']): MockedResponse => ({
    request: { query: WA_UPDATE_USER_LEAD, variables: { id: 'l1', input } },
    result,
  });

  const renderEdit = (row: LeadRow | null, mocks: MockedResponse[] = []) => {
    const onClose = vi.fn();
    const onSaved = vi.fn();
    withApollo(<EditLeadDialog lead={row} onClose={onClose} onSaved={onSaved} />, mocks);
    return { onClose, onSaved };
  };

  const fields = () => {
    const dialog = within(screen.getByRole('dialog', { name: 'Edit user lead' }));
    return {
      phone: dialog.getByRole('textbox', { name: /Phone \(with country code\)/ }),
      name: dialog.getByRole('textbox', { name: 'Name' }),
      save: dialog.getByRole('button', { name: 'Save' }),
    };
  };

  it('stays closed when no lead is being edited', () => {
    renderEdit(null);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('pre-fills the phone and name of the lead being edited', () => {
    renderEdit(lead);
    const { phone, name, save } = fields();
    expect(phone).toHaveValue('919876543210');
    expect(name).toHaveValue('Asha Rao');
    expect(save).toBeEnabled();
  });

  it('pre-fills an empty name when the server sent the lead without one', () => {
    // waUserLead.name is nullable on the wire even though LeadRow types it as a string.
    renderEdit({ id: 'l1', phone: '919876543210', name: null as unknown as string });
    expect(fields().name).toHaveValue('');
  });

  it('disables Save while the phone is blank', () => {
    renderEdit(lead);
    const { phone, save } = fields();
    fireEvent.change(phone, { target: { value: '  ' } });
    expect(save).toBeDisabled();
  });

  it('does not send a phone with no digits in it', async () => {
    const updated = vi.fn(() => ({ data: { waUpdateUserLead: { id: 'l1', phone: '+-', name: 'Asha Rao' } } }));
    const { onSaved, onClose } = renderEdit(lead, [updateMock({ name: 'Asha Rao', phone: '+-' }, updated)]);
    const { phone, save } = fields();
    fireEvent.change(phone, { target: { value: '+-' } });
    fireEvent.click(save);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(updated).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('saves the edited name and phone, then notifies and closes', async () => {
    const updated = vi.fn(() => ({
      data: { waUpdateUserLead: { __typename: 'WaUserLead', id: 'l1', phone: '919800000000', name: 'Asha R' } },
    }));
    // A short delay keeps the mutation in flight long enough to see the saving state.
    const { onSaved, onClose } = renderEdit(lead, [
      { ...updateMock({ name: 'Asha R', phone: '919800000000' }, updated), delay: 50 },
    ]);
    const { phone, name, save } = fields();
    fireEvent.change(phone, { target: { value: '919800000000' } });
    fireEvent.change(name, { target: { value: 'Asha R' } });
    fireEvent.click(save);

    expect(await screen.findByRole('button', { name: 'Saving…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(updated).toHaveBeenCalledTimes(1);
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('shows the server error under the phone field and stays open', async () => {
    const { onSaved, onClose } = renderEdit(lead, [
      updateMock({ name: 'Asha Rao', phone: '12' }, { errors: [new GraphQLError('Phone number is invalid')] }),
    ]);
    const { phone, save } = fields();
    fireEvent.change(phone, { target: { value: '12' } });
    fireEvent.click(save);

    expect(await screen.findByText('Phone number is invalid')).toBeInTheDocument();
    expect(phone).toHaveAttribute('aria-invalid', 'true');
    expect(onSaved).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes on Cancel without saving', () => {
    const { onClose, onSaved } = renderEdit(lead);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSaved).not.toHaveBeenCalled();
  });
});
