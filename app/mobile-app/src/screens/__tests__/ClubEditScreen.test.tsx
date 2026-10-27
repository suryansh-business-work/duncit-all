import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { useClubEdit } from '@/hooks/useClubEdit';
import { ClubEditScreen } from '@/screens/ClubEditScreen/ClubEditScreen';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useTranslation', () => {
  const t = (key: string) => key;
  return { useTranslation: () => ({ t }) };
});
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useRoute: () => ({ params: { clubId: 'c1' } }),
}));
jest.mock('@/hooks/useClubEdit', () => ({ useClubEdit: jest.fn() }));
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
    return <View>{children}</View>;
  },
}));
const mockForm = jest.fn();
jest.mock('@/components/club-admin/club-edit/ClubEditForm', () => ({
  ClubEditForm: (props: {
    initialValues: { club_name: string };
    busy: boolean;
    error: string | null;
    onSubmit: (values: { club_name: string }) => void;
  }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pressable, Text } = require('react-native');
    mockForm(props);
    return (
      <Pressable
        testID="form-submit"
        onPress={() => props.onSubmit({ ...props.initialValues, club_name: ' Rally ' })}
      >
        <Text testID="form-state">{`${props.initialValues.club_name}|${props.busy ? 'busy' : 'idle'}|${props.error ?? ''}`}</Text>
      </Pressable>
    );
  },
}));

const editMock = jest.mocked(useClubEdit);

const CLUB = {
  club_name: 'Smash Club',
  club_description: 'We play',
  super_category_id: 's1',
  category_id: 'u1',
  location_id: 'loc1',
  locality: '',
  club_feature_images_and_videos: [{ url: 'https://cdn/a.jpg' }],
  club_moments: [],
  club_whats_app_community_link: 'https://c',
  club_whats_app_group_link: 'https://g',
  club_whats_app_announcement_link: null,
  who_we_are: ['Players'],
  what_we_do: ['Play'],
  perks: ['Tea'],
  values: ['Fun'],
  faqs: [],
};

const mount = (patch: Record<string, unknown> = {}) => {
  const state = {
    club: CLUB,
    isLoading: false,
    hasError: false,
    notFound: false,
    refetch: jest.fn(),
    save: jest.fn().mockResolvedValue(undefined),
    ...patch,
  };
  editMock.mockReturnValue(state as unknown as ReturnType<typeof useClubEdit>);
  renderWithProviders(<ClubEditScreen />);
  return state;
};

const submit = async () =>
  act(async () => {
    fireEvent.press(screen.getByTestId('form-submit'));
  });

beforeEach(() => jest.clearAllMocks());

describe('ClubEditScreen', () => {
  it('reads the club from the route and titles the screen', () => {
    mount();
    expect(editMock).toHaveBeenCalledWith('c1');
    expect(screen.getByTestId('screen-title')).toHaveTextContent('mweb.meta.clubEdit.title');
    expect(screen.getByText('Smash Club')).toBeOnTheScreen();
  });

  it('goes back to the club pods', () => {
    mount();
    fireEvent.press(screen.getByTestId('club-edit-back-to-pods'));
    expect(mockNavigate).toHaveBeenCalledWith('ClubPods', { clubId: 'c1' });
  });

  it('prefills the form from the club', () => {
    mount();
    expect(screen.getByTestId('form-state')).toHaveTextContent('Smash Club|idle|');
  });

  it('shows a spinner while loading, and neither heading nor form without a club', () => {
    mount({ club: null, isLoading: true });
    expect(screen.getByTestId('club-edit-loading')).toBeOnTheScreen();
    expect(screen.queryByTestId('form-submit')).toBeNull();
    expect(screen.queryByText('Smash Club')).toBeNull();
  });

  it('says the load failed and retries', () => {
    const state = mount({ club: null, hasError: true });
    fireEvent.press(screen.getByTestId('club-edit-error-retry'));
    expect(state.refetch).toHaveBeenCalledTimes(1);
  });

  it('says the club was not found', () => {
    mount({ club: null, notFound: true });
    expect(screen.getByTestId('club-edit-not-found')).toHaveTextContent(
      'clubAdmin.editClub.notFound',
    );
  });

  it('saves the built input and says it saved', async () => {
    const state = mount();
    await submit();
    await screen.findByTestId('club-edit-saved');
    expect(screen.getByTestId('club-edit-saved')).toHaveTextContent('clubAdmin.editClub.saved');
    expect(state.save).toHaveBeenCalledTimes(1);
    expect(state.save.mock.calls[0][0]).toMatchObject({
      club_name: 'Rally',
      super_category_id: 's1',
    });
  });

  it('shows the busy state while saving', async () => {
    let finish: () => void = () => undefined;
    mount({ save: jest.fn(() => new Promise<void>((resolve) => (finish = resolve))) });
    await submit();
    expect(screen.getByTestId('form-state')).toHaveTextContent('Smash Club|busy|');
    await act(async () => finish());
    await waitFor(() =>
      expect(screen.getByTestId('form-state')).toHaveTextContent('Smash Club|idle|'),
    );
  });

  it('shows the server message when the save fails, and no saved note', async () => {
    mount({ save: jest.fn().mockRejectedValue(new Error('Name taken')) });
    await submit();
    await waitFor(() => expect(screen.getByTestId('form-state')).toHaveTextContent(/Name taken/));
    expect(screen.queryByTestId('club-edit-saved')).toBeNull();
  });

  it('shows the generic sentence when the failure has no message', async () => {
    mount({ save: jest.fn().mockRejectedValue('nope') });
    await submit();
    await waitFor(() =>
      expect(screen.getByTestId('form-state')).toHaveTextContent(/mweb.clubEdit.saveFailed/),
    );
  });

  it('clears the earlier outcome when saving again', async () => {
    const save = jest
      .fn()
      .mockRejectedValueOnce(new Error('Name taken'))
      .mockResolvedValueOnce(undefined);
    mount({ save });
    await submit();
    await waitFor(() => expect(screen.getByTestId('form-state')).toHaveTextContent(/Name taken/));
    await submit();
    await screen.findByTestId('club-edit-saved');
    expect(screen.getByTestId('form-state')).not.toHaveTextContent(/Name taken/);
  });
});
