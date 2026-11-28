import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import * as docs from '@/graphql/servicesOffered';
import { gqlRequest } from '@/services/graphql.client';
import { renderWithTheme } from '@/test-utils';
import { ServiceOfferedEditorScreen } from '../services-offered/ServiceOfferedEditorScreen';

jest.mock('crm-telephony', () => ({ CrmTelephony: null }));
jest.mock('@/services/graphql.client', () => ({ gqlRequest: jest.fn() }));
const mockNav = { navigate: jest.fn(), goBack: jest.fn(), setOptions: jest.fn() };
let mockParams: Record<string, unknown> = {};
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNav,
  useRoute: () => ({ params: mockParams }),
}));

/** Add Service Offered (Super → Category → Sub, several titles, lead types) and edit one. */

const request = gqlRequest as jest.Mock;
const cat = (id: string, name: string, sort_order = 0, is_active = true) => ({
  id,
  name,
  is_active,
  sort_order,
});
const CATEGORIES: Record<string, unknown[]> = {
  'SUPER:': [cat('sc2', 'Pets', 1), cat('sc1', 'Events', 0), cat('sc9', 'Retired', 0, false)],
  'CATEGORY:sc1': [cat('c2', 'Lighting', 1), cat('c1', 'Audio', 1)],
  'CATEGORY:sc2': [],
  'SUB:c1': [cat('sub1', 'Speakers')],
  'SUB:c2': [],
};
type Handler = (vars: Record<string, unknown>) => unknown;
const serve = (overrides: Map<unknown, Handler> = new Map()) =>
  request.mockImplementation(async (doc: unknown, vars: Record<string, unknown> = {}) => {
    const handler = overrides.get(doc);
    if (handler) return handler(vars);
    if (doc === docs.CrmAppCategoriesByParentDocument)
      return { categories: CATEGORIES[`${String(vars.level)}:${String(vars.parent_id ?? '')}`] };
    if (doc === docs.CrmAppCreateServicesOfferedDocument)
      return { createCrmServicesOffered: [{ id: 's9' }] };
    if (doc === docs.CrmAppUpdateServiceOfferedDocument)
      return { updateCrmServiceOffered: { id: vars.id } };
    throw new Error('unexpected operation');
  });
const callsTo = (doc: unknown) => request.mock.calls.filter(([d]) => d === doc);
/** Flip a switch and check it landed where the step expects. */
const toggle = async (id: string, on: boolean) => {
  await act(async () => fireEvent.press(screen.getByTestId(id)));
  if (on) expect(screen.getByTestId(id)).toBeChecked();
  else expect(screen.getByTestId(id)).not.toBeChecked();
};
const addTitle = (title: string) => {
  fireEvent.changeText(screen.getByTestId('service-titles-input'), title);
  fireEvent.press(screen.getByTestId('service-titles-add'));
};
const NONE_ON = {
  applies_to_venue: false,
  applies_to_host: false,
  applies_to_ecomm: false,
  applies_to_creator: false,
  applies_to_community: false,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
  serve();
});

