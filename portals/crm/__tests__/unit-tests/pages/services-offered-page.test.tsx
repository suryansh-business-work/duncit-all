import '../helpers/agGridEnv';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import ServicesOfferedPage from '@/pages/data/services-offered';
import {
  CATEGORIES_BY_PARENT,
  CREATE_CRM_SERVICES_OFFERED,
  CRM_SERVICES_OFFERED,
  CRM_SERVICES_OFFERED_TABLE,
  DELETE_CRM_SERVICE_OFFERED,
  UPDATE_CRM_SERVICE_OFFERED,
  type CategoryOption,
  type CrmServiceOfferedRow,
} from '@/api/data.gql';
import { renderWithApollo } from '../helpers/renderWithApollo';

const service: CrmServiceOfferedRow = {
  id: 's1',
  title: 'Sound System',
  slug: 'sound-system',
  super_category_id: 'sc1',
  category_id: 'c1',
  sub_category_id: 'sub1',
  super_category_name: 'Events',
  category_name: 'Audio',
  sub_category_name: 'Speakers',
  applies_to_venue: true,
  applies_to_host: true,
  is_active: true,
  sort_order: 1,
  created_at: '2026-03-09T08:00:00.000Z',
};

// tableQueryToGql() of DuncitTable's initial state (no default sort).
const tableVars = {
  query: { search: null, page: 1, page_size: 25, sort_by: null, sort_dir: 'asc', filters: [] },
};

const tableMock = (rows: CrmServiceOfferedRow[]): MockedResponse => ({
  request: { query: CRM_SERVICES_OFFERED_TABLE, variables: tableVars },
  result: { data: { crmServicesOfferedTable: { total: rows.length, rows } } },
});

const category = (id: string, name: string, parent_id: string | null): CategoryOption => ({
  id,
  name,
  slug: name.toLowerCase(),
  parent_id,
  is_active: true,
  sort_order: 0,
});

const categoriesMock = (level: string, parent_id: string | null, categories: CategoryOption[]): MockedResponse => ({
  request: { query: CATEGORIES_BY_PARENT, variables: { level, parent_id } },
  result: { data: { categories } },
  maxUsageCount: 5,
});

const taxonomyMocks = [
  categoriesMock('SUPER', null, [category('sc1', 'Events', null), category('sc2', 'Pets', null)]),
  categoriesMock('CATEGORY', 'sc1', [category('c1', 'Audio', 'sc1'), category('c2', 'Lighting', 'sc1')]),
  categoriesMock('CATEGORY', 'sc2', []),
  categoriesMock('SUB', 'c1', [category('sub1', 'Speakers', 'c1')]),
  categoriesMock('SUB', 'c2', []),
];

const servicesOfferedRefetch: MockedResponse = {
  request: { query: CRM_SERVICES_OFFERED },
  result: { data: { crmServicesOffered: [] } },
};

const pick = async (scope: HTMLElement, label: RegExp, optionName: string) => {
  const select = within(scope).getByRole('combobox', { name: label });
  await waitFor(() => expect(select).not.toHaveAttribute('aria-disabled'));
  fireEvent.mouseDown(select);
  fireEvent.click(await screen.findByRole('option', { name: optionName }));
};

const addTitle = (scope: HTMLElement, title: string) => {
  const input = within(scope).getByRole('combobox', { name: /Service titles/ });
  fireEvent.change(input, { target: { value: title } });
  fireEvent.keyDown(input, { key: 'Enter' });
};

const openAddDialog = async () => {
  fireEvent.click(screen.getByRole('button', { name: 'Add Service Offered' }));
  return screen.findByRole('dialog');
};

beforeEach(() => {
  window.localStorage.clear();
});

