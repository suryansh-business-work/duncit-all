import { act, fireEvent, screen } from '@testing-library/react-native';

import * as docs from '@/graphql/dynamicFields';
import { gqlRequest } from '@/services/graphql.client';
import { renderWithTheme } from '@/test-utils';
import { DynamicFieldEditorScreen } from '../dynamic-fields/DynamicFieldEditorScreen';
import { DynamicFieldsScreen } from '../dynamic-fields/DynamicFieldsScreen';

jest.mock('crm-telephony', () => ({ CrmTelephony: null }));
jest.mock('@/services/graphql.client', () => ({ gqlRequest: jest.fn() }));
const mockNav = { navigate: jest.fn(), goBack: jest.fn(), setOptions: jest.fn() };
let mockParams: Record<string, unknown> = {};
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNav,
  useRoute: () => ({ params: mockParams }),
  useFocusEffect: (fn: () => void) =>
    jest.requireActual<typeof import('react')>('react').useEffect(fn, [fn]),
}));

/** CRM › Settings › Dynamic Fields: the list (order, on/off, delete) and the add / edit screen. */

const request = gqlRequest as jest.Mock;
const field = (over: Record<string, unknown>) => ({
  id: 'f1',
  name: 'budget_band',
  label: 'Budget Band',
  kind: 'select',
  options: [{ value: 'low', label: 'Low' }],
  multi: true,
  placeholder: '',
  default_value: '',
  hint: 'Monthly spend',
  applies_to_venue: true,
  applies_to_host: false,
  applies_to_ecomm: false,
  applies_to_creator: true,
  applies_to_community: false,
  required: true,
  sort_order: 2,
  is_active: true,
  ...over,
});
const BUDGET = field({});
const REGION = field({
  id: 'f2',
  name: 'region',
  label: 'Region',
  kind: 'textarea',
  options: [],
  multi: false,
  hint: '',
  required: false,
  sort_order: 0,
});
const ZONE = field({
  id: 'f3',
  name: 'zone',
  label: 'Zone',
  kind: 'text',
  options: [],
  multi: false,
  hint: '',
  required: false,
  sort_order: 2,
  is_active: false,
});
type Handler = (vars: Record<string, unknown>) => unknown;
let rows: unknown[] = [BUDGET, REGION, ZONE];
const serve = (overrides: Map<unknown, Handler> = new Map()) =>
  request.mockImplementation(async (doc: unknown, vars: Record<string, unknown> = {}) => {
    const handler = overrides.get(doc);
    if (handler) return handler(vars);
    if (doc === docs.CrmAppDynamicFieldsDocument) return { crmDynamicFields: rows };
    if (doc === docs.CrmAppCreateDynamicFieldDocument)
      return { createCrmDynamicField: { id: 'f9' } };
    if (doc === docs.CrmAppUpdateDynamicFieldDocument)
      return { updateCrmDynamicField: { id: vars.id } };
    if (doc === docs.CrmAppDeleteDynamicFieldDocument) return { deleteCrmDynamicField: true };
    if (doc === docs.CrmAppReorderDynamicFieldsDocument) return { reorderCrmDynamicFields: [] };
    throw new Error('unexpected operation');
  });
const callsTo = (doc: unknown) => request.mock.calls.filter(([d]) => d === doc);
const press = async (testID: string) =>
  act(async () => fireEvent.press(screen.getByTestId(testID)));

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
  rows = [BUDGET, REGION, ZONE];
  serve();
});