describe('ServiceOfferedEditorScreen — add', () => {
  it('adds several titles under the picked Super → Category → Sub, venue and host on', async () => {
    renderWithTheme(<ServiceOfferedEditorScreen />);
    expect(mockNav.setOptions).toHaveBeenCalledWith({ title: 'Add Service Offered' });
    const submit = screen.getByTestId('service-add-submit');
    expect(submit).toBeDisabled();
    // Active super categories only, by place then name.
    expect(await screen.findByTestId('service-super-sc1')).toBeOnTheScreen();
    expect(screen.queryByTestId('service-super-sc9')).toBeNull();
    expect(screen.getByText('Top-level category')).toBeOnTheScreen();
    expect(screen.getAllByText('Optional')).toHaveLength(2);

    fireEvent.press(screen.getByTestId('service-super-sc1'));
    fireEvent.press(await screen.findByTestId('service-category-c1'));
    fireEvent.press(await screen.findByTestId('service-sub-sub1'));
    expect(callsTo(docs.CrmAppCategoriesByParentDocument).map(([, v]) => v)).toEqual([
      { level: 'SUPER', parent_id: null },
      { level: 'CATEGORY', parent_id: 'sc1' },
      { level: 'SUB', parent_id: 'c1' },
    ]);

    addTitle('Catering');
    fireEvent.changeText(screen.getByTestId('service-titles-input'), '  Decor  ');
    fireEvent(screen.getByTestId('service-titles-input'), 'submitEditing');
    addTitle('Catering');
    expect(screen.getAllByText(/^(Catering|Decor)$/).map((n) => n.props.children)).toEqual([
      'Catering',
      'Decor',
    ]);
    expect(screen.getByTestId('service-titles-input').props.value).toBe('');

    await waitFor(() => expect(submit).not.toBeDisabled());
    await act(async () => fireEvent.press(submit));
    await waitFor(() => expect(callsTo(docs.CrmAppCreateServicesOfferedDocument)).toHaveLength(1));
    expect(callsTo(docs.CrmAppCreateServicesOfferedDocument)[0]?.[1]).toEqual({
      input: {
        super_category_id: 'sc1',
        category_id: 'c1',
        sub_category_id: 'sub1',
        ...NONE_ON,
        applies_to_venue: true,
        applies_to_host: true,
        titles: ['Catering', 'Decor'],
      },
    });
    await waitFor(() => expect(mockNav.goBack).toHaveBeenCalled());
  });

  it('says when a level holds nothing, and a new super category clears the levels under it', async () => {
    renderWithTheme(<ServiceOfferedEditorScreen />);
    fireEvent.press(await screen.findByTestId('service-super-sc2'));
    expect(await screen.findByText('No categories under this super category')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('service-super-sc1'));
    fireEvent.press(await screen.findByTestId('service-category-c2'));
    expect(await screen.findByText('No sub-categories under this category')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('service-category-c1'));
    expect(await screen.findByTestId('service-sub-sub1')).toBeOnTheScreen();
    // The same category again keeps the sub-category list.
    fireEvent.press(screen.getByTestId('service-category-c1'));
    expect(screen.getByTestId('service-sub-sub1')).toBeOnTheScreen();

    // The same super again keeps the picks under it; another one clears them.
    fireEvent.press(screen.getByTestId('service-super-sc1'));
    expect(screen.getByTestId('service-sub-sub1')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('service-super-sc2'));
    expect(await screen.findByText('No categories under this super category')).toBeOnTheScreen();
    expect(screen.getByTestId('service-sub-disabled')).toBeOnTheScreen();
  });

  it('removes a title again and refuses a service with no title', async () => {
    renderWithTheme(<ServiceOfferedEditorScreen />);
    addTitle('Decor');
    expect(screen.getByText('Decor')).toBeOnTheScreen();
    fireEvent.press(screen.getByLabelText('Remove Decor'));
    expect(screen.queryByText('Decor')).toBeNull();
    expect(await screen.findByText('Add at least one service title.')).toBeOnTheScreen();
    expect(screen.getByTestId('service-titles-add')).toBeDisabled();
  });

  it('warns and holds Add with no lead type; "All lead types" sets every kind; a refusal stays', async () => {
    serve(
      new Map<unknown, Handler>([
        [
          docs.CrmAppCreateServicesOfferedDocument,
          () => Promise.reject(new Error('Coaching already exists in Events')),
        ],
      ]),
    );
    renderWithTheme(<ServiceOfferedEditorScreen />);
    fireEvent.press(await screen.findByTestId('service-super-sc1'));
    addTitle('Coaching');
    const submit = screen.getByTestId('service-add-submit');
    await waitFor(() => expect(submit).not.toBeDisabled());

    await toggle('service-target-all', true);
    await toggle('service-target-all', false);
    expect(screen.getByText('Turn on at least one lead type.')).toBeOnTheScreen();
    await waitFor(() => expect(submit).toBeDisabled());

    await toggle('service-target-CREATOR', true);
    await toggle('service-target-COMMUNITY', true);
    expect(screen.queryByText('Turn on at least one lead type.')).toBeNull();
    await waitFor(() => expect(submit).not.toBeDisabled());
    await act(async () => fireEvent.press(submit));
    await waitFor(() => expect(callsTo(docs.CrmAppCreateServicesOfferedDocument)).toHaveLength(1));
    expect(callsTo(docs.CrmAppCreateServicesOfferedDocument)[0]?.[1]).toEqual({
      input: {
        super_category_id: 'sc1',
        category_id: null,
        sub_category_id: null,
        ...NONE_ON,
        applies_to_creator: true,
        applies_to_community: true,
        titles: ['Coaching'],
      },
    });
    expect(await screen.findByText('Coaching already exists in Events')).toBeOnTheScreen();
    expect(mockNav.goBack).not.toHaveBeenCalled();
  });

  it('turns every kind on from "All lead types"', async () => {
    renderWithTheme(<ServiceOfferedEditorScreen />);
    fireEvent.press(await screen.findByTestId('service-super-sc1'));
    addTitle('Catering');
    await toggle('service-target-all', true);
    const submit = screen.getByTestId('service-add-submit');
    await waitFor(() => expect(submit).not.toBeDisabled());
    await act(async () => fireEvent.press(submit));
    await waitFor(() => expect(callsTo(docs.CrmAppCreateServicesOfferedDocument)).toHaveLength(1));
    expect(callsTo(docs.CrmAppCreateServicesOfferedDocument)[0]?.[1]).toMatchObject({
      input: {
        applies_to_venue: true,
        applies_to_host: true,
        applies_to_ecomm: true,
        applies_to_creator: true,
        applies_to_community: true,
      },
    });
  });

  it('offers a retry when the categories cannot be read, and Cancel goes back', async () => {
    serve(
      new Map<unknown, Handler>([
        [docs.CrmAppCategoriesByParentDocument, () => Promise.reject(new Error('Network down'))],
      ]),
    );
    renderWithTheme(<ServiceOfferedEditorScreen />);
    expect(await screen.findByText('Network down')).toBeOnTheScreen();
    serve();
    await act(async () => fireEvent.press(screen.getByTestId('state-retry')));
    expect(await screen.findByTestId('service-super-sc1')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('service-add-cancel'));
    expect(mockNav.goBack).toHaveBeenCalled();
  });
});

