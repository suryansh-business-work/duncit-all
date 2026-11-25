import { act, fireEvent, screen } from '@testing-library/react-native';

import * as docs from '@/graphql/callPrompts';
import { gqlRequest } from '@/services/graphql.client';
import { renderWithTheme } from '@/test-utils';
import { CallPromptEditorScreen } from '../call-prompts/CallPromptEditorScreen';
import { CallPromptsScreen } from '../call-prompts/CallPromptsScreen';

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

/** CRM › AI Call Prompts › Static Content: the list and the add / edit / delete screen. */

const request = gqlRequest as jest.Mock;
const PROMPT = {
  id: 'p1',
  name: 'Venue intro',
  description: 'First call to a venue',
  context: 'Introduce Duncit pods to the venue owner and ask about weekday slots.',
  language: 'hi-IN',
  is_active: true,
};
type Handler = (vars: Record<string, unknown>) => unknown;
const serve = (overrides: Map<unknown, Handler> = new Map()) =>
  request.mockImplementation(async (doc: unknown, vars: Record<string, unknown> = {}) => {
    const handler = overrides.get(doc);
    if (handler) return handler(vars);
    if (doc === docs.CrmAppCallPromptsDocument)
      return {
        crmCallPromptsTable: {
          total: 2,
          rows: [
            PROMPT,
            {
              ...PROMPT,
              id: 'p2',
              name: 'Host follow-up',
              language: 'xx',
              is_active: false,
              description: '',
            },
          ],
        },
      };
    if (doc === docs.CrmAppCallPromptDocument) return { crmCallPrompt: PROMPT };
    if (doc === docs.CrmAppCreateCallPromptDocument) return { createCrmCallPrompt: { id: 'p3' } };
    if (doc === docs.CrmAppUpdateCallPromptDocument) return { updateCrmCallPrompt: { id: 'p1' } };
    if (doc === docs.CrmAppDeleteCallPromptDocument) return { deleteCrmCallPrompt: true };
    throw new Error('unexpected operation');
  });
const callsTo = (doc: unknown) => request.mock.calls.filter(([d]) => d === doc);

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
  serve();
});

describe('CallPromptsScreen', () => {
  it('lists the prompts newest first with their language and state, and opens one or a new one', async () => {
    renderWithTheme(<CallPromptsScreen />);
    expect(await screen.findByText('Venue intro')).toBeOnTheScreen();
    expect(mockNav.setOptions).toHaveBeenCalledWith({ title: 'Static Content' });
    expect(callsTo(docs.CrmAppCallPromptsDocument)[0]?.[1].query).toMatchObject({
      sort_by: 'updated_at',
      sort_dir: 'desc',
    });
    expect(screen.getByText('Hindi · First call to a venue')).toBeOnTheScreen();
    expect(screen.getByText('xx')).toBeOnTheScreen();
    expect(screen.getByText('Inactive')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('prompt-row-p1'));
    expect(mockNav.navigate).toHaveBeenCalledWith('CallPromptEditor', { id: 'p1' });
    fireEvent.press(screen.getByTestId('prompts-add'));
    expect(mockNav.navigate).toHaveBeenCalledWith('CallPromptEditor', {});
  });

  it('says when there is no static content yet', async () => {
    serve(
      new Map<unknown, Handler>([
        [docs.CrmAppCallPromptsDocument, () => ({ crmCallPromptsTable: { total: 0, rows: [] } })],
      ]),
    );
    renderWithTheme(<CallPromptsScreen />);
    expect(await screen.findByText('No static content yet.')).toBeOnTheScreen();
  });
});

describe('CallPromptEditorScreen', () => {
  it('adds a prompt once it has a name and enough context, then goes back', async () => {
    renderWithTheme(<CallPromptEditorScreen />);
    expect(mockNav.setOptions).toHaveBeenCalledWith({ title: 'Add Static Content' });
    await act(async () => fireEvent.press(screen.getByTestId('prompt-save')));
    expect(screen.getByText('Name must be at least 2 characters')).toBeOnTheScreen();
    expect(screen.getByText('Add at least 10 characters of context')).toBeOnTheScreen();
    fireEvent.changeText(screen.getByTestId('prompt-name'), 'Venue pitch');
    fireEvent.changeText(screen.getByTestId('prompt-context'), 'Pitch weekday pods to the venue.');
    await act(async () => fireEvent.press(screen.getByTestId('prompt-save')));
    expect(callsTo(docs.CrmAppCreateCallPromptDocument)[0]?.[1]).toEqual({
      input: {
        name: 'Venue pitch',
        description: '',
        language: 'auto',
        context: 'Pitch weekday pods to the venue.',
        is_active: true,
      },
    });
    expect(mockNav.goBack).toHaveBeenCalled();
  });

  it('edits a saved prompt and shows why a save failed', async () => {
    mockParams = { id: 'p1' };
    serve(
      new Map<unknown, Handler>([
        [
          docs.CrmAppUpdateCallPromptDocument,
          () => Promise.reject(new Error('A prompt with this name already exists')),
        ],
      ]),
    );
    renderWithTheme(<CallPromptEditorScreen />);
    const name = await screen.findByTestId('prompt-name');
    expect(name.props.value).toBe('Venue intro');
    expect(mockNav.setOptions).toHaveBeenCalledWith({ title: 'Edit Static Content' });
    await act(async () => fireEvent.press(screen.getByTestId('prompt-save')));
    expect(callsTo(docs.CrmAppUpdateCallPromptDocument)[0]?.[1]).toMatchObject({
      id: 'p1',
      input: { language: 'hi-IN' },
    });
    expect(await screen.findByText('A prompt with this name already exists')).toBeOnTheScreen();
    expect(mockNav.goBack).not.toHaveBeenCalled();
  });

  it('deletes a prompt only after confirming', async () => {
    mockParams = { id: 'p1' };
    renderWithTheme(<CallPromptEditorScreen />);
    fireEvent.press(await screen.findByTestId('prompt-delete'));
    expect(screen.getByText('Delete "Venue intro"? This cannot be undone.')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('prompt-delete-dialog-cancel'));
    expect(callsTo(docs.CrmAppDeleteCallPromptDocument)).toHaveLength(0);
    fireEvent.press(screen.getByTestId('prompt-delete'));
    await act(async () => fireEvent.press(screen.getByTestId('prompt-delete-dialog-confirm')));
    expect(callsTo(docs.CrmAppDeleteCallPromptDocument)[0]?.[1]).toEqual({ id: 'p1' });
    expect(mockNav.goBack).toHaveBeenCalled();
  });

  it('says when a prompt cannot be read, or cannot be deleted', async () => {
    mockParams = { id: 'p1' };
    serve(
      new Map<unknown, Handler>([
        [docs.CrmAppCallPromptDocument, () => Promise.reject(new Error('Not found'))],
      ]),
    );
    const { unmount } = renderWithTheme(<CallPromptEditorScreen />);
    expect(await screen.findByText('Not found')).toBeOnTheScreen();
    unmount();

    serve(
      new Map<unknown, Handler>([
        [docs.CrmAppDeleteCallPromptDocument, () => Promise.reject(new Error('In use'))],
      ]),
    );
    renderWithTheme(<CallPromptEditorScreen />);
    fireEvent.press(await screen.findByTestId('prompt-delete'));
    await act(async () => fireEvent.press(screen.getByTestId('prompt-delete-dialog-confirm')));
    expect(await screen.findByText('In use')).toBeOnTheScreen();
  });
});