describe('DynamicFieldsScreen', () => {
  it('lists every field in order with its chips, type and lead kinds, and opens the editor', async () => {
    renderWithTheme(<DynamicFieldsScreen />);
    expect(await screen.findByText('Budget Band')).toBeOnTheScreen();
    expect(mockNav.setOptions).toHaveBeenCalledWith({ title: 'Dynamic Fields' });
    expect(callsTo(docs.CrmAppDynamicFieldsDocument)[0]?.[1]).toEqual({ include_inactive: true });
    expect(screen.getByText('Required')).toBeOnTheScreen();
    expect(screen.getByText('Multi')).toBeOnTheScreen();
    expect(screen.getByText('Monthly spend')).toBeOnTheScreen();
    expect(screen.getByText('Long text')).toBeOnTheScreen();
    expect(screen.getAllByText('Venue')).toHaveLength(3);
    expect(screen.getAllByText('Creator')).toHaveLength(3);
    // The first field cannot move up, nor the last one down.
    expect(screen.getByTestId('dynamic-field-up-region')).toBeDisabled();
    expect(screen.getByTestId('dynamic-field-down-zone')).toBeDisabled();
    expect(screen.getByTestId('dynamic-field-down-region')).not.toBeDisabled();
    fireEvent.press(screen.getByTestId('dynamic-field-edit-region'));
    expect(mockNav.navigate).toHaveBeenCalledWith('DynamicFieldEditor', { id: 'f2' });
    fireEvent.press(screen.getByTestId('dynamic-fields-add'));
    expect(mockNav.navigate).toHaveBeenCalledWith('DynamicFieldEditor', {});
  });

  it('saves the new order when a field moves, and shows why a move failed', async () => {
    serve(
      new Map<unknown, Handler>([
        [
          docs.CrmAppReorderDynamicFieldsDocument,
          () => Promise.reject(new Error('Order is stale')),
        ],
      ]),
    );
    renderWithTheme(<DynamicFieldsScreen />);
    await screen.findByText('Region');
    await press('dynamic-field-down-region');
    expect(callsTo(docs.CrmAppReorderDynamicFieldsDocument)[0]?.[1]).toEqual({
      ids: ['f1', 'f2', 'f3'],
    });
    expect(await screen.findByText('Order is stale')).toBeOnTheScreen();
  });

  it('switches a field off with its whole input, and refuses a stored Select with no options', async () => {
    rows = [
      BUDGET,
      field({ id: 'f4', name: 'broken', label: 'Broken', options: [], sort_order: 5 }),
    ];
    renderWithTheme(<DynamicFieldsScreen />);
    await screen.findByText('Budget Band');
    await act(async () => fireEvent.press(screen.getByTestId('dynamic-field-active-budget_band')));
    expect(callsTo(docs.CrmAppUpdateDynamicFieldDocument)[0]?.[1]).toEqual({
      id: 'f1',
      input: expect.objectContaining({
        name: 'budget_band',
        is_active: false,
        sort_order: 2,
        multi: true,
        options: [{ value: 'low', label: 'Low' }],
      }),
    });
    await act(async () => fireEvent.press(screen.getByTestId('dynamic-field-active-broken')));
    expect(screen.getByText('Add at least one option for a Select field.')).toBeOnTheScreen();
    expect(callsTo(docs.CrmAppUpdateDynamicFieldDocument)).toHaveLength(1);
  });

  it('deletes a field only after confirming', async () => {
    renderWithTheme(<DynamicFieldsScreen />);
    await screen.findByText('Budget Band');
    fireEvent.press(screen.getByTestId('dynamic-field-delete-budget_band'));
    expect(
      screen.getByText(
        'Delete "Budget Band"? Existing values on leads stay in the database but are no longer rendered.',
      ),
    ).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('dynamic-field-delete-dialog-cancel'));
    expect(callsTo(docs.CrmAppDeleteDynamicFieldDocument)).toHaveLength(0);
    fireEvent.press(screen.getByTestId('dynamic-field-delete-budget_band'));
    await press('dynamic-field-delete-dialog-confirm');
    expect(callsTo(docs.CrmAppDeleteDynamicFieldDocument)[0]?.[1]).toEqual({ id: 'f1' });
  });

  it('says when there are no fields yet, and offers a retry when the list fails', async () => {
    rows = [];
    const { unmount } = renderWithTheme(<DynamicFieldsScreen />);
    expect(
      await screen.findByText(
        'No dynamic fields yet. Click "New field" to add one — it will appear on every lead edit form.',
      ),
    ).toBeOnTheScreen();
    unmount();
    serve(
      new Map<unknown, Handler>([
        [docs.CrmAppDynamicFieldsDocument, () => Promise.reject(new Error('Not authorised'))],
      ]),
    );
    renderWithTheme(<DynamicFieldsScreen />);
    expect(await screen.findByText('Not authorised')).toBeOnTheScreen();
    expect(screen.getByTestId('state-retry')).toBeOnTheScreen();
  });
});