describe('ServiceOfferedEditorScreen — edit', () => {
  const SERVICE = {
    id: 's1',
    title: 'Sound System',
    is_active: true,
    ...NONE_ON,
    applies_to_venue: true,
    applies_to_host: true,
  };

  it('saves the trimmed title, active and the lead types, then goes back', async () => {
    mockParams = { service: SERVICE };
    renderWithTheme(<ServiceOfferedEditorScreen />);
    expect(mockNav.setOptions).toHaveBeenCalledWith({ title: 'Edit Service Offered' });
    expect(screen.getByTestId('service-edit-title').props.value).toBe('Sound System');
    expect(
      screen.getByText('Duplicate titles in the same category are blocked.'),
    ).toBeOnTheScreen();

    fireEvent.changeText(screen.getByTestId('service-edit-title'), '  PA System ');
    await toggle('service-edit-active', false);
    await toggle('service-target-HOST', false);
    await toggle('service-target-ECOMM', true);
    const save = screen.getByTestId('service-edit-submit');
    await waitFor(() => expect(save).not.toBeDisabled());
    await act(async () => fireEvent.press(save));
    await waitFor(() => expect(callsTo(docs.CrmAppUpdateServiceOfferedDocument)).toHaveLength(1));
    expect(callsTo(docs.CrmAppUpdateServiceOfferedDocument)[0]?.[1]).toEqual({
      id: 's1',
      input: {
        title: 'PA System',
        is_active: false,
        ...NONE_ON,
        applies_to_venue: true,
        applies_to_ecomm: true,
      },
    });
    await waitFor(() => expect(mockNav.goBack).toHaveBeenCalled());
  });

  it('holds Save for a blank title or no lead type', async () => {
    mockParams = { service: SERVICE };
    renderWithTheme(<ServiceOfferedEditorScreen />);
    const save = screen.getByTestId('service-edit-submit');
    await waitFor(() => expect(save).not.toBeDisabled());

    fireEvent.changeText(screen.getByTestId('service-edit-title'), '   ');
    expect(await screen.findByText('Title is required.')).toBeOnTheScreen();
    await waitFor(() => expect(save).toBeDisabled());
    fireEvent.changeText(screen.getByTestId('service-edit-title'), 'Sound System');
    await waitFor(() => expect(save).not.toBeDisabled());

    await toggle('service-target-VENUE', false);
    await toggle('service-target-HOST', false);
    expect(screen.getByText('Turn on at least one lead type.')).toBeOnTheScreen();
    await waitFor(() => expect(save).toBeDisabled());
    fireEvent.press(screen.getByTestId('service-edit-cancel'));
    expect(mockNav.goBack).toHaveBeenCalled();
    expect(callsTo(docs.CrmAppUpdateServiceOfferedDocument)).toHaveLength(0);
  });

  it('shows the server refusal and stays', async () => {
    mockParams = { service: SERVICE };
    serve(
      new Map<unknown, Handler>([
        [
          docs.CrmAppUpdateServiceOfferedDocument,
          () =>
            Promise.reject(new Error('A service with that title already exists in this category')),
        ],
      ]),
    );
    renderWithTheme(<ServiceOfferedEditorScreen />);
    const save = screen.getByTestId('service-edit-submit');
    await waitFor(() => expect(save).not.toBeDisabled());
    await act(async () => fireEvent.press(save));
    expect(
      await screen.findByText('A service with that title already exists in this category'),
    ).toBeOnTheScreen();
    expect(mockNav.goBack).not.toHaveBeenCalled();
  });
});
