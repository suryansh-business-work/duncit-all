import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import type { DocumentNode } from 'graphql';
import type { MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import ManageDynamicFieldsPage from '@/pages/ManageDynamicFieldsPage';
import {
  CREATE_CRM_DYNAMIC_FIELD,
  CRM_DYNAMIC_FIELDS,
  DELETE_CRM_DYNAMIC_FIELD,
  REORDER_CRM_DYNAMIC_FIELDS,
  UPDATE_CRM_DYNAMIC_FIELD,
} from '@/api/crm.gql';
import type { CrmDynamicField } from '@/api/crm.types';

const row = {
  id: 'f1',
  name: 'budget_band',
  label: 'Budget Band',
  kind: 'select',
  options: [
    { value: 'low', label: 'Low' },
    { value: 'high', label: 'High' },
  ],
  multi: false,
  placeholder: '',
  default_value: '',
  hint: '',
  applies_to_venue: true,
  applies_to_host: true,
  required: false,
  sort_order: 1,
  is_active: true,
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
};

const listMock = () => ({
  request: { query: CRM_DYNAMIC_FIELDS, variables: { include_inactive: true } },
  result: { data: { crmDynamicFields: [row] } },
});

const wrap = (mocks: any[]) =>
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      <ManageDynamicFieldsPage />
    </MockedProvider>
  );

describe('ManageDynamicFieldsPage', () => {
  it('renders the title and a row from the catalogue', async () => {
    wrap([listMock()]);
    expect(await screen.findByText(/Dynamic Fields/)).toBeTruthy();
    expect(await screen.findByText('Budget Band')).toBeTruthy();
  });

  it('opens the new-field draft panel on click', async () => {
    wrap([listMock()]);
    await screen.findByText('Budget Band');
    fireEvent.click(screen.getByRole('button', { name: /New field/i }));
    // The auto-generated key input is gone; the Label input identifies the form.
    expect(screen.getByLabelText('dynamic-field-label')).toBeTruthy();
    expect(screen.getByLabelText('dynamic-field-placeholder')).toBeTruthy();
    expect(screen.getByLabelText('dynamic-field-hint')).toBeTruthy();
  });

  it('shows validation error when label is empty and Save is pressed', async () => {
    wrap([listMock()]);
    await screen.findByText('Budget Band');
    fireEvent.click(screen.getByRole('button', { name: /New field/i }));
    fireEvent.click(screen.getByRole('button', { name: /Save field/i }));
    expect(await screen.findByText(/Label is required/i)).toBeTruthy();
  });

  it('shows validation error when neither Venue nor Host applies', async () => {
    wrap([listMock()]);
    await screen.findByText('Budget Band');
    fireEvent.click(screen.getByRole('button', { name: /New field/i }));
    fireEvent.change(screen.getByLabelText('dynamic-field-label'), { target: { value: 'X' } });
    fireEvent.click(screen.getByLabelText(/Applies to Venue/i));
    fireEvent.click(screen.getByLabelText(/Applies to Host/i));
    fireEvent.click(screen.getByRole('button', { name: /Save field/i }));
    expect(await screen.findByText(/applies to Venue \/ Host/i)).toBeTruthy();
  });
});