describe('DynamicFieldEditorScreen', () => {
  it('asks for a label and a lead kind, then adds the field at the end with a key made from its label', async () => {
    renderWithTheme(<DynamicFieldEditorScreen />);
    await screen.findByTestId('dynamic-field-label');
    expect(mockNav.setOptions).toHaveBeenCalledWith({ title: 'New field' });
    fireEvent.press(screen.getByTestId('dynamic-field-applies_to_venue'));
    fireEvent.press(screen.getByTestId('dynamic-field-applies_to_host'));
    await press('dynamic-field-save');
    expect(screen.getByText('Label is required')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Pick at least one of: applies to Venue / Host / Ecomm / Creator / Community.',
      ),
    ).toBeOnTheScreen();
    fireEvent.changeText(screen.getByTestId('dynamic-field-label'), 'Venue Size');
    fireEvent.press(screen.getByTestId('dynamic-field-applies_to_community'));
    fireEvent.press(screen.getByTestId('dynamic-field-required'));
    await press('dynamic-field-save');
    expect(callsTo(docs.CrmAppCreateDynamicFieldDocument)[0]?.[1]).toEqual({
      input: expect.objectContaining({
        name: 'venue_size',
        label: 'Venue Size',
        kind: 'text',
        applies_to_venue: false,
        applies_to_community: true,
        required: true,
        sort_order: 3,
        options: [],
      }),
    });
    expect(mockNav.goBack).toHaveBeenCalled();
  });

  it('needs an option for a Select, and saves its options and selection mode', async () => {
    renderWithTheme(<DynamicFieldEditorScreen />);
    fireEvent.changeText(await screen.findByTestId('dynamic-field-label'), 'Seating');
    fireEvent.press(screen.getByTestId('dynamic-field-kind-select'));
    await press('dynamic-field-save');
    expect(screen.getByText('Add at least one option for a Select field.')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('dynamic-field-add-option'));
    fireEvent.press(screen.getByTestId('dynamic-field-add-option'));
    fireEvent.changeText(screen.getByTestId('dynamic-field-option-value-0'), 'indoor');
    fireEvent.changeText(screen.getByTestId('dynamic-field-option-label-0'), 'Indoor');
    fireEvent.press(screen.getByTestId('dynamic-field-option-remove-1'));
    fireEvent.press(screen.getByTestId('dynamic-field-multiple'));
    await press('dynamic-field-save');
    expect(callsTo(docs.CrmAppCreateDynamicFieldDocument)[0]?.[1].input).toMatchObject({
      kind: 'select',
      multi: true,
      options: [{ value: 'indoor', label: 'Indoor' }],
    });
  });

  it('edits a saved field in place, keeping its key and place, and shows why a save failed', async () => {
    mockParams = { id: 'f1' };
    serve(
      new Map<unknown, Handler>([
        [docs.CrmAppUpdateDynamicFieldDocument, () => Promise.reject(new Error('Field is locked'))],
      ]),
    );
    renderWithTheme(<DynamicFieldEditorScreen />);
    const label = await screen.findByTestId('dynamic-field-label');
    expect(label.props.value).toBe('Budget Band');
    expect(mockNav.setOptions).toHaveBeenCalledWith({ title: 'Edit field — Budget Band' });
    fireEvent.changeText(label, 'Spend band');
    fireEvent.press(screen.getByTestId('dynamic-field-single'));
    await press('dynamic-field-save');
    expect(callsTo(docs.CrmAppUpdateDynamicFieldDocument)[0]?.[1]).toEqual({
      id: 'f1',
      input: expect.objectContaining({
        name: 'budget_band',
        label: 'Spend band',
        sort_order: 2,
        multi: false,
      }),
    });
    expect(await screen.findByText('Field is locked')).toBeOnTheScreen();
    expect(mockNav.goBack).not.toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('dynamic-field-cancel'));
    expect(mockNav.goBack).toHaveBeenCalled();
  });

  it('says when the field to edit no longer exists', async () => {
    mockParams = { id: 'gone' };
    renderWithTheme(<DynamicFieldEditorScreen />);
    expect(
      await screen.findByText('This field was not found. It may have been deleted.'),
    ).toBeOnTheScreen();
  });

  it('offers a retry when the fields cannot be read', async () => {
    serve(
      new Map<unknown, Handler>([
        [docs.CrmAppDynamicFieldsDocument, () => Promise.reject(new Error('Not authorised'))],
      ]),
    );
    renderWithTheme(<DynamicFieldEditorScreen />);
    expect(await screen.findByText('Not authorised')).toBeOnTheScreen();
    expect(screen.getByTestId('state-retry')).toBeOnTheScreen();
  });
});