describe('ServicesOfferedPage — add', () => {
  it('creates titles under the picked Super → Category → Sub and reloads the table', async () => {
    const created = vi.fn(() => ({ data: { createCrmServicesOffered: [] } }));
    const added = { ...service, id: 's2', title: 'Catering', slug: 'catering' };
    renderWithApollo(<ServicesOfferedPage />, [
      tableMock([service]),
      ...taxonomyMocks,
      {
        request: {
          query: CREATE_CRM_SERVICES_OFFERED,
          variables: {
            input: {
              super_category_id: 'sc1',
              category_id: 'c1',
              sub_category_id: 'sub1',
              applies_to_venue: true,
              applies_to_host: true,
              titles: ['Catering', 'Decor'],
            },
          },
        },
        result: created,
      },
      tableMock([service, added]),
    ]);
    expect(await screen.findByText('Sound System')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();

    const dialog = await openAddDialog();
    const add = within(dialog).getByRole('button', { name: 'Add' });
    expect(add).toBeDisabled();

    await pick(dialog, /Super Category/, 'Events');
    await pick(dialog, /^Category/, 'Audio');
    await pick(dialog, /Sub Category/, 'Speakers');
    addTitle(dialog, 'Catering');
    addTitle(dialog, '  Decor  ');
    addTitle(dialog, 'Catering');

    expect(within(dialog).getAllByRole('button', { name: /Catering|Decor/ }).map((c) => c.textContent)).toEqual([
      'Catering',
      'Decor',
    ]);
    expect(add).toBeEnabled();
    fireEvent.click(add);

    await waitFor(() => expect(created).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('Catering')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('sends null category ids, the chosen target, and shows the Adding… label while pending', async () => {
    renderWithApollo(<ServicesOfferedPage />, [
      tableMock([service]),
      ...taxonomyMocks,
      {
        request: {
          query: CREATE_CRM_SERVICES_OFFERED,
          variables: {
            input: {
              super_category_id: 'sc1',
              category_id: null,
              sub_category_id: null,
              applies_to_venue: false,
              applies_to_host: true,
              titles: ['Coaching'],
            },
          },
        },
        // Long enough that the pending state is still on screen when it is asserted.
        delay: 300,
        result: { errors: [new GraphQLError('Coaching already exists in Events')] },
      },
    ]);
    await screen.findByText('Sound System');

    const dialog = await openAddDialog();
    await pick(dialog, /Super Category/, 'Events');
    addTitle(dialog, 'Coaching');
    fireEvent.click(within(dialog).getByRole('switch', { name: 'Venue' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add' }));

    expect(await within(dialog).findByRole('button', { name: 'Adding…' })).toBeDisabled();
    expect(await within(dialog).findByText('Coaching already exists in Events')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('explains empty category levels and keeps their pickers disabled', async () => {
    renderWithApollo(<ServicesOfferedPage />, [tableMock([service]), ...taxonomyMocks]);
    await screen.findByText('Sound System');

    const dialog = await openAddDialog();
    expect(within(dialog).getAllByText('Optional')).toHaveLength(2);

    await pick(dialog, /Super Category/, 'Pets');
    expect(await within(dialog).findByText('No categories under this super category')).toBeInTheDocument();
    expect(within(dialog).getByRole('combobox', { name: /^Category/ })).toHaveAttribute('aria-disabled', 'true');

    await pick(dialog, /Super Category/, 'Events');
    await pick(dialog, /^Category/, 'Lighting');
    expect(await within(dialog).findByText('No sub-categories under this category')).toBeInTheDocument();
    expect(within(dialog).getByRole('combobox', { name: /Sub Category/ })).toHaveAttribute('aria-disabled', 'true');
  });

  it('warns and blocks Add when neither Venue nor Host is on, and Both turns both back on', async () => {
    renderWithApollo(<ServicesOfferedPage />, [tableMock([service]), ...taxonomyMocks]);
    await screen.findByText('Sound System');

    const dialog = await openAddDialog();
    await pick(dialog, /Super Category/, 'Events');
    addTitle(dialog, 'Catering');
    const add = within(dialog).getByRole('button', { name: 'Add' });
    expect(add).toBeEnabled();

    fireEvent.click(within(dialog).getByRole('switch', { name: 'Both' }));
    expect(within(dialog).getByRole('switch', { name: 'Venue' })).not.toBeChecked();
    expect(within(dialog).getByRole('switch', { name: 'Host' })).not.toBeChecked();
    expect(within(dialog).getByText('Turn on Venue, Host, or Both.')).toBeInTheDocument();
    expect(add).toBeDisabled();

    fireEvent.click(within(dialog).getByRole('switch', { name: 'Host' }));
    expect(within(dialog).getByRole('switch', { name: 'Host' })).toBeChecked();
    expect(within(dialog).queryByText('Turn on Venue, Host, or Both.')).toBeNull();
    expect(within(dialog).getByRole('switch', { name: 'Both' })).not.toBeChecked();

    fireEvent.click(within(dialog).getByRole('switch', { name: 'Both' }));
    expect(within(dialog).getByRole('switch', { name: 'Venue' })).toBeChecked();
    expect(add).toBeEnabled();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('closes the add dialog on Escape and reopens it with a fresh draft', async () => {
    renderWithApollo(<ServicesOfferedPage />, [tableMock([service]), ...taxonomyMocks]);
    await screen.findByText('Sound System');

    const dialog = await openAddDialog();
    addTitle(dialog, 'Catering');
    expect(within(dialog).getByRole('button', { name: 'Catering' })).toBeInTheDocument();

    fireEvent.keyDown(dialog, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    const reopened = await openAddDialog();
    expect(within(reopened).queryByRole('button', { name: 'Catering' })).toBeNull();
  });
});

describe('ServicesOfferedPage — edit', () => {
  it('saves the edited title, active flag and target, then reloads the table', async () => {
    const updated = vi.fn(() => ({ data: { updateCrmServiceOffered: { ...service, title: 'PA System' } } }));
    renderWithApollo(<ServicesOfferedPage />, [
      tableMock([service]),
      {
        request: {
          query: UPDATE_CRM_SERVICE_OFFERED,
          variables: {
            id: 's1',
            input: { title: 'PA System', is_active: false, applies_to_venue: true, applies_to_host: false },
          },
        },
        delay: 300,
        result: updated,
      },
      servicesOfferedRefetch,
      tableMock([{ ...service, title: 'PA System', is_active: false, applies_to_host: false }]),
    ]);
    await screen.findByText('Sound System');

    fireEvent.click(screen.getByLabelText('Edit Sound System'));
    const dialog = await screen.findByRole('dialog');
    const title = within(dialog).getByRole('textbox', { name: /Title/ });
    expect(title).toHaveValue('Sound System');

    fireEvent.change(title, { target: { value: '  PA System ' } });
    fireEvent.click(within(dialog).getByRole('switch', { name: 'Active' }));
    fireEvent.click(within(dialog).getByRole('switch', { name: 'Host' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(await within(dialog).findByRole('button', { name: 'Saving…' })).toBeDisabled();
    await waitFor(() => expect(updated).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('PA System')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('shows the server error and stays open when the update fails', async () => {
    renderWithApollo(<ServicesOfferedPage />, [
      tableMock([service]),
      {
        request: {
          query: UPDATE_CRM_SERVICE_OFFERED,
          variables: {
            id: 's1',
            input: { title: 'Sound System', is_active: true, applies_to_venue: true, applies_to_host: true },
          },
        },
        result: { errors: [new GraphQLError('A service with this title already exists')] },
      },
    ]);
    await screen.findByText('Sound System');

    fireEvent.click(screen.getByLabelText('Edit Sound System'));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(await within(dialog).findByText('A service with this title already exists')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('disables Save for a blank title or no target, and Cancel closes without saving', async () => {
    renderWithApollo(<ServicesOfferedPage />, [tableMock([service])]);
    await screen.findByText('Sound System');

    fireEvent.click(screen.getByLabelText('Edit Sound System'));
    const dialog = await screen.findByRole('dialog');
    const save = within(dialog).getByRole('button', { name: 'Save' });
    const title = within(dialog).getByRole('textbox', { name: /Title/ });

    fireEvent.change(title, { target: { value: '   ' } });
    expect(save).toBeDisabled();
    fireEvent.change(title, { target: { value: 'Sound System' } });
    expect(save).toBeEnabled();

    fireEvent.click(within(dialog).getByRole('switch', { name: 'Both' }));
    expect(within(dialog).getByText('Turn on Venue, Host, or Both.')).toBeInTheDocument();
    expect(save).toBeDisabled();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});

describe('ServicesOfferedPage — delete', () => {
  it('deletes the confirmed service and reloads the table', async () => {
    const deleted = vi.fn(() => ({ data: { deleteCrmServiceOffered: true } }));
    renderWithApollo(<ServicesOfferedPage />, [
      tableMock([service]),
      { request: { query: DELETE_CRM_SERVICE_OFFERED, variables: { id: 's1' } }, result: deleted },
      tableMock([]),
    ]);
    await screen.findByText('Sound System');

    fireEvent.click(screen.getByLabelText('Delete Sound System'));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Delete "Sound System"?')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(deleted).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/No services yet/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('keeps the service when the delete is cancelled', async () => {
    renderWithApollo(<ServicesOfferedPage />, [tableMock([service])]);
    await screen.findByText('Sound System');

    fireEvent.click(screen.getByLabelText('Delete Sound System'));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByText('Sound System')).toBeInTheDocument();
  });
});
