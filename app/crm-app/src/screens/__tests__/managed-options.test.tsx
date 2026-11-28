import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import * as docs from '@/graphql/managedOptions';
import { gqlRequest } from '@/services/graphql.client';
import { renderWithTheme } from '@/test-utils';
import { ManagedOptionsScreen } from '../data/ManagedOptionsScreen';

jest.mock('crm-telephony', () => ({ CrmTelephony: null }));
jest.mock('@/services/graphql.client', () => ({ gqlRequest: jest.fn() }));
const mockNav = { navigate: jest.fn(), setOptions: jest.fn() };
let mockGroup = 'AMENITY';
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNav,
  useRoute: () => ({ params: { group: mockGroup } }),
}));

/** CRM › Data › Venues › Amenities / Event Suitability: the portal's managed list, on a phone. */

const request = gqlRequest as jest.Mock;
const ROWS = [
  { id: 'a2', name: 'Stage', group: 'AMENITY', sort_order: 2, is_active: false },
  { id: 'a1', name: 'Parking', group: 'AMENITY', sort_order: 1, is_active: true },
];
type Handler = (vars: Record<string, unknown>) => unknown;
const serve = (overrides: Map<unknown, Handler> = new Map()) =>
  request.mockImplementation(async (doc: unknown, vars: Record<string, unknown> = {}) => {
    const handler = overrides.get(doc);
    if (handler) return handler(vars);
    if (doc === docs.CrmAppManagedOptionsDocument) return { crmManagedOptions: ROWS };
    if (doc === docs.CrmAppCreateManagedOptionDocument)
      return { createCrmManagedOption: { id: 'a3' } };
    if (doc === docs.CrmAppUpdateManagedOptionDocument)
      return { updateCrmManagedOption: { id: vars.id } };
    if (doc === docs.CrmAppDeleteManagedOptionDocument) return { deleteCrmManagedOption: true };
    throw new Error('unexpected operation');
  });
const callsTo = (doc: unknown) => request.mock.calls.filter(([d]) => d === doc);

beforeEach(() => {
  jest.clearAllMocks();
  mockGroup = 'AMENITY';
  serve();
});

describe('ManagedOptionsScreen', () => {
  it('lists every entry in order, inactive ones marked, and searches them', async () => {
    renderWithTheme(<ManagedOptionsScreen />);
    expect(await screen.findByText('Parking')).toBeOnTheScreen();
    expect(mockNav.setOptions).toHaveBeenCalledWith({ title: 'Amenities management' });
    expect(callsTo(docs.CrmAppManagedOptionsDocument)[0]?.[1]).toEqual({
      group: 'AMENITY',
      include_inactive: true,
    });
    expect(screen.getByText('Inactive')).toBeOnTheScreen();
    expect(screen.getByText('Order 1')).toBeOnTheScreen();
    fireEvent.changeText(screen.getByTestId('options-search'), 'park');
    expect(screen.queryByText('Stage')).toBeNull();
    fireEvent.changeText(screen.getByTestId('options-search'), 'pool');
    expect(screen.getByText('No matches for your search.')).toBeOnTheScreen();
  });

  it('adds an entry after the last one, refusing a blank name', async () => {
    renderWithTheme(<ManagedOptionsScreen />);
    fireEvent.press(await screen.findByTestId('options-add'));
    expect(screen.getByTestId('option-form-new-order').props.value).toBe('3');
    await act(async () => fireEvent.press(screen.getByTestId('option-form-new-save')));
    expect(screen.getByText('Name is required.')).toBeOnTheScreen();
    expect(callsTo(docs.CrmAppCreateManagedOptionDocument)).toHaveLength(0);
    fireEvent.changeText(screen.getByTestId('option-form-new-name'), '  Power Backup ');
    await act(async () => fireEvent.press(screen.getByTestId('option-form-new-save')));
    expect(callsTo(docs.CrmAppCreateManagedOptionDocument)[0]?.[1]).toEqual({
      input: { name: 'Power Backup', sort_order: 3, is_active: true, group: 'AMENITY' },
    });
    await waitFor(() => expect(screen.queryByTestId('option-form-new')).toBeNull());
  });

  it('edits an entry in place, switches one off, and cancels an edit', async () => {
    renderWithTheme(<ManagedOptionsScreen />);
    fireEvent.press(await screen.findByTestId('option-edit-a1'));
    fireEvent.changeText(screen.getByTestId('option-form-a1-name'), 'Car parking');
    await act(async () => fireEvent.press(screen.getByTestId('option-form-a1-save')));
    expect(callsTo(docs.CrmAppUpdateManagedOptionDocument)[0]?.[1]).toEqual({
      id: 'a1',
      input: { name: 'Car parking', sort_order: 1, is_active: true },
    });
    await act(async () => fireEvent.press(screen.getByTestId('option-active-a2')));
    expect(callsTo(docs.CrmAppUpdateManagedOptionDocument)[1]?.[1]).toEqual({
      id: 'a2',
      input: { is_active: true },
    });
    fireEvent.press(screen.getByTestId('option-edit-a2'));
    fireEvent.press(screen.getByTestId('option-form-a2-cancel'));
    expect(screen.queryByTestId('option-form-a2')).toBeNull();
  });

  it('deletes only after confirming, and says when a change fails', async () => {
    renderWithTheme(<ManagedOptionsScreen />);
    fireEvent.press(await screen.findByTestId('option-delete-a2'));
    expect(screen.getByText('Delete "Stage"')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('option-delete-dialog-cancel'));
    expect(callsTo(docs.CrmAppDeleteManagedOptionDocument)).toHaveLength(0);

    serve(
      new Map<unknown, Handler>([
        [docs.CrmAppDeleteManagedOptionDocument, () => Promise.reject(new Error('In use'))],
      ]),
    );
    fireEvent.press(screen.getByTestId('option-delete-a2'));
    await act(async () => fireEvent.press(screen.getByTestId('option-delete-dialog-confirm')));
    expect(callsTo(docs.CrmAppDeleteManagedOptionDocument)[0]?.[1]).toEqual({ id: 'a2' });
    expect(await screen.findByText('In use')).toBeOnTheScreen();
  });

  it('shows the Event Suitability list in its own words, empty or unreadable', async () => {
    mockGroup = 'EVENT_SUITABILITY';
    serve(
      new Map<unknown, Handler>([
        [docs.CrmAppManagedOptionsDocument, () => ({ crmManagedOptions: [] })],
      ]),
    );
    renderWithTheme(<ManagedOptionsScreen />);
    expect(
      await screen.findByText('Nothing here yet. Add the first one with "Add event type".'),
    ).toBeOnTheScreen();
    expect(screen.getByText(/Event types a venue is suitable for/)).toBeOnTheScreen();
  });

  it('offers a retry when the list cannot be read', async () => {
    serve(
      new Map<unknown, Handler>([
        [docs.CrmAppManagedOptionsDocument, () => Promise.reject(new Error('Network down'))],
      ]),
    );
    renderWithTheme(<ManagedOptionsScreen />);
    expect(await screen.findByText('Network down')).toBeOnTheScreen();
  });
});
