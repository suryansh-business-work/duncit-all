import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { useClubAdminPodEditor } from '@/hooks/useClubAdminPodEditor';
import { ClubPodEditorScreen } from '@/screens/ClubPodEditorScreen/ClubPodEditorScreen';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useTranslation', () => {
  const t = (key: string) => key;
  return { useTranslation: () => ({ t }) };
});
const mockPopTo = jest.fn();
let mockParams: Record<string, string> = { clubId: 'c1' };
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ popTo: mockPopTo }),
  useRoute: () => ({ params: mockParams }),
}));
jest.mock('@/hooks/useClubAdminPodEditor', () => ({ useClubAdminPodEditor: jest.fn() }));
jest.mock('@/components/StackScreen', () => ({
  StackScreen: ({
    title,
    testID,
    children,
  }: {
    title: string;
    testID: string;
    children: unknown;
  }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Text, View } = require('react-native');
    return (
      <View testID={testID}>
        <Text testID="screen-title">{title}</Text>
        {children}
      </View>
    );
  },
}));
jest.mock('@/components/PullToRefresh', () => ({
  RefreshScrollView: ({ children }: { children: unknown }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { View } = require('react-native');
    return <View testID="scroll">{children}</View>;
  },
}));
const mockStepper = jest.fn();
jest.mock('@/components/create-pod', () => ({
  CreatePodStepper: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Text } = require('react-native');
    mockStepper(props);
    return <Text testID="stepper">stepper</Text>;
  },
}));

const editorMock = jest.mocked(useClubAdminPodEditor);

const baseEditor = (patch: Record<string, unknown> = {}) => ({
  isLoading: false,
  hasError: false,
  notFound: false,
  club: { id: 'c1', club_name: 'Smash' },
  options: {
    locations: [{ id: 'l1' }],
    publicVenues: [],
    availablePodProducts: [{ id: 'prod1' }],
    subCategories: [{ id: 'sub1' }],
    publicFinanceSettings: { platform_fee_pct: 5, gst_pct: 18, currency_symbol: '$' },
  },
  viewerUserId: 'u1',
  initialValues: { pod_title: 'seed' },
  initialHosts: [{ user_id: 'h1', full_name: 'Asha' }],
  searchHosts: jest.fn(),
  moderate: jest.fn(),
  submit: jest.fn().mockResolvedValue('created'),
  refetch: jest.fn(),
  ...patch,
});

const mount = (editor = baseEditor(), params: Record<string, string> = { clubId: 'c1' }) => {
  mockParams = params;
  editorMock.mockReturnValue(editor as unknown as ReturnType<typeof useClubAdminPodEditor>);
  renderWithProviders(<ClubPodEditorScreen />);
  return editor;
};

const mode = () => mockStepper.mock.calls.at(-1)?.[0].clubAdmin;

beforeEach(() => jest.clearAllMocks());