describe('ManageDynamicFieldsPage mutations', () => {
  const field = (over: Partial<CrmDynamicField>): CrmDynamicField => ({
    id: 'f1',
    name: 'budget_band',
    label: 'Budget Band',
    kind: 'text',
    options: [],
    multi: false,
    placeholder: '',
    default_value: '',
    hint: '',
    applies_to_venue: true,
    applies_to_host: true,
    applies_to_ecomm: false,
    required: false,
    sort_order: 1,
    is_active: true,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    ...over,
  });
  const budget = field({});
  const region = field({ id: 'f2', name: 'region', label: 'Region', sort_order: 4 });

  /** The page list, then every refetch the mutations trigger, all answered with `rows`. */
  const lists = (rows: CrmDynamicField[]): MockedResponse[] => [
    {
      request: { query: CRM_DYNAMIC_FIELDS, variables: { include_inactive: true } },
      result: { data: { crmDynamicFields: rows } },
      maxUsageCount: 10,
    },
    ...['VENUE_LEAD', 'HOST_LEAD'].map((entity) => ({
      request: { query: CRM_DYNAMIC_FIELDS, variables: { entity, include_inactive: false } },
      result: { data: { crmDynamicFields: rows } },
      maxUsageCount: 10,
    })),
  ];

  /** Answers `query` with `outcome` and records the variables each call sent. */
  const mutation = (
    query: DocumentNode,
    sent: Record<string, any>[],
    outcome: { data: Record<string, unknown> } | { error: Error },
  ): MockedResponse => {
    const request = {
      query,
      variables: (vars: Record<string, any>) => {
        sent.push(vars);
        return true;
      },
    };
    return 'error' in outcome ? { request, error: outcome.error } : { request, result: { data: outcome.data } };
  };

  const rowOf = (name: string) => within(screen.getByTestId(`dynamic-field-row-${name}`));

  it('creates a new field at the end of the list and closes the form', async () => {
    const sent: Record<string, any>[] = [];
    wrap([
      ...lists([budget, region]),
      mutation(CREATE_CRM_DYNAMIC_FIELD, sent, { data: { createCrmDynamicField: field({ id: 'f3' }) } }),
    ]);
    await screen.findByText('Region');

    fireEvent.click(screen.getByRole('button', { name: /New field/i }));
    fireEvent.change(screen.getByLabelText('dynamic-field-label'), { target: { value: 'Venue Size' } });
    fireEvent.change(screen.getByLabelText('dynamic-field-hint'), { target: { value: ' sq ft ' } });
    fireEvent.click(screen.getByRole('button', { name: /Save field/i }));

    await waitFor(() => expect(screen.queryByLabelText('dynamic-field-label')).toBeNull());
    expect(sent[0]).toEqual({
      input: {
        name: 'venue_size',
        label: 'Venue Size',
        kind: 'text',
        options: [],
        multi: false,
        placeholder: '',
        default_value: '',
        hint: 'sq ft',
        applies_to_venue: true,
        applies_to_host: true,
        applies_to_ecomm: false,
        required: false,
        sort_order: 2,
        is_active: true,
      },
    });
  });

  it('updates an edited field in place, keeping its key and position', async () => {
    const sent: Record<string, any>[] = [];
    wrap([...lists([budget, region]), mutation(UPDATE_CRM_DYNAMIC_FIELD, sent, { data: { updateCrmDynamicField: region } })]);
    await screen.findByText('Region');

    fireEvent.click(rowOf('region').getByRole('button', { name: 'Edit' }));
    expect(screen.getByRole('heading', { name: 'Edit field — Region' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('dynamic-field-label'), { target: { value: 'City Region' } });
    fireEvent.click(screen.getByRole('button', { name: /Save field/i }));

    await waitFor(() => expect(screen.queryByLabelText('dynamic-field-label')).toBeNull());
    expect(sent[0]).toEqual({
      id: 'f2',
      input: expect.objectContaining({ name: 'region', label: 'City Region', sort_order: 4 }),
    });
  });

  it('saves an edited field at position 0 when it vanished from the refreshed list', async () => {
    const sent: Record<string, any>[] = [];
    wrap([
      {
        request: { query: CRM_DYNAMIC_FIELDS, variables: { include_inactive: true } },
        result: { data: { crmDynamicFields: [budget, region] } },
      },
      // Toggling Budget refetches the list, which no longer carries Region.
      ...lists([budget]),
      mutation(UPDATE_CRM_DYNAMIC_FIELD, sent, { data: { updateCrmDynamicField: budget } }),
      mutation(UPDATE_CRM_DYNAMIC_FIELD, sent, { data: { updateCrmDynamicField: region } }),
    ]);
    await screen.findByText('Region');

    fireEvent.click(rowOf('region').getByRole('button', { name: 'Edit' }));
    fireEvent.click(rowOf('budget_band').getByRole('switch'));
    await waitFor(() => expect(screen.queryByTestId('dynamic-field-row-region')).toBeNull());
    fireEvent.click(screen.getByRole('button', { name: /Save field/i }));

    await waitFor(() => expect(sent).toHaveLength(2));
    expect(sent[1]).toEqual({ id: 'f2', input: expect.objectContaining({ name: 'region', sort_order: 0 }) });
  });

  it('keeps the form open and shows a dismissible error when saving fails', async () => {
    wrap([...lists([budget]), mutation(CREATE_CRM_DYNAMIC_FIELD, [], { error: new Error('Key already exists') })]);
    await screen.findByText('Budget Band');

    fireEvent.click(screen.getByRole('button', { name: /New field/i }));
    fireEvent.change(screen.getByLabelText('dynamic-field-label'), { target: { value: 'Budget Band' } });
    fireEvent.click(screen.getByRole('button', { name: /Save field/i }));

    expect(await screen.findByText('Key already exists')).toBeInTheDocument();
    expect(screen.getByLabelText('dynamic-field-label')).toHaveValue('Budget Band');
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByText('Key already exists')).toBeNull();
  });

  it('orders fields by position, then alphabetically by label', async () => {
    wrap(lists([field({ id: 'z', name: 'zone', label: 'Zone', sort_order: 1 }), field({ id: 'a', name: 'area', label: 'Area', sort_order: 1 }), field({ id: 'p', name: 'pin', label: 'Pin', sort_order: 0 })]));
    await screen.findByText('Zone');

    const names = screen.getAllByTestId(/^dynamic-field-row-/).map((r) => r.dataset.testid);
    expect(names).toEqual(['dynamic-field-row-pin', 'dynamic-field-row-area', 'dynamic-field-row-zone']);
  });

  it('shows why the field list could not be loaded', async () => {
    wrap([{ request: { query: CRM_DYNAMIC_FIELDS, variables: { include_inactive: true } }, error: new Error('Not authorised') }]);

    expect(await screen.findByText('Not authorised')).toBeInTheDocument();
  });

  it('keeps the field when the delete confirmation is dismissed', async () => {
    const sent: Record<string, any>[] = [];
    wrap([...lists([budget]), mutation(DELETE_CRM_DYNAMIC_FIELD, sent, { data: { deleteCrmDynamicField: true } })]);
    await screen.findByText('Budget Band');

    fireEvent.click(rowOf('budget_band').getByRole('button', { name: 'Delete' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(sent).toHaveLength(0);
    expect(screen.getByText('Budget Band')).toBeInTheDocument();
  });

  it('cancelling the form discards the draft and its error', async () => {
    wrap(lists([budget]));
    await screen.findByText('Budget Band');

    fireEvent.click(screen.getByRole('button', { name: /New field/i }));
    fireEvent.click(screen.getByRole('button', { name: /Save field/i }));
    expect(await screen.findByText('Label is required')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByLabelText('dynamic-field-label')).toBeNull();
    expect(screen.queryByText('Label is required')).toBeNull();
    expect(screen.getByRole('button', { name: /New field/i })).toBeEnabled();
  });

  it('deactivates a field from its switch', async () => {
    const sent: Record<string, any>[] = [];
    wrap([...lists([budget]), mutation(UPDATE_CRM_DYNAMIC_FIELD, sent, { data: { updateCrmDynamicField: budget } })]);
    await screen.findByText('Budget Band');

    fireEvent.click(rowOf('budget_band').getByRole('switch'));

    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).toEqual({
      id: 'f1',
      input: expect.objectContaining({ name: 'budget_band', is_active: false, sort_order: 1 }),
    });
  });

  it('reports a failed activation toggle', async () => {
    wrap([...lists([budget]), mutation(UPDATE_CRM_DYNAMIC_FIELD, [], { error: new Error('Field is locked') })]);
    await screen.findByText('Budget Band');

    fireEvent.click(rowOf('budget_band').getByRole('switch'));

    expect(await screen.findByText('Field is locked')).toBeInTheDocument();
  });

  it('sends nothing and says why when toggling a stored field that no longer validates', async () => {
    const sent: Record<string, any>[] = [];
    const broken = field({ kind: 'select', options: [] });
    wrap([...lists([broken]), mutation(UPDATE_CRM_DYNAMIC_FIELD, sent, { data: { updateCrmDynamicField: broken } })]);
    await screen.findByText('Budget Band');

    fireEvent.click(rowOf('budget_band').getByRole('switch'));

    expect(await screen.findByRole('alert')).toHaveTextContent('Add at least one option for a Select field.');
    // Give a would-be mutation the chance to fire before asserting it did not.
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(sent).toHaveLength(0);
  });

  it('saves a new order when a row is moved down', async () => {
    const sent: Record<string, any>[] = [];
    wrap([
      ...lists([budget, region]),
      mutation(REORDER_CRM_DYNAMIC_FIELDS, sent, { data: { reorderCrmDynamicFields: [region, budget] } }),
    ]);
    await screen.findByText('Region');

    fireEvent.click(rowOf('budget_band').getByTestId('crm-dynamic-field-move-down'));

    await waitFor(() => expect(sent).toEqual([{ ids: ['f2', 'f1'] }]));
  });

  it('reports a failed reorder', async () => {
    wrap([...lists([budget, region]), mutation(REORDER_CRM_DYNAMIC_FIELDS, [], { error: new Error('Order is stale') })]);
    await screen.findByText('Region');

    fireEvent.click(rowOf('region').getByTestId('crm-dynamic-field-move-up'));

    expect(await screen.findByText('Order is stale')).toBeInTheDocument();
  });

  it('deletes a field after confirmation', async () => {
    const sent: Record<string, any>[] = [];
    wrap([...lists([budget]), mutation(DELETE_CRM_DYNAMIC_FIELD, sent, { data: { deleteCrmDynamicField: true } })]);
    await screen.findByText('Budget Band');

    fireEvent.click(rowOf('budget_band').getByRole('button', { name: 'Delete' }));
    const dialog = within(await screen.findByRole('dialog'));
    expect(
      dialog.getByText('Delete "Budget Band"? Existing values on leads stay in the database but are no longer rendered.'),
    ).toBeInTheDocument();
    fireEvent.click(dialog.getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(sent).toEqual([{ id: 'f1' }]);
  });

  it('closes the confirmation and reports a failed delete', async () => {
    wrap([...lists([budget]), mutation(DELETE_CRM_DYNAMIC_FIELD, [], { error: new Error('Field is in use') })]);
    await screen.findByText('Budget Band');

    fireEvent.click(rowOf('budget_band').getByRole('button', { name: 'Delete' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete' }));

    expect(await screen.findByText('Field is in use')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});