describe('ClubPodEditorScreen', () => {
  it('asks the editor hook for the club and, when editing, the pod', () => {
    mount(baseEditor(), { clubId: 'c1', podId: 'p9' });
    expect(editorMock).toHaveBeenCalledWith('c1', 'p9');
  });

  it('asks for the club alone when creating a pod', () => {
    mount();
    expect(editorMock).toHaveBeenCalledWith('c1', undefined);
  });

  it('titles the screen for a new pod and for an edit', () => {
    mount();
    expect(screen.getByTestId('screen-title')).toHaveTextContent('clubAdmin.pods.newPod');
  });

  it('titles an edit as editing', () => {
    mount(baseEditor(), { clubId: 'c1', podId: 'p9' });
    expect(screen.getByTestId('screen-title')).toHaveTextContent('clubAdmin.pods.editPod');
  });

  it('shows a spinner while the editor loads, and no form yet', () => {
    mount(baseEditor({ isLoading: true, club: null, options: null }));
    expect(screen.getByTestId('club-pod-editor-loading')).toBeOnTheScreen();
    expect(screen.queryByTestId('stepper')).toBeNull();
  });

  it('says the load failed and retries', () => {
    const editor = mount(baseEditor({ hasError: true, club: null, options: null }));
    expect(screen.getByTestId('club-pod-editor-error')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('club-pod-editor-error-retry'));
    expect(editor.refetch).toHaveBeenCalledTimes(1);
  });

  it('says the club or pod was not found', () => {
    mount(baseEditor({ notFound: true, club: null, options: null }));
    expect(screen.getByTestId('club-pod-editor-not-found')).toHaveTextContent(
      'clubAdmin.editor.notFound',
    );
  });

  it('does not draw the stepper without the club or without the options', () => {
    mount(baseEditor({ options: null }));
    expect(screen.queryByTestId('stepper')).toBeNull();
  });

  it('draws the host stepper in club-admin mode, pinned to the club with the server lookups', () => {
    mount();
    const props = mockStepper.mock.calls[0][0];
    expect(props).toMatchObject({
      initialValues: { pod_title: 'seed' },
      initialStep: 0,
      initialDraftId: null,
      clubs: [{ id: 'c1', club_name: 'Smash' }],
      locations: [{ id: 'l1' }],
      products: [{ id: 'prod1' }],
      subCategories: [{ id: 'sub1' }],
      hostCategories: [],
      viewerUserId: 'u1',
      finance: { platform_fee_pct: 5, gst_pct: 18, currency_symbol: '$' },
    });
    expect(props.venues).toEqual([]);
  });

  it('falls back to empty lookups and blank finance while settings are missing', () => {
    mount(baseEditor({ options: {} }));
    const props = mockStepper.mock.calls[0][0];
    expect(props).toMatchObject({
      locations: [],
      products: [],
      subCategories: [],
      finance: { platform_fee_pct: 0, gst_pct: 0, currency_symbol: '₹' },
    });
    expect(props.venues).toEqual([]);
  });

  it('words the submit buttons for a new pod', () => {
    mount();
    expect(mode()).toMatchObject({
      submitLabel: 'mweb.createPod.createPod',
      busyLabel: 'mweb.createPod.creating',
      draftLabel: 'clubAdmin.editor.saveDraft',
      initialHosts: [{ user_id: 'h1', full_name: 'Asha' }],
    });
  });

  it('words the submit buttons for an edit', () => {
    mount(baseEditor(), { clubId: 'c1', podId: 'p9' });
    expect(mode()).toMatchObject({
      submitLabel: 'mweb.hostManage.saveChanges',
      busyLabel: 'mweb.hostPodActions.saving',
    });
  });

  it('saves through the club-admin mutations and returns to the club pods with the notice', async () => {
    const editor = mount();
    await act(async () => mode().submit({ pod_title: 'x' }, ['h1'], undefined));
    expect(editor.submit).toHaveBeenCalledWith({ pod_title: 'x' }, ['h1'], undefined);
    await waitFor(() =>
      expect(mockPopTo).toHaveBeenCalledWith('ClubPods', { clubId: 'c1', notice: 'created' }),
    );
  });

  it('returns with the draft notice after saving a draft, whatever the save kind', async () => {
    const editor = baseEditor({ submit: jest.fn().mockResolvedValue('updated') });
    mount(editor, { clubId: 'c1', podId: 'p9' });
    await act(async () => mode().submit({ pod_title: 'x' }, [], { draft: true }));
    expect(mockPopTo).toHaveBeenCalledWith('ClubPods', { clubId: 'c1', notice: 'draft' });
  });

  it('stays on the editor when the save fails, handing the error to the stepper', async () => {
    const editor = baseEditor({ submit: jest.fn().mockRejectedValue(new Error('refused')) });
    mount(editor);
    await expect(mode().submit({ pod_title: 'x' }, [], undefined)).rejects.toThrow('refused');
    expect(mockPopTo).not.toHaveBeenCalled();
  });

  it('gives the stepper draft hooks that do nothing, since club-admin mode never drafts through them', async () => {
    mount();
    const props = mockStepper.mock.calls[0][0];
    await expect(props.onSaveDraft()).resolves.toBe('');
    await expect(props.onPublish()).resolves.toBeUndefined();
  });
});
